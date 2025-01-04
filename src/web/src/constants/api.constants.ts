/**
 * API Constants
 * Defines core API-related constants for the Incepta platform's web application
 * Version: 1.0.0
 * 
 * Implements REST API standards with:
 * - OAuth 2.0 + JWT authentication
 * - Rate limiting (1000 requests/hour)
 * - URI-based versioning
 */

/**
 * Current API version identifier
 * Used for URI-based versioning of API endpoints
 */
export const API_VERSION = 'v1';

/**
 * Comprehensive collection of API endpoint paths organized by resource type
 * All paths are prefixed with /api/{version} in the actual requests
 */
export const API_ENDPOINTS = {
  AUTH: {
    /** Authentication endpoints */
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    RESET_PASSWORD: '/auth/reset-password',
    /** Multi-factor authentication endpoints */
    MFA_SETUP: '/auth/mfa/setup',
    MFA_VERIFY: '/auth/mfa/verify',
    MFA_DISABLE: '/auth/mfa/disable'
  },
  TECHNOLOGIES: {
    /** Technology discovery and management endpoints */
    BASE: '/technologies',
    SEARCH: '/technologies/search',
    MATCH: '/technologies/match',
    SAVE: '/technologies/save',
    RECOMMENDATIONS: '/technologies/recommendations'
  },
  GRANTS: {
    /** Grant management endpoints */
    BASE: '/grants',
    OPPORTUNITIES: '/grants/opportunities',
    APPLY: '/grants/apply',
    STATUS: '/grants/status',
    DRAFTS: '/grants/drafts'
  },
  MESSAGES: {
    /** Secure messaging and document sharing endpoints */
    BASE: '/messages',
    THREAD: '/messages/thread',
    DOCUMENTS: '/messages/documents',
    ATTACHMENTS: '/messages/attachments'
  },
  USERS: {
    /** User profile and preferences endpoints */
    PROFILE: '/users/profile',
    SETTINGS: '/users/settings',
    MATCHES: '/users/matches',
    PREFERENCES: '/users/preferences'
  },
  ANALYTICS: {
    /** Analytics data endpoints */
    BASE: '/analytics'
  }
} as const;

/**
 * Standard HTTP method constants for API requests
 * Defines allowed methods for RESTful operations
 */
export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
} as const;

/**
 * Standard and custom HTTP headers for API requests and responses
 * Includes rate limiting and authorization headers
 */
export const API_HEADERS = {
  /** Standard HTTP headers */
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  /** Custom rate limiting headers */
  RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
  RATE_LIMIT_RESET: 'X-RateLimit-Reset'
} as const;

/**
 * HTTP status codes for API responses with custom error codes
 * Follows standard HTTP status code conventions with platform-specific codes
 */
export const API_STATUS_CODES = {
  // Success codes
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  
  // Server error codes
  SERVER_ERROR: 500
} as const;

// Type definitions for better TypeScript support
export type ApiVersion = typeof API_VERSION;
export type ApiEndpoints = typeof API_ENDPOINTS;
export type ApiMethods = typeof API_METHODS;
export type ApiHeaders = typeof API_HEADERS;
export type ApiStatusCodes = typeof API_STATUS_CODES;