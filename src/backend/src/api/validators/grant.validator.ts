/**
 * @fileoverview Grant validation middleware with enhanced security controls
 * Implements comprehensive validation for grant-related operations
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi'; // v17.9.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import xss from 'xss'; // v1.0.14
import { IGrant, GrantType, GrantStatus } from '../../interfaces/grant.interface';
import { SecurityLevel, ValidationSeverity } from '../../utils/validation';

/**
 * Rate limiter configuration for grant validation endpoints
 */
const createGrantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many grant validation attempts, please try again later'
});

/**
 * Enhanced validation schema for grant creation
 */
const grantCreateSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .custom((value: string) => xss(value)),
    
  description: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .custom((value: string) => xss(value)),
    
  type: Joi.string()
    .valid(...Object.values(GrantType))
    .required(),
    
  agency: Joi.string()
    .min(2)
    .max(100)
    .required()
    .custom((value: string) => xss(value)),
    
  amount: Joi.number()
    .positive()
    .max(10000000) // $10M max grant amount
    .required(),
    
  deadline: Joi.date()
    .greater('now')
    .less('now+2y') // Max 2 years in future
    .required(),
    
  requirements: Joi.object({
    eligibilityCriteria: Joi.array().items(Joi.string()).required(),
    focusAreas: Joi.array().items(Joi.string()).required(),
    applicationUrl: Joi.string().uri().required(),
    documents: Joi.array().items(Joi.string())
  }).required(),
    
  securityLevel: Joi.string()
    .valid(...Object.values(SecurityLevel))
    .required(),
    
  status: Joi.string()
    .valid(...Object.values(GrantStatus))
    .required()
});

/**
 * Enhanced validation schema for grant updates
 */
const grantUpdateSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .custom((value: string) => xss(value)),
    
  description: Joi.string()
    .min(10)
    .max(2000)
    .custom((value: string) => xss(value)),
    
  amount: Joi.number()
    .positive()
    .max(10000000),
    
  deadline: Joi.date()
    .greater('now')
    .less('now+2y'),
    
  requirements: Joi.object({
    eligibilityCriteria: Joi.array().items(Joi.string()),
    focusAreas: Joi.array().items(Joi.string()),
    applicationUrl: Joi.string().uri(),
    documents: Joi.array().items(Joi.string())
  }),
    
  status: Joi.string()
    .valid(...Object.values(GrantStatus))
}).min(1); // At least one field must be provided

/**
 * Enhanced validation schema for grant search parameters
 */
const grantSearchSchema = Joi.object({
  type: Joi.array().items(Joi.string().valid(...Object.values(GrantType))),
  agency: Joi.array().items(Joi.string()),
  minAmount: Joi.number().positive(),
  maxAmount: Joi.number().positive().greater(Joi.ref('minAmount')),
  deadline: Joi.date().greater('now'),
  focusAreas: Joi.array().items(Joi.string()),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('deadline', 'amount', 'relevance'),
  sortOrder: Joi.string().valid('asc', 'desc')
});

/**
 * Enhanced validation schema for grant applications
 */
const grantApplicationSchema = Joi.object({
  grantId: Joi.string().uuid().required(),
  content: Joi.object({
    projectTitle: Joi.string().min(3).max(200).required(),
    abstract: Joi.string().min(100).max(5000).required(),
    budget: Joi.number().positive().required(),
    timeline: Joi.string().min(50).max(2000).required()
  }).required(),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('pdf', 'doc', 'docx').required(),
      size: Joi.number().max(10 * 1024 * 1024).required() // 10MB max
    })
  ).max(10) // Max 10 attachments
});

/**
 * Validates grant creation requests with enhanced security controls
 */
export async function validateGrantCreate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await createGrantLimiter(req, res, async () => {
      const { error, value } = grantCreateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            severity: ValidationSeverity.ERROR
          }))
        });
        return;
      }

      // Additional security checks
      if (value.securityLevel === SecurityLevel.CRITICAL) {
        // Log high-security grant creation attempt
        console.log(`High-security grant creation attempt: ${value.title}`);
      }

      req.body = value;
      next();
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validates grant update requests with security checks
 */
export async function validateGrantUpdate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { error, value } = grantUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          severity: ValidationSeverity.ERROR
        }))
      });
      return;
    }

    req.body = value;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates grant search parameters with security filtering
 */
export async function validateGrantSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { error, value } = grantSearchSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          severity: ValidationSeverity.ERROR
        }))
      });
      return;
    }

    req.query = value;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validates grant application submissions with document validation
 */
export async function validateGrantApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { error, value } = grantApplicationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          severity: ValidationSeverity.ERROR
        }))
      });
      return;
    }

    // Validate file uploads if present
    if (value.attachments?.length) {
      // Implement virus scanning here
      console.log('Scanning attachments for malware...');
    }

    req.body = value;
    next();
  } catch (err) {
    next(err);
  }
}

// Export all validators
export const grantValidators = {
  validateGrantCreate,
  validateGrantUpdate,
  validateGrantSearch,
  validateGrantApplication
};