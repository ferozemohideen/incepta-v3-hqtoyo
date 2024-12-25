/**
 * @fileoverview Technology validation middleware and schema definitions
 * Implements comprehensive validation and security controls for technology-related API requests
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { body, query, param, validationResult } from 'express-validator'; // Version: 7.0.0
import Joi from 'joi'; // Version: 17.9.0
import { Technology, PatentStatus, SecurityClassification, TechnologyMetadata } from '../../interfaces/technology.interface';
import { validateTechnology } from '../../utils/validation';

/**
 * Custom error type for technology validation failures
 */
interface TechnologyValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Joi schema for technology creation validation
 */
const createTechnologySchema = Joi.object({
  title: Joi.string().min(5).max(200).required()
    .pattern(/^[\w\s\-.,()&]+$/)
    .messages({
      'string.pattern.base': 'Title contains invalid characters'
    }),
  description: Joi.string().min(20).max(5000).required(),
  university: Joi.string().required(),
  patentStatus: Joi.string().valid(...Object.values(PatentStatus)).required(),
  trl: Joi.number().integer().min(1).max(9).required(),
  domains: Joi.array().items(Joi.string()).min(1).required(),
  metadata: Joi.object({
    inventors: Joi.array().items(Joi.string()).min(1).required(),
    patentNumber: Joi.string().when('patentStatus', {
      is: PatentStatus.GRANTED,
      then: Joi.required()
    }),
    filingDate: Joi.date(),
    keywords: Joi.array().items(Joi.string()),
    publications: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      authors: Joi.array().items(Joi.string()).required(),
      journal: Joi.string(),
      doi: Joi.string().pattern(/^10\.\d{4,9}\/[-._;()\/:A-Z0-9]+$/i),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
      url: Joi.string().uri()
    })),
    fundingHistory: Joi.array().items(Joi.object({
      source: Joi.string().required(),
      amount: Joi.number().positive().required(),
      grantNumber: Joi.string(),
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')),
      status: Joi.string().valid('ACTIVE', 'COMPLETED', 'PENDING')
    }))
  }).required(),
  securityLevel: Joi.string().valid(...Object.values(SecurityClassification)).required()
});

/**
 * Validates and sanitizes request body for technology creation
 * Implements comprehensive security checks and XSS prevention
 */
export const validateCreateTechnology: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Express-validator checks
    await Promise.all([
      body('title').trim().escape().notEmpty().isLength({ min: 5, max: 200 }).run(req),
      body('description').trim().escape().notEmpty().isLength({ min: 20, max: 5000 }).run(req),
      body('university').trim().escape().notEmpty().run(req),
      body('patentStatus').isIn(Object.values(PatentStatus)).run(req),
      body('trl').isInt({ min: 1, max: 9 }).run(req),
      body('domains').isArray({ min: 1 }).run(req),
      body('domains.*').trim().escape().notEmpty().run(req),
      body('metadata').isObject().notEmpty().run(req),
      body('securityLevel').isIn(Object.values(SecurityClassification)).run(req)
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          code: 'VALIDATION_ERROR'
        }))
      });
    }

    // Joi schema validation
    const { error } = createTechnologySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: 'SCHEMA_ERROR'
        }))
      });
    }

    // Custom validation using utility function
    const validationResult = await validateTechnology(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        errors: validationResult.errors
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates and sanitizes request body for technology updates
 * Implements transition validation and partial update checks
 */
export const validateUpdateTechnology: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate technology ID
    await param('id').isUUID().run(req);

    // Validate optional update fields
    const validationPromises = [];
    if (req.body.title) {
      validationPromises.push(body('title').trim().escape().isLength({ min: 5, max: 200 }).run(req));
    }
    if (req.body.description) {
      validationPromises.push(body('description').trim().escape().isLength({ min: 20, max: 5000 }).run(req));
    }
    if (req.body.patentStatus) {
      validationPromises.push(body('patentStatus').isIn(Object.values(PatentStatus)).run(req));
    }
    if (req.body.trl) {
      validationPromises.push(body('trl').isInt({ min: 1, max: 9 }).run(req));
    }
    if (req.body.metadata) {
      validationPromises.push(body('metadata').isObject().notEmpty().run(req));
    }

    await Promise.all(validationPromises);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          code: 'VALIDATION_ERROR'
        }))
      });
    }

    // Validate patent status transitions
    if (req.body.patentStatus) {
      const validTransitions = {
        [PatentStatus.PENDING]: [PatentStatus.GRANTED, PatentStatus.NOT_PATENTED],
        [PatentStatus.PROVISIONAL]: [PatentStatus.PENDING, PatentStatus.NOT_PATENTED],
        [PatentStatus.GRANTED]: [],
        [PatentStatus.NOT_PATENTED]: [PatentStatus.PROVISIONAL, PatentStatus.PENDING]
      };

      const currentStatus = req.body.currentPatentStatus; // Assuming this is provided
      const newStatus = req.body.patentStatus;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return res.status(400).json({
          errors: [{
            field: 'patentStatus',
            message: 'Invalid patent status transition',
            code: 'INVALID_TRANSITION'
          }]
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates and sanitizes search parameters
 * Implements SQL injection prevention and query sanitization
 */
export const validateTechnologySearch: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await Promise.all([
      query('q').optional().trim().escape().isLength({ max: 200 }).run(req),
      query('universities').optional().isArray().run(req),
      query('universities.*').optional().trim().escape().run(req),
      query('patentStatus').optional().isArray().run(req),
      query('patentStatus.*').optional().isIn(Object.values(PatentStatus)).run(req),
      query('trlMin').optional().isInt({ min: 1, max: 9 }).run(req),
      query('trlMax').optional().isInt({ min: 1, max: 9 }).run(req),
      query('domains').optional().isArray().run(req),
      query('domains.*').optional().trim().escape().run(req),
      query('page').optional().isInt({ min: 1 }).run(req),
      query('limit').optional().isInt({ min: 1, max: 100 }).run(req)
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          code: 'VALIDATION_ERROR'
        }))
      });
    }

    // Validate TRL range if both values are provided
    if (req.query.trlMin && req.query.trlMax) {
      const min = parseInt(req.query.trlMin as string);
      const max = parseInt(req.query.trlMax as string);
      if (min > max) {
        return res.status(400).json({
          errors: [{
            field: 'trl',
            message: 'TRL minimum cannot be greater than maximum',
            code: 'INVALID_RANGE'
          }]
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};