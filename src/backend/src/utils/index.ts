/**
 * @fileoverview Main entry point for utility functions in the Incepta platform.
 * Provides centralized access to encryption, validation, and error handling utilities
 * with comprehensive type safety and documentation.
 * @module utils
 * @version 1.0.0
 */

// Import encryption utilities
import {
  hashPassword,
  comparePassword,
  encryptData,
  decryptData
} from './encryption';

// Import validation utilities
import {
  validateUser,
  validateTechnology,
  sanitizeObject
} from './validation';

// Import error handling utilities
import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  RateLimitError,
  DatabaseError,
  createErrorResponse
} from './errors';

/**
 * Encryption Utilities
 * Provides secure cryptographic functions for password handling and data encryption.
 * @see module:utils/encryption
 */
export {
  hashPassword,
  comparePassword,
  encryptData,
  decryptData
};

/**
 * Validation Utilities
 * Provides data validation and sanitization functions with security controls.
 * @see module:utils/validation
 */
export {
  validateUser,
  validateTechnology,
  sanitizeObject
};

/**
 * Error Handling Utilities
 * Provides standardized error classes and response formatting.
 * @see module:utils/errors
 */
export {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  RateLimitError,
  DatabaseError,
  createErrorResponse
};

/**
 * Type exports for utility functions
 * Provides type definitions for function parameters and return values
 */
export type {
  ValidationResult,
  SecurityLevel
} from './validation';

/**
 * Re-export error types and constants
 * Provides access to error codes and messages
 */
export {
  ErrorCodes,
  ErrorMessages,
  ErrorSeverity
} from './errors';

/**
 * Default export of all utility functions
 * Provides a single object containing all utility functions
 */
export default {
  // Encryption utilities
  hashPassword,
  comparePassword,
  encryptData,
  decryptData,

  // Validation utilities
  validateUser,
  validateTechnology,
  sanitizeObject,

  // Error handling utilities
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  RateLimitError,
  DatabaseError,
  createErrorResponse
};