/**
 * @file errors.ts
 * @description Custom error handling system for the Incepta platform with enhanced tracking,
 * monitoring, and security-focused error responses. Implements standardized error management
 * across the backend application.
 * @version 1.0.0
 */

import { ErrorCodes, ErrorMessages } from '../constants/errorCodes';
import { HTTP_STATUS } from '../constants/statusCodes';
import { v4 as uuidv4 } from 'uuid'; // @types/uuid@9.0.7

/**
 * Severity levels for error tracking and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interface for error details with type safety
 */
interface ErrorDetails {
  [key: string]: unknown;
  context?: Record<string, unknown>;
  source?: string;
  requestId?: string;
}

/**
 * Base error class with enhanced tracking and monitoring capabilities
 */
export class BaseError extends Error {
  public readonly code: ErrorCodes;
  public readonly status: HTTP_STATUS;
  public readonly details?: ErrorDetails;
  public readonly severity: ErrorSeverity;
  public readonly errorId: string;
  public readonly timestamp: string;

  /**
   * Creates a new BaseError instance with tracking metadata
   * @param message - User-facing error message
   * @param code - Error code from ErrorCodes enum
   * @param status - HTTP status code
   * @param details - Additional error context and metadata
   * @param severity - Error severity level
   */
  constructor(
    message: string,
    code: ErrorCodes,
    status: HTTP_STATUS,
    details?: ErrorDetails,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    // Call parent constructor with sanitized message
    super(message);

    // Set error name and prototype for proper inheritance
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, BaseError.prototype);

    // Initialize error properties
    this.code = code;
    this.status = status;
    this.details = this.sanitizeDetails(details);
    this.severity = severity;
    this.errorId = uuidv4();
    this.timestamp = new Date().toISOString();

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Initialize error tracking (example implementation)
    this.initializeErrorTracking();
  }

  /**
   * Sanitizes error details to prevent sensitive data exposure
   * @param details - Raw error details
   * @returns Sanitized error details
   */
  private sanitizeDetails(details?: ErrorDetails): ErrorDetails | undefined {
    if (!details) return undefined;

    // Create a new object with sanitized data
    const sanitized: ErrorDetails = {};
    
    // Whitelist allowed fields and sanitize values
    const allowedFields = ['context', 'source', 'requestId'];
    for (const field of allowedFields) {
      if (field in details) {
        sanitized[field] = details[field];
      }
    }

    return sanitized;
  }

  /**
   * Initializes error tracking integration
   * Override this method to implement specific tracking logic
   */
  private initializeErrorTracking(): void {
    // Example implementation - replace with actual tracking service
    console.error({
      errorId: this.errorId,
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      stack: this.stack
    });
  }

  /**
   * Serializes error for logging and monitoring
   * @returns Formatted error object
   */
  public toJSON(): Record<string, unknown> {
    const errorObject = {
      errorId: this.errorId,
      code: this.code,
      status: this.status,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp
    };

    // Add details if available
    if (this.details) {
      Object.assign(errorObject, { details: this.details });
    }

    // Include stack trace in development environment
    if (process.env.NODE_ENV === 'development') {
      Object.assign(errorObject, { stack: this.stack });
    }

    return errorObject;
  }
}

/**
 * Creates a standardized error response object for API responses
 * @param error - Error instance
 * @returns Secure error response object
 */
export function createErrorResponse(error: Error): Record<string, unknown> {
  // Handle BaseError instances
  if (error instanceof BaseError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
      errorId: error.errorId,
      timestamp: error.timestamp,
      ...(error.details?.requestId && { requestId: error.details.requestId })
    };
  }

  // Handle unknown errors
  return {
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
    errorId: uuidv4(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Specialized error classes for common error types
 */

export class ValidationError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.VALIDATION_ERROR], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST,
      details,
      ErrorSeverity.LOW
    );
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.AUTHENTICATION_ERROR], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.AUTHENTICATION_ERROR,
      HTTP_STATUS.UNAUTHORIZED,
      details,
      ErrorSeverity.MEDIUM
    );
  }
}

export class AuthorizationError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.AUTHORIZATION_ERROR], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.AUTHORIZATION_ERROR,
      HTTP_STATUS.FORBIDDEN,
      details,
      ErrorSeverity.HIGH
    );
  }
}

export class ResourceNotFoundError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.RESOURCE_NOT_FOUND], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.RESOURCE_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      details,
      ErrorSeverity.LOW
    );
  }
}

export class RateLimitError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.RATE_LIMIT_EXCEEDED], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      details,
      ErrorSeverity.MEDIUM
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message = ErrorMessages[ErrorCodes.DATABASE_ERROR], details?: ErrorDetails) {
    super(
      message,
      ErrorCodes.DATABASE_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      details,
      ErrorSeverity.HIGH
    );
  }
}