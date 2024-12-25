/**
 * @fileoverview Central constants index file for the Incepta platform.
 * This file serves as the single source of truth for all application constants,
 * consolidating error codes, HTTP status codes, and role-based access control constants.
 * 
 * @version 1.0.0
 * @module constants
 */

import {
  ErrorCodes,
  ErrorMessages,
  isValidErrorCode,
  createErrorResponse,
  type ErrorResponse
} from './errorCodes';

import {
  UserRole,
  type Permission,
  RolePermissions,
  type AvailablePermissions,
  hasPermission,
  getPermissionsForRole
} from './roles';

import { HTTP_STATUS } from './statusCodes';

// Re-export error handling constants and utilities
export {
  ErrorCodes,
  ErrorMessages,
  isValidErrorCode,
  createErrorResponse,
  type ErrorResponse
};

// Re-export role-based access control constants and utilities
export {
  UserRole,
  type Permission,
  RolePermissions,
  type AvailablePermissions,
  hasPermission,
  getPermissionsForRole
};

// Re-export HTTP status codes
export { HTTP_STATUS };

/**
 * @constant DEFAULT_ERROR_CODE
 * Default error code used when no specific error code is provided
 */
export const DEFAULT_ERROR_CODE = ErrorCodes.INTERNAL_SERVER_ERROR;

/**
 * @constant API_VERSION
 * Current API version for versioning routes and responses
 */
export const API_VERSION = 'v1';

/**
 * @constant RATE_LIMIT
 * Default rate limiting configuration
 */
export const RATE_LIMIT = {
  WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_REQUESTS: 1000, // Maximum requests per window
  SKIP_FAILED_REQUESTS: false // Count failed requests against the rate limit
} as const;

/**
 * @constant PAGINATION
 * Default pagination configuration
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
} as const;

/**
 * @constant CACHE
 * Default cache configuration
 */
export const CACHE = {
  TTL: 60 * 60, // 1 hour in seconds
  CHECK_PERIOD: 60, // Check for expired cache entries every minute
  MAX_KEYS: 1000 // Maximum number of cache keys
} as const;

/**
 * @constant REQUEST_TIMEOUT
 * Default request timeout configuration in milliseconds
 */
export const REQUEST_TIMEOUT = {
  DEFAULT: 30000, // 30 seconds
  LONG: 120000, // 2 minutes for long-running operations
  UPLOAD: 300000 // 5 minutes for file uploads
} as const;

/**
 * @constant SECURITY
 * Security-related constants
 */
export const SECURITY = {
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_MAX_LENGTH: 128,
  TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes in milliseconds
} as const;

/**
 * @constant FILE_UPLOAD
 * File upload configuration
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILES: 5
} as const;

/**
 * @constant API_ENDPOINTS
 * Common API endpoint paths
 */
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  TECHNOLOGIES: '/technologies',
  GRANTS: '/grants',
  MESSAGES: '/messages',
  ANALYTICS: '/analytics'
} as const;

// Type exports for constants
export type RateLimit = typeof RATE_LIMIT;
export type Pagination = typeof PAGINATION;
export type Cache = typeof CACHE;
export type RequestTimeout = typeof REQUEST_TIMEOUT;
export type Security = typeof SECURITY;
export type FileUpload = typeof FILE_UPLOAD;
export type ApiEndpoints = typeof API_ENDPOINTS;