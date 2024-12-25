/**
 * Rate Limiter Middleware
 * Implements sliding window rate limiting with Redis and circuit breaker pattern
 * Enforces platform's rate limiting policy of 1000 requests/hour per API key
 * @version 1.0.0
 */

// External imports
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { createHash } from 'crypto';

// Internal imports
import { RedisCache } from '../../lib/cache/redis';
import { ErrorCodes, ErrorMessages } from '../../constants/errorCodes';
import { HTTP_STATUS } from '../../constants/statusCodes';

// Constants
const RATE_LIMIT_PREFIX = 'ratelimit:';
const WINDOW_SIZE_MS = 3600000; // 1 hour in milliseconds
const CIRCUIT_BREAKER_THRESHOLD = 5;
const MAX_REQUESTS = 1000;

/**
 * Interface for sliding window rate limit tracking
 */
interface RateLimitInfo {
  timestamps: number[];
  windowStart: number;
  windowEnd: number;
}

/**
 * Interface for circuit breaker tracking
 */
interface CircuitBreakerMetrics {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

/**
 * Express middleware implementing sliding window rate limiting with Redis
 * Includes circuit breaker pattern and comprehensive error handling
 */
export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const redis = RedisCache.getInstance();
  
  try {
    // Extract API key from headers
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        code: ErrorCodes.AUTHENTICATION_ERROR,
        message: 'Missing or invalid API key'
      });
      return;
    }

    // Generate secure rate limit key using API key hash
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${keyHash}`;
    const circuitBreakerKey = `${rateLimitKey}:circuit`;

    // Check circuit breaker status
    const circuitBreaker = await redis.get(circuitBreakerKey) as CircuitBreakerMetrics;
    if (circuitBreaker?.isOpen) {
      const cooldownRemaining = Date.now() - (circuitBreaker.lastFailure + 30000);
      if (cooldownRemaining > 0) {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: ErrorMessages.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil(cooldownRemaining / 1000)
        });
        return;
      }
      // Reset circuit breaker after cooldown
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      await redis.set(circuitBreakerKey, circuitBreaker);
    }

    // Get current window data using pipelined operations
    const currentTime = Date.now();
    const windowStart = currentTime - WINDOW_SIZE_MS;
    
    let rateLimitInfo = await redis.get(rateLimitKey) as RateLimitInfo;
    if (!rateLimitInfo) {
      rateLimitInfo = {
        timestamps: [],
        windowStart,
        windowEnd: currentTime
      };
    }

    // Clean up expired entries from sliding window
    rateLimitInfo.timestamps = rateLimitInfo.timestamps.filter(
      timestamp => timestamp > windowStart
    );

    // Calculate current request count within window
    const requestCount = rateLimitInfo.timestamps.length;

    // Check if rate limit exceeded
    if (requestCount >= MAX_REQUESTS) {
      const oldestTimestamp = rateLimitInfo.timestamps[0];
      const resetTime = oldestTimestamp + WINDOW_SIZE_MS;
      const retryAfter = Math.ceil((resetTime - currentTime) / 1000);

      res.set({
        'X-RateLimit-Limit': MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'Retry-After': retryAfter.toString()
      });

      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: ErrorMessages.RATE_LIMIT_EXCEEDED,
        retryAfter
      });
      return;
    }

    // Update sliding window with new request timestamp
    rateLimitInfo.timestamps.push(currentTime);
    await redis.set(rateLimitKey, rateLimitInfo, Math.ceil(WINDOW_SIZE_MS / 1000));

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': (MAX_REQUESTS - rateLimitInfo.timestamps.length).toString(),
      'X-RateLimit-Reset': Math.ceil((currentTime + WINDOW_SIZE_MS) / 1000).toString()
    });

    next();
  } catch (error) {
    // Update circuit breaker metrics on Redis failure
    try {
      const circuitBreakerKey = `${RATE_LIMIT_PREFIX}${req.headers['x-api-key']}:circuit`;
      const metrics = await redis.get(circuitBreakerKey) as CircuitBreakerMetrics || {
        failures: 0,
        lastFailure: 0,
        isOpen: false
      };

      metrics.failures++;
      metrics.lastFailure = Date.now();
      
      if (metrics.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        metrics.isOpen = true;
      }

      await redis.set(circuitBreakerKey, metrics, 3600); // 1 hour TTL
    } catch {
      // Fail silently if circuit breaker update fails
    }

    // Allow request through if Redis fails
    console.error('Rate limiter error:', error);
    next();
  }
};