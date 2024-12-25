/**
 * Scraper Configuration
 * Defines comprehensive settings for distributed web scraping infrastructure
 * @version 1.0.0
 */

import { ScraperConfig } from '../interfaces/config.interface';
import dotenv from 'dotenv'; // ^16.0.3

// Load environment variables
dotenv.config();

/**
 * Default concurrency settings for scraping operations
 * Controls parallel execution limits globally and per domain
 */
const DEFAULT_CONCURRENCY = {
  global: 5,
  perDomain: {
    'stanford.edu': 2,
    'mit.edu': 2,
    'harvard.edu': 2,
    'berkeley.edu': 2,
    'default': 1
  }
} as const;

/**
 * Default rate limiting configuration
 * Prevents overwhelming target servers and respects robots.txt
 */
const DEFAULT_RATE_LIMIT = {
  global: {
    requests: 60,
    perSeconds: 60
  },
  perDomain: {
    'stanford.edu': { requests: 30, perSeconds: 60 },
    'mit.edu': { requests: 30, perSeconds: 60 },
    'harvard.edu': { requests: 25, perSeconds: 60 },
    'berkeley.edu': { requests: 25, perSeconds: 60 }
  }
} as const;

/**
 * Default retry configuration with exponential backoff
 * Implements sophisticated error recovery strategies
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  backoffPeriod: 2000, // Base delay in milliseconds
  maxBackoffTime: 30000, // Maximum backoff time in milliseconds
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000 // Reset after 1 minute
  }
} as const;

/**
 * Default proxy configuration for distributed scraping
 * Enables IP rotation to prevent blocking
 */
const DEFAULT_PROXY_CONFIG = {
  enabled: false,
  proxies: [],
  rotationInterval: 300000 // 5 minutes
} as const;

/**
 * Default timeout configuration
 * Sets limits for various network operations
 */
const DEFAULT_TIMEOUT_CONFIG = {
  connection: 5000,  // 5 seconds
  read: 30000,      // 30 seconds
  total: 35000      // 35 seconds
} as const;

/**
 * Default user agent string
 * Identifies the scraper to target servers
 */
const DEFAULT_USER_AGENT = 'Incepta-Bot/1.0 (+https://incepta.ai/bot)';

/**
 * Validates scraper configuration parameters
 * Ensures all settings are within acceptable ranges
 */
const validateConfig = (config: ScraperConfig): boolean => {
  try {
    // Validate concurrency settings
    if (config.concurrency.global < 1 || config.concurrency.global > 20) {
      return false;
    }

    // Validate rate limits
    if (config.rateLimit.global.requests < 1 || 
        config.rateLimit.global.perSeconds < 1) {
      return false;
    }

    // Validate retry configuration
    if (config.retryConfig.maxRetries < 0 || 
        config.retryConfig.backoffPeriod < 1000 ||
        config.retryConfig.maxBackoffTime < config.retryConfig.backoffPeriod) {
      return false;
    }

    // Validate timeout configuration
    if (config.timeoutConfig.connection < 1000 ||
        config.timeoutConfig.read < config.timeoutConfig.connection ||
        config.timeoutConfig.total < config.timeoutConfig.read) {
      return false;
    }

    // Validate proxy configuration if enabled
    if (config.proxyConfig.enabled && 
        (!Array.isArray(config.proxyConfig.proxies) || 
         config.proxyConfig.proxies.length === 0)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Configuration validation error:', error);
    return false;
  }
};

/**
 * Production scraper configuration
 * Combines environment variables with default settings
 */
export const scraperConfig: ScraperConfig = {
  concurrency: {
    global: Number(process.env.SCRAPER_CONCURRENCY) || DEFAULT_CONCURRENCY.global,
    perDomain: {
      ...DEFAULT_CONCURRENCY.perDomain,
      ...(process.env.DOMAIN_CONCURRENCY ? JSON.parse(process.env.DOMAIN_CONCURRENCY) : {})
    }
  },
  rateLimit: {
    global: {
      requests: Number(process.env.RATE_LIMIT_REQUESTS) || DEFAULT_RATE_LIMIT.global.requests,
      perSeconds: Number(process.env.RATE_LIMIT_SECONDS) || DEFAULT_RATE_LIMIT.global.perSeconds
    },
    perDomain: {
      ...DEFAULT_RATE_LIMIT.perDomain,
      ...(process.env.DOMAIN_RATE_LIMITS ? JSON.parse(process.env.DOMAIN_RATE_LIMITS) : {})
    }
  },
  retryConfig: {
    maxRetries: Number(process.env.RETRY_MAX_ATTEMPTS) || DEFAULT_RETRY_CONFIG.maxRetries,
    backoffPeriod: Number(process.env.RETRY_BACKOFF_MS) || DEFAULT_RETRY_CONFIG.backoffPeriod,
    maxBackoffTime: Number(process.env.RETRY_MAX_BACKOFF_MS) || DEFAULT_RETRY_CONFIG.maxBackoffTime,
    circuitBreaker: {
      failureThreshold: Number(process.env.CIRCUIT_BREAKER_THRESHOLD) || 
                       DEFAULT_RETRY_CONFIG.circuitBreaker.failureThreshold,
      resetTimeout: Number(process.env.CIRCUIT_BREAKER_RESET_MS) || 
                   DEFAULT_RETRY_CONFIG.circuitBreaker.resetTimeout
    }
  },
  proxyConfig: {
    enabled: process.env.PROXY_ENABLED === 'true' || DEFAULT_PROXY_CONFIG.enabled,
    proxies: process.env.PROXY_URLS ? JSON.parse(process.env.PROXY_URLS) : DEFAULT_PROXY_CONFIG.proxies,
    rotationInterval: Number(process.env.PROXY_ROTATION_MS) || DEFAULT_PROXY_CONFIG.rotationInterval
  },
  timeoutConfig: {
    connection: Number(process.env.CONNECTION_TIMEOUT_MS) || DEFAULT_TIMEOUT_CONFIG.connection,
    read: Number(process.env.READ_TIMEOUT_MS) || DEFAULT_TIMEOUT_CONFIG.read,
    total: Number(process.env.TOTAL_TIMEOUT_MS) || DEFAULT_TIMEOUT_CONFIG.total
  },
  userAgent: process.env.SCRAPER_USER_AGENT || DEFAULT_USER_AGENT
};

// Validate configuration on initialization
if (!validateConfig(scraperConfig)) {
  throw new Error('Invalid scraper configuration detected');
}

export default scraperConfig;