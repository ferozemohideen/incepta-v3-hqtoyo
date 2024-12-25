/**
 * @file error.middleware.ts
 * @description Express middleware for centralized error handling with enhanced security,
 * logging, and monitoring capabilities. Implements standardized error responses across
 * the Incepta platform.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // express v4.18.0
import { StatusCodes } from 'http-status-codes'; // http-status-codes v2.2.0
import { v4 as uuidv4 } from 'uuid'; // uuid v9.0.7
import { enhancedLogger as logger } from '../../lib/logger';
import { BaseError, ErrorSeverity } from '../../utils/errors';
import { ErrorCodes, ErrorMessages } from '../../constants/errorCodes';
import { HTTP_STATUS } from '../../constants/statusCodes';

/**
 * Interface for standardized error response format
 */
interface ErrorResponse {
  code: number;
  message: string;
  correlationId: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

/**
 * Interface for error context metadata
 */
interface ErrorContext {
  userId?: string;
  requestId: string;
  severity: ErrorSeverity;
  source: string;
}

/**
 * Constants for error handling configuration
 */
const DEFAULT_ERROR_CODE = ErrorCodes.INTERNAL_SERVER_ERROR;
const DEFAULT_ERROR_MESSAGE = ErrorMessages[DEFAULT_ERROR_CODE];

/**
 * Map of error types to severity levels
 */
const ERROR_SEVERITY_MAP: Record<string, ErrorSeverity> = {
  ValidationError: ErrorSeverity.LOW,
  AuthenticationError: ErrorSeverity.MEDIUM,
  AuthorizationError: ErrorSeverity.HIGH,
  DatabaseError: ErrorSeverity.HIGH,
  Error: ErrorSeverity.MEDIUM
};

/**
 * List of sensitive fields to be filtered from error details
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'credentials',
  'ssn',
  'creditCard'
];

/**
 * Sanitizes error details to remove sensitive information
 * @param details - Raw error details object
 * @returns Sanitized error details
 */
const sanitizeErrorDetails = (details?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!details) return undefined;

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Creates error context for logging and monitoring
 * @param error - Error instance
 * @param req - Express request object
 * @returns Error context metadata
 */
const createErrorContext = (error: Error, req: Request): ErrorContext => {
  return {
    userId: req.user?.id,
    requestId: req.headers['x-request-id'] as string || uuidv4(),
    severity: ERROR_SEVERITY_MAP[error.constructor.name] || ErrorSeverity.MEDIUM,
    source: 'api'
  };
};

/**
 * Formats error response based on environment and error type
 * @param error - Error instance
 * @param req - Express request object
 * @returns Formatted error response
 */
const formatErrorResponse = (error: Error, req: Request): ErrorResponse => {
  const isBaseError = error instanceof BaseError;
  const correlationId = uuidv4();

  const response: ErrorResponse = {
    code: isBaseError ? (error as BaseError).code : DEFAULT_ERROR_CODE,
    message: isBaseError ? error.message : DEFAULT_ERROR_MESSAGE,
    correlationId,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add sanitized details for BaseError instances in non-production
  if (isBaseError && process.env.NODE_ENV !== 'production') {
    const baseError = error as BaseError;
    if (baseError.details) {
      response.details = sanitizeErrorDetails(baseError.details);
    }
  }

  return response;
};

/**
 * Global error handling middleware
 * @param error - Error instance
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Create error context for logging
  const context = createErrorContext(error, req);
  
  // Format error response
  const response = formatErrorResponse(error, req);
  
  // Determine HTTP status code
  const statusCode = error instanceof BaseError
    ? (error as BaseError).status
    : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Log error with context
  logger.error(`${error.name}: ${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    context,
    correlationId: response.correlationId,
    request: {
      method: req.method,
      path: req.path,
      query: sanitizeErrorDetails(req.query),
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id']
      }
    }
  });

  // Send error response
  res.status(statusCode).json(response);
};

export default errorHandler;