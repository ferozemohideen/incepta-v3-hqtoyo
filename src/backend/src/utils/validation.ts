/**
 * @fileoverview Comprehensive validation utility module for secure data validation
 * Implements validation and sanitization for different data classifications
 * @version 1.0.0
 */

import validator from 'validator'; // Version: 13.9.0
import Joi from 'joi'; // Version: 17.9.0
import { User, UserProfile, UserPreferences, UserSecurity } from '../interfaces/user.interface';
import { Technology, PatentStatus, SecurityClassification, TechnologyMetadata } from '../interfaces/technology.interface';
import { UserRole } from '../constants/roles';

/**
 * Security level enumeration for data validation
 */
enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Validation severity levels for error reporting
 */
enum ValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Interface for validation error details
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: ValidationSeverity;
}

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  securityLevel: SecurityLevel;
}

/**
 * User validation schema using Joi
 */
const userSchema = Joi.object({
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  profile: Joi.object({
    organization: Joi.string().max(200),
    title: Joi.string().max(100),
    phone: Joi.string().pattern(/^\+?[\d\s-()]{8,20}$/),
    bio: Joi.string().max(2000),
    interests: Joi.array().items(Joi.string()),
    avatar: Joi.string().uri()
  }).required(),
  preferences: Joi.object({
    emailNotifications: Joi.boolean(),
    theme: Joi.string().valid('light', 'dark'),
    language: Joi.string().length(2),
    timezone: Joi.string()
  }).required(),
  security: Joi.object({
    mfaEnabled: Joi.boolean(),
    lastLogin: Joi.date(),
    passwordChangedAt: Joi.date()
  }).required(),
  createdAt: Joi.date(),
  updatedAt: Joi.date()
});

/**
 * Technology validation schema using Joi
 */
const technologySchema = Joi.object({
  id: Joi.string().uuid().required(),
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(20).max(5000).required(),
  university: Joi.string().required(),
  patentStatus: Joi.string().valid(...Object.values(PatentStatus)).required(),
  trl: Joi.number().min(1).max(9).required(),
  domains: Joi.array().items(Joi.string()).min(1).required(),
  metadata: Joi.object({
    inventors: Joi.array().items(Joi.string()).min(1).required(),
    patentNumber: Joi.string(),
    filingDate: Joi.date(),
    keywords: Joi.array().items(Joi.string()),
    publications: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      authors: Joi.array().items(Joi.string()).required(),
      journal: Joi.string(),
      doi: Joi.string(),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
      url: Joi.string().uri()
    })),
    fundingHistory: Joi.array().items(Joi.object({
      source: Joi.string().required(),
      amount: Joi.number().positive().required(),
      grantNumber: Joi.string(),
      startDate: Joi.date().required(),
      endDate: Joi.date(),
      status: Joi.string().valid('ACTIVE', 'COMPLETED', 'PENDING')
    }))
  }).required(),
  securityLevel: Joi.string().valid(...Object.values(SecurityClassification)).required(),
  createdAt: Joi.date(),
  updatedAt: Joi.date()
});

/**
 * Sanitizes input string against XSS and SQL injection
 * @param input - String to sanitize
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  let sanitized = validator.escape(input);
  sanitized = validator.stripLow(sanitized);
  return validator.trim(sanitized);
};

/**
 * Validates user data with security classification
 * @param userData - User data to validate
 * @returns Validation result with security level
 */
export async function validateUser(userData: Partial<User>): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  let securityLevel = SecurityLevel.LOW;

  try {
    // Validate against schema
    const { error } = userSchema.validate(userData, { abortEarly: false });
    if (error) {
      error.details.forEach(detail => {
        errors.push({
          field: detail.path.join('.'),
          message: detail.message,
          code: 'SCHEMA_VALIDATION_ERROR',
          severity: ValidationSeverity.ERROR
        });
      });
    }

    // Email validation
    if (userData.email && !validator.isEmail(userData.email, { allow_utf8_local_part: false })) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        severity: ValidationSeverity.ERROR
      });
    }

    // Security level determination
    if (userData.role === UserRole.ADMIN || userData.role === UserRole.TTO) {
      securityLevel = SecurityLevel.CRITICAL;
    } else if (userData.security?.mfaEnabled) {
      securityLevel = SecurityLevel.HIGH;
    } else if (userData.role === UserRole.RESEARCHER) {
      securityLevel = SecurityLevel.MEDIUM;
    }

    // Sanitize text fields
    if (userData.name) {
      userData.name = sanitizeInput(userData.name);
    }
    if (userData.profile?.bio) {
      userData.profile.bio = sanitizeInput(userData.profile.bio);
    }

  } catch (err) {
    errors.push({
      field: 'general',
      message: 'Validation process failed',
      code: 'VALIDATION_FAILED',
      severity: ValidationSeverity.CRITICAL
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    securityLevel
  };
}

/**
 * Validates technology data with security controls
 * @param technologyData - Technology data to validate
 * @returns Validation result with security level
 */
export async function validateTechnology(technologyData: Partial<Technology>): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  let securityLevel = SecurityLevel.MEDIUM;

  try {
    // Validate against schema
    const { error } = technologySchema.validate(technologyData, { abortEarly: false });
    if (error) {
      error.details.forEach(detail => {
        errors.push({
          field: detail.path.join('.'),
          message: detail.message,
          code: 'SCHEMA_VALIDATION_ERROR',
          severity: ValidationSeverity.ERROR
        });
      });
    }

    // Security classification checks
    if (technologyData.securityLevel === SecurityClassification.RESTRICTED) {
      securityLevel = SecurityLevel.CRITICAL;
    } else if (technologyData.securityLevel === SecurityClassification.CONFIDENTIAL) {
      securityLevel = SecurityLevel.HIGH;
    }

    // Patent status validation
    if (technologyData.patentStatus === PatentStatus.GRANTED && !technologyData.metadata?.patentNumber) {
      errors.push({
        field: 'metadata.patentNumber',
        message: 'Patent number required for granted patents',
        code: 'MISSING_PATENT_NUMBER',
        severity: ValidationSeverity.ERROR
      });
    }

    // Sanitize text fields
    if (technologyData.title) {
      technologyData.title = sanitizeInput(technologyData.title);
    }
    if (technologyData.description) {
      technologyData.description = sanitizeInput(technologyData.description);
    }

    // Validate TRL range
    if (technologyData.trl && (technologyData.trl < 1 || technologyData.trl > 9)) {
      errors.push({
        field: 'trl',
        message: 'TRL must be between 1 and 9',
        code: 'INVALID_TRL',
        severity: ValidationSeverity.ERROR
      });
    }

  } catch (err) {
    errors.push({
      field: 'general',
      message: 'Validation process failed',
      code: 'VALIDATION_FAILED',
      severity: ValidationSeverity.CRITICAL
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    securityLevel
  };
}

/**
 * Validates and sanitizes a generic object against potential security threats
 * @param data - Object to validate
 * @param securityLevel - Required security level
 * @returns Sanitized object
 */
export function sanitizeObject<T extends object>(data: T, securityLevel: SecurityLevel): T {
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value) as any;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, securityLevel);
    }
  });

  return sanitized;
}