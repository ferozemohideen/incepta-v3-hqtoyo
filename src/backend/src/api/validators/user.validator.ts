/**
 * @fileoverview User validation schemas and functions with enhanced security controls
 * Implements comprehensive validation for user data with security classifications
 * and RBAC compliance.
 * @version 1.0.0
 */

import Joi from 'joi'; // Version: 17.9.0
import { User, UserProfile, UserPreferences, UserSecurity } from '../../interfaces/user.interface';
import { UserRole } from '../../constants/roles';
import { validateUser } from '../../utils/validation';

// Regular expressions for enhanced validation
const PHONE_REGEX = /^\+?[\d\s-()]{8,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
const ORGANIZATION_REGEX = /^[a-zA-Z0-9\s\-&,.()]{2,200}$/;
const NAME_REGEX = /^[a-zA-Z\s\-']{2,100}$/;

/**
 * Enhanced profile validation schema with organization verification
 */
const profileSchema = Joi.object<UserProfile>({
  organization: Joi.string()
    .pattern(ORGANIZATION_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Organization name contains invalid characters',
      'any.required': 'Organization is required'
    }),
  title: Joi.string()
    .min(2)
    .max(100)
    .required(),
  phone: Joi.string()
    .pattern(PHONE_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),
  bio: Joi.string()
    .min(10)
    .max(2000)
    .required(),
  interests: Joi.array()
    .items(Joi.string().min(2).max(50))
    .min(1)
    .max(20)
    .required(),
  avatar: Joi.string()
    .uri()
    .allow(null)
}).required();

/**
 * Enhanced preferences validation schema with security settings
 */
const preferencesSchema = Joi.object<UserPreferences>({
  emailNotifications: Joi.boolean()
    .required(),
  theme: Joi.string()
    .valid('light', 'dark')
    .required(),
  language: Joi.string()
    .length(2)
    .required(),
  timezone: Joi.string()
    .required()
}).required();

/**
 * Enhanced security validation schema with MFA requirements
 */
const securitySchema = Joi.object<UserSecurity>({
  mfaEnabled: Joi.boolean()
    .when('role', {
      is: Joi.string().valid(UserRole.ADMIN, UserRole.TTO),
      then: Joi.valid(true).required(),
      otherwise: Joi.boolean().required()
    }),
  lastLogin: Joi.date()
    .allow(null),
  passwordChangedAt: Joi.date()
    .required()
}).required();

/**
 * Enhanced user creation validation schema with strict security rules
 */
export const createUserSchema = Joi.object<User>({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .required()
    .external(async (value) => {
      // Additional email validation could be performed here
      if (value.includes('+')) {
        throw new Error('Email aliases not allowed');
      }
      return value;
    }),
  name: Joi.string()
    .pattern(NAME_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Name contains invalid characters'
    }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
  profile: profileSchema,
  preferences: preferencesSchema,
  security: securitySchema,
}).options({
  abortEarly: false,
  stripUnknown: true
});

/**
 * Enhanced user update validation schema with role-based restrictions
 */
export const updateUserSchema = Joi.object<Partial<User>>({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .external(async (value) => {
      if (value.includes('+')) {
        throw new Error('Email aliases not allowed');
      }
      return value;
    }),
  name: Joi.string()
    .pattern(NAME_REGEX)
    .messages({
      'string.pattern.base': 'Name contains invalid characters'
    }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .external(async (value, helpers) => {
      const currentUser = helpers.prefs.context.currentUser;
      if (currentUser.role !== UserRole.ADMIN && value !== currentUser.role) {
        throw new Error('Insufficient permissions to change role');
      }
      return value;
    }),
  profile: profileSchema.optional(),
  preferences: preferencesSchema.optional(),
  security: securitySchema.optional(),
}).options({
  abortEarly: false,
  stripUnknown: true
});

/**
 * Enhanced profile update validation schema
 */
export const updateProfileSchema = Joi.object<Partial<UserProfile>>({
  organization: Joi.string()
    .pattern(ORGANIZATION_REGEX)
    .messages({
      'string.pattern.base': 'Organization name contains invalid characters'
    }),
  title: Joi.string()
    .min(2)
    .max(100),
  phone: Joi.string()
    .pattern(PHONE_REGEX)
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),
  bio: Joi.string()
    .min(10)
    .max(2000),
  interests: Joi.array()
    .items(Joi.string().min(2).max(50))
    .min(1)
    .max(20),
  avatar: Joi.string()
    .uri()
    .allow(null)
}).options({
  abortEarly: false,
  stripUnknown: true
});

/**
 * Enhanced preferences update validation schema
 */
export const updatePreferencesSchema = Joi.object<Partial<UserPreferences>>({
  emailNotifications: Joi.boolean(),
  theme: Joi.string()
    .valid('light', 'dark'),
  language: Joi.string()
    .length(2),
  timezone: Joi.string()
}).options({
  abortEarly: false,
  stripUnknown: true
});

/**
 * Validates user creation data with enhanced security checks
 * @param userData - User data to validate
 * @returns Promise resolving to validation result
 */
export async function validateCreateUser(userData: User): Promise<boolean> {
  const validationResult = await validateUser(userData);
  if (!validationResult.isValid) {
    throw new Error(
      `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
    );
  }
  return true;
}

/**
 * Validates user update data with role-based restrictions
 * @param userData - Partial user data to validate
 * @param currentUser - Current user performing the update
 * @returns Promise resolving to validation result
 */
export async function validateUpdateUser(
  userData: Partial<User>,
  currentUser: User
): Promise<boolean> {
  const validationResult = await validateUser({
    ...userData,
    role: currentUser.role // Preserve role for validation context
  });
  
  if (!validationResult.isValid) {
    throw new Error(
      `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
    );
  }
  return true;
}