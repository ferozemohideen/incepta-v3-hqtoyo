/**
 * @fileoverview Express middleware for request validation with security classification awareness
 * Implements comprehensive validation for all API endpoints with standardized error handling
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // Version: ^4.18.0
import Joi from 'joi'; // Version: ^17.9.0
import { validateUser, validateTechnology, validateGrant, validateMessage } from '../../utils/validation';
import { ValidationError } from '../../utils/errors';
import { SecurityClassification } from '../../interfaces/technology.interface';

/**
 * Supported validation types for different data entities
 */
enum ValidationType {
  USER = 'USER',
  TECHNOLOGY = 'TECHNOLOGY',
  GRANT = 'GRANT',
  MESSAGE = 'MESSAGE'
}

/**
 * Request locations where data can be validated
 */
enum ValidationLocation {
  BODY = 'body',
  PARAMS = 'params',
  QUERY = 'query'
}

/**
 * Interface for validation middleware configuration options
 */
interface ValidationOptions {
  type: ValidationType;
  location: ValidationLocation;
  stripUnknown?: boolean;
  customMessages?: Record<string, string>;
  securityLevel?: SecurityClassification;
  enableCache?: boolean;
}

/**
 * Cache for validation results to improve performance
 */
const validationCache = new Map<string, {
  result: boolean;
  timestamp: number;
  errors?: string[];
}>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generates a cache key for validation results
 */
const generateCacheKey = (data: any, type: ValidationType, securityLevel?: SecurityClassification): string => {
  return `${type}_${securityLevel || 'DEFAULT'}_${JSON.stringify(data)}`;
};

/**
 * Cleans expired entries from validation cache
 */
const cleanValidationCache = (): void => {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      validationCache.delete(key);
    }
  }
};

/**
 * Express middleware factory for request validation
 * @param options - Validation configuration options
 * @returns Express middleware function
 */
export const validateRequest = (options: ValidationOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[options.location];
      
      // Check cache if enabled
      if (options.enableCache) {
        const cacheKey = generateCacheKey(dataToValidate, options.type, options.securityLevel);
        const cachedResult = validationCache.get(cacheKey);
        
        if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
          if (!cachedResult.result) {
            throw new ValidationError('Validation failed', {
              context: { errors: cachedResult.errors }
            });
          }
          return next();
        }
      }

      // Perform validation based on type
      let validationResult;
      switch (options.type) {
        case ValidationType.USER:
          validationResult = await validateUser(dataToValidate);
          break;

        case ValidationType.TECHNOLOGY:
          validationResult = await validateTechnology({
            ...dataToValidate,
            securityLevel: options.securityLevel || SecurityClassification.PUBLIC
          });
          break;

        case ValidationType.GRANT:
          validationResult = await validateGrant(dataToValidate);
          break;

        case ValidationType.MESSAGE:
          validationResult = await validateMessage(dataToValidate);
          break;

        default:
          throw new ValidationError('Invalid validation type');
      }

      // Handle validation result
      if (!validationResult.isValid) {
        const errors = validationResult.errors.map(error => error.message);
        
        // Cache failed validation if enabled
        if (options.enableCache) {
          const cacheKey = generateCacheKey(dataToValidate, options.type, options.securityLevel);
          validationCache.set(cacheKey, {
            result: false,
            timestamp: Date.now(),
            errors
          });
        }

        throw new ValidationError('Validation failed', {
          context: { errors }
        });
      }

      // Cache successful validation if enabled
      if (options.enableCache) {
        const cacheKey = generateCacheKey(dataToValidate, options.type, options.securityLevel);
        validationCache.set(cacheKey, {
          result: true,
          timestamp: Date.now()
        });
      }

      // Clean cache periodically
      if (options.enableCache && Math.random() < 0.1) { // 10% chance to clean on each request
        cleanValidationCache();
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
      } else {
        next(new ValidationError('Validation process failed', {
          context: { originalError: error.message }
        }));
      }
    }
  };
};

/**
 * Predefined validation middleware instances for common use cases
 */
export const commonValidators = {
  /**
   * Validates user data in request body
   */
  userBody: validateRequest({
    type: ValidationType.USER,
    location: ValidationLocation.BODY,
    stripUnknown: true,
    enableCache: true
  }),

  /**
   * Validates technology data with confidential classification
   */
  confidentialTechnology: validateRequest({
    type: ValidationType.TECHNOLOGY,
    location: ValidationLocation.BODY,
    securityLevel: SecurityClassification.CONFIDENTIAL,
    stripUnknown: true,
    enableCache: true
  }),

  /**
   * Validates grant application data
   */
  grantApplication: validateRequest({
    type: ValidationType.GRANT,
    location: ValidationLocation.BODY,
    stripUnknown: true,
    enableCache: true
  }),

  /**
   * Validates message content with security checks
   */
  secureMessage: validateRequest({
    type: ValidationType.MESSAGE,
    location: ValidationLocation.BODY,
    stripUnknown: true,
    enableCache: false // Don't cache message validation for security
  })
};
```

This implementation provides a robust validation middleware that:

1. Supports different validation types (User, Technology, Grant, Message)
2. Implements security classification-aware validation
3. Includes caching for performance optimization
4. Provides standardized error handling
5. Offers predefined validators for common use cases
6. Follows enterprise-grade coding practices with comprehensive documentation
7. Integrates with the existing validation utilities and error handling system

The middleware can be used in route definitions like:

```typescript
router.post('/users', commonValidators.userBody, createUser);
router.post('/technologies', commonValidators.confidentialTechnology, createTechnology);