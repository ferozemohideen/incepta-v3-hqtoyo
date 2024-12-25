/**
 * @file errorCodes.ts
 * @description Centralized error management system for the Incepta platform.
 * Provides standardized error codes and messages for consistent error handling,
 * monitoring, and API responses across the backend application.
 * @version 1.0.0
 */

/**
 * Enum containing numeric error codes for different types of errors.
 * Codes are organized in ranges for different domains:
 * - 1000-1099: General/System errors
 * - 1100-1199: Reserved for future authentication/authorization errors
 * - 1200-1299: Reserved for future data processing errors
 * - 1300-1399: Reserved for future integration errors
 */
export enum ErrorCodes {
    // General System Errors (1000-1099)
    VALIDATION_ERROR = 1001,
    AUTHENTICATION_ERROR = 1002,
    AUTHORIZATION_ERROR = 1003,
    RESOURCE_NOT_FOUND = 1004,
    DATABASE_ERROR = 1005,
    RATE_LIMIT_EXCEEDED = 1006,
    INTERNAL_SERVER_ERROR = 1007,

    // Domain-Specific Errors
    INVALID_TECHNOLOGY_DATA = 1008,
    GRANT_PROCESSING_ERROR = 1009,
    SCRAPER_ERROR = 1010
}

/**
 * Constant containing user-friendly error messages.
 * Messages are designed to be:
 * - Security-conscious (no sensitive information)
 * - User-friendly
 * - Internationalization-ready
 * - Consistent across the application
 */
export const ErrorMessages = {
    // General System Error Messages
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
    [ErrorCodes.AUTHENTICATION_ERROR]: 'Unable to verify your credentials',
    [ErrorCodes.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action',
    [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested item could not be found',
    [ErrorCodes.DATABASE_ERROR]: 'Unable to complete database operation',
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Please wait before making more requests',
    [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',

    // Domain-Specific Error Messages
    [ErrorCodes.INVALID_TECHNOLOGY_DATA]: 'Technology data validation failed',
    [ErrorCodes.GRANT_PROCESSING_ERROR]: 'Unable to process grant request',
    [ErrorCodes.SCRAPER_ERROR]: 'Data collection service unavailable'
} as const;

/**
 * Type guard to check if a number is a valid ErrorCode
 * @param code - The number to check
 * @returns boolean indicating if the code is a valid ErrorCode
 */
export const isValidErrorCode = (code: number): code is ErrorCodes => {
    return Object.values(ErrorCodes).includes(code);
};

/**
 * Type for error response object used in API responses
 */
export type ErrorResponse = {
    code: ErrorCodes;
    message: string;
    timestamp: string;
    requestId?: string;
};

/**
 * Creates a standardized error response object
 * @param code - Error code from ErrorCodes enum
 * @param requestId - Optional request ID for tracking
 * @returns ErrorResponse object
 */
export const createErrorResponse = (code: ErrorCodes, requestId?: string): ErrorResponse => {
    return {
        code,
        message: ErrorMessages[code],
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId })
    };
};