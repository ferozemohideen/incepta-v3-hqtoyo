/**
 * API Utilities
 * Comprehensive utility functions for handling API requests, response formatting,
 * error handling, authentication, and retry logic
 * Version: 1.0.0
 * 
 * @packageDocumentation
 */

import { AxiosError } from 'axios'; // ^1.4.0
import { API_STATUS_CODES, API_HEADERS } from '../constants/api.constants';
import { apiConfig } from '../config/api.config';

/**
 * Interface for standardized API error responses
 */
export interface ApiError {
  status: number;
  message: string;
  code: string;
  details: Record<string, any>;
}

/**
 * Interface for retry configuration with exponential backoff
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  statusCodesToRetry: number[];
  exponentialBackoff: boolean;
  backoffMultiplier: number;
}

/**
 * Formats API request URL with query parameters
 * @param baseUrl - Base URL for the API endpoint
 * @param params - Query parameters to append
 * @returns Formatted URL with query parameters
 */
export const formatRequestUrl = (
  baseUrl: string,
  params?: Record<string, any>
): string => {
  if (!params) return baseUrl;

  // Remove undefined or null parameters
  const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  // Convert parameters to URLSearchParams
  const searchParams = new URLSearchParams();
  Object.entries(cleanParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => searchParams.append(`${key}[]`, String(item)));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Enhanced error handling with detailed error mapping and type safety
 * @param error - Axios error object
 * @returns Standardized error object
 */
export const handleApiError = (error: AxiosError): ApiError => {
  const status = error.response?.status || API_STATUS_CODES.SERVER_ERROR;
  const responseData = error.response?.data as Record<string, any>;

  // Map status code to detailed error message
  let message = responseData?.['message'] || error.message;
  switch (status) {
    case API_STATUS_CODES.BAD_REQUEST:
      message = 'Invalid request parameters';
      break;
    case API_STATUS_CODES.UNAUTHORIZED:
      message = 'Authentication required';
      break;
    case API_STATUS_CODES.RATE_LIMIT:
      message = 'Rate limit exceeded';
      break;
    default:
      if (status >= 500) {
        message = 'Internal server error';
      }
  }

  // Generate unique error code identifier
  const code = `ERR_${status}_${Date.now().toString(36)}`;

  // Collect additional error context and details
  const details: Record<string, any> = {
    timestamp: new Date().toISOString(),
    path: error.config?.url,
    method: error.config?.method?.toUpperCase(),
    ...(responseData?.['details'] || {})
  };

  // Log error for monitoring
  console.error(`API Error [${code}]:`, {
    status,
    message,
    details,
    originalError: error
  });

  return {
    status,
    message,
    code,
    details
  };
};

/**
 * Advanced retry logic with exponential backoff and configurable policies
 * @param requestFn - Promise-returning request function
 * @param config - Retry configuration
 * @returns Promise resolving to API response or rejecting with error
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const retryConfig: RetryConfig = {
    maxRetries: config.maxRetries || apiConfig.retry.maxRetries,
    retryDelay: config.retryDelay || apiConfig.retry.retryDelay,
    statusCodesToRetry: config.statusCodesToRetry || apiConfig.retry.statusCodesToRetry,
    exponentialBackoff: config.exponentialBackoff ?? apiConfig.retry.exponentialBackoff,
    backoffMultiplier: config.backoffMultiplier || apiConfig.retry.backoffMultiplier
  };

  let retryCount = 0;

  const executeRequest = async (): Promise<T> => {
    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      // Check if retry is allowed for this status code
      if (
        retryCount < retryConfig.maxRetries &&
        status &&
        retryConfig.statusCodesToRetry.includes(status)
      ) {
        // Calculate delay using exponential backoff if enabled
        const delay = retryConfig.exponentialBackoff
          ? retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, retryCount)
          : retryConfig.retryDelay;

        // Implement delay with Promise
        await new Promise(resolve => setTimeout(resolve, delay));

        retryCount++;
        return executeRequest();
      }

      // If no more retries or status not retriable, throw error
      throw handleApiError(axiosError);
    }
  };

  return executeRequest();
};

/**
 * Creates authorization header with JWT token
 * @param token - JWT token string
 * @returns Authorization header object
 */
export const createAuthHeader = (token: string): Record<string, string> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  return {
    [API_HEADERS.AUTHORIZATION]: `Bearer ${token}`
  };
};