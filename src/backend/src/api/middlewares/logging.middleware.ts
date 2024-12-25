// express v4.18.0
import { Request, Response, NextFunction } from 'express';
// morgan v1.10.0
import morgan from 'morgan';
// on-finished v2.4.1
import onFinished from 'on-finished';
// Import custom logger
import { enhancedLogger as logger } from '../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Constants for logging configuration
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'creditCard',
  'ssn',
  'accessToken',
  'refreshToken',
  'sessionToken'
];

const LOG_BODY_SIZE_LIMIT = 10000; // 10KB limit for request body logging

const PERFORMANCE_THRESHOLDS = {
  WARN: 1000,  // 1 second
  ERROR: 3000  // 3 seconds
};

// Interfaces for structured logging
interface RequestLog {
  method: string;
  url: string;
  params: Record<string, any>;
  query: Record<string, any>;
  body: Record<string, any>;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  traceId: string;
  sessionId?: string;
  origin: string;
  referer?: string;
}

interface ResponseLog {
  statusCode: number;
  responseTime: number;
  contentLength: number;
  contentType: string;
  traceId: string;
  cacheHit: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Sanitizes request body by removing sensitive data and applying size limits
 * @param body Request body object
 * @returns Sanitized body object
 */
const sanitizeRequestBody = (body: Record<string, any>): Record<string, any> => {
  // Deep clone the body to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // Check body size
  const bodySize = JSON.stringify(sanitized).length;
  if (bodySize > LOG_BODY_SIZE_LIMIT) {
    return {
      _truncated: true,
      originalSize: bodySize,
      message: 'Request body too large for logging'
    };
  }

  // Recursively sanitize objects
  const sanitizeObject = (obj: Record<string, any>): void => {
    for (const key in obj) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Express middleware for comprehensive request/response logging with security features
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const traceId = uuidv4();

  // Attach trace ID to request for correlation
  req.traceId = traceId;

  // Prepare request log
  const requestLog: RequestLog = {
    method: req.method,
    url: req.originalUrl || req.url,
    params: req.params,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    userId: (req.user as any)?.id,
    ip: req.ip,
    userAgent: req.get('user-agent') || 'unknown',
    timestamp: new Date(),
    traceId,
    sessionId: req.sessionID,
    origin: req.get('origin') || 'unknown',
    referer: req.get('referer')
  };

  // Log request
  logger.http('Incoming request', {
    request: requestLog,
    correlationId: traceId
  });

  // Handle response logging when request is finished
  onFinished(res, (err, res) => {
    const responseTime = Date.now() - startTime;

    // Prepare response log
    const responseLog: ResponseLog = {
      statusCode: res.statusCode,
      responseTime,
      contentLength: parseInt(res.get('content-length') || '0'),
      contentType: res.get('content-type') || 'unknown',
      traceId,
      cacheHit: res.get('x-cache') === 'HIT',
      errorCode: res.locals.errorCode,
      errorMessage: res.locals.errorMessage
    };

    // Log based on response status and performance
    if (err) {
      logger.error('Request error', {
        error: err,
        request: requestLog,
        response: responseLog
      });
    } else if (res.statusCode >= 500) {
      logger.error('Server error response', {
        request: requestLog,
        response: responseLog
      });
    } else if (res.statusCode >= 400) {
      logger.warn('Client error response', {
        request: requestLog,
        response: responseLog
      });
    } else {
      // Performance monitoring
      if (responseTime > PERFORMANCE_THRESHOLDS.ERROR) {
        logger.error('Critical performance alert', {
          request: requestLog,
          response: responseLog,
          performanceIssue: true
        });
      } else if (responseTime > PERFORMANCE_THRESHOLDS.WARN) {
        logger.warn('Performance warning', {
          request: requestLog,
          response: responseLog,
          performanceIssue: true
        });
      } else {
        logger.http('Request completed', {
          request: requestLog,
          response: responseLog
        });
      }
    }
  });

  // Add morgan logging for development environment
  if (process.env.NODE_ENV === 'development') {
    morgan('dev')(req, res, next);
  } else {
    next();
  }
};

// Extend Express Request interface to include traceId
declare global {
  namespace Express {
    interface Request {
      traceId: string;
    }
  }
}

export default loggingMiddleware;