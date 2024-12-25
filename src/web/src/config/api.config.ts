/**
 * API Configuration
 * Defines comprehensive API configuration settings for the web client's communication with backend services
 * Version: 1.0.0
 * 
 * Features:
 * - Environment-aware base URL configuration
 * - Sophisticated retry policies with exponential backoff
 * - Rate limiting with queue management
 * - Standardized request defaults
 */

import { API_VERSION, API_HEADERS } from '../constants/api.constants';

/**
 * Interface defining the structure of API configuration
 * Includes comprehensive settings for request handling, retries, and rate limiting
 */
export interface ApiConfig {
  /** Environment-aware base URL for API endpoints */
  baseURL: string;
  /** API version identifier for request versioning */
  version: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Standard request headers */
  headers: {
    'Content-Type': string;
    'Accept': string;
  };
  /** Retry configuration with exponential backoff */
  retry: {
    maxRetries: number;
    retryDelay: number;
    statusCodesToRetry: number[];
    exponentialBackoff: boolean;
    backoffMultiplier: number;
  };
  /** Rate limiting configuration */
  rateLimit: {
    maxRequests: number;
    perHour: boolean;
    errorThreshold: number;
    queueEnabled: boolean;
  };
}

/**
 * Core API configuration object
 * Implements comprehensive settings for API communication with environment awareness
 */
export const apiConfig: ApiConfig = {
  // Base URL with environment awareness
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // API version from constants
  version: API_VERSION,
  
  // Request timeout (30 seconds)
  timeout: 30000,
  
  // Standard headers
  headers: {
    'Content-Type': API_HEADERS.CONTENT_TYPE,
    'Accept': API_HEADERS.ACCEPT
  },
  
  // Sophisticated retry configuration
  retry: {
    // Maximum number of retry attempts
    maxRetries: 3,
    
    // Base delay between retries in milliseconds
    retryDelay: 1000,
    
    // HTTP status codes that trigger retry attempts
    statusCodesToRetry: [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ],
    
    // Enable exponential backoff for retries
    exponentialBackoff: true,
    
    // Multiplier for exponential backoff calculation
    backoffMultiplier: 2
  },
  
  // Rate limiting configuration
  rateLimit: {
    // Maximum requests per hour (from technical specifications)
    maxRequests: 1000,
    
    // Time window for rate limiting
    perHour: true,
    
    // Error threshold for rate limiting (90% of limit)
    errorThreshold: 0.9,
    
    // Enable request queueing when approaching rate limit
    queueEnabled: true
  }
} as const;

/**
 * Helper function to calculate retry delay with exponential backoff
 * @param retryCount - Current retry attempt number
 * @param baseDelay - Base delay in milliseconds
 * @param multiplier - Backoff multiplier
 * @returns Calculated delay in milliseconds
 */
export const calculateRetryDelay = (
  retryCount: number,
  baseDelay: number = apiConfig.retry.retryDelay,
  multiplier: number = apiConfig.retry.backoffMultiplier
): number => {
  return baseDelay * Math.pow(multiplier, retryCount);
};

/**
 * Helper function to build full API URL with version
 * @param endpoint - API endpoint path
 * @returns Full API URL with version
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${apiConfig.baseURL}/api/${apiConfig.version}${endpoint}`;
};

export default apiConfig;