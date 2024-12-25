/**
 * @fileoverview Authentication Request Validator
 * Implements comprehensive validation for authentication-related requests with
 * enhanced security features including MFA, input sanitization, and threat detection.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import xss from 'xss'; // v1.0.14
import validator from 'validator'; // v13.9.0
import { LoginRequest, RefreshTokenRequest } from '../../interfaces/auth.interface';

// Security Constants
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,64}$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MFA_TOKEN_LENGTH = 6;
const DEVICE_FINGERPRINT_LENGTH = 64;
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Enhanced Joi validation schema for login requests
 * Implements strict validation rules with security best practices
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .pattern(EMAIL_PATTERN)
    .max(255)
    .custom((value, helpers) => {
      const sanitized = xss(value.trim().toLowerCase());
      if (!validator.isEmail(sanitized)) {
        return helpers.error('Invalid email format');
      }
      return sanitized;
    }),

  password: Joi.string()
    .required()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .pattern(PASSWORD_PATTERN)
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      'string.max': `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`
    }),

  mfaToken: Joi.string()
    .length(MFA_TOKEN_LENGTH)
    .pattern(/^[0-9]+$/)
    .optional()
    .messages({
      'string.length': `MFA token must be exactly ${MFA_TOKEN_LENGTH} digits`,
      'string.pattern.base': 'MFA token must contain only numbers'
    }),

  deviceFingerprint: Joi.string()
    .required()
    .length(DEVICE_FINGERPRINT_LENGTH)
    .pattern(/^[a-f0-9]+$/)
    .messages({
      'string.length': 'Invalid device fingerprint length',
      'string.pattern.base': 'Invalid device fingerprint format'
    }),

  clientId: Joi.string()
    .optional()
    .pattern(/^[A-Za-z0-9_-]+$/),

  clientSecret: Joi.string()
    .optional()
    .when('clientId', {
      is: Joi.exist(),
      then: Joi.required()
    }),

  grantType: Joi.string()
    .valid('password', 'refresh_token')
    .default('password'),

  scope: Joi.array()
    .items(Joi.string())
    .optional()
});

/**
 * Enhanced Joi validation schema for refresh token requests
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    .messages({
      'string.pattern.base': 'Invalid refresh token format'
    }),

  deviceFingerprint: Joi.string()
    .required()
    .length(DEVICE_FINGERPRINT_LENGTH)
    .pattern(/^[a-f0-9]+$/)
});

/**
 * Enhanced Joi validation schema for MFA setup
 */
export const mfaSetupSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/),

  secret: Joi.string()
    .required()
    .pattern(/^[A-Z2-7]{32}$/),

  verificationCode: Joi.string()
    .required()
    .length(MFA_TOKEN_LENGTH)
    .pattern(/^[0-9]+$/),

  backupCodes: Joi.array()
    .items(
      Joi.string()
        .length(8)
        .pattern(/^[A-Z0-9]+$/)
    )
    .length(10)
    .optional()
});

/**
 * Validates login request data with enhanced security checks
 * @param data LoginRequest data to validate
 * @returns Promise<boolean>
 * @throws ValidationError with detailed message if validation fails
 */
export async function validateLoginRequest(data: LoginRequest): Promise<boolean> {
  try {
    // Sanitize input data
    const sanitizedData = {
      ...data,
      email: xss(data.email.trim().toLowerCase()),
      password: data.password, // Don't sanitize password
      mfaToken: data.mfaToken ? xss(data.mfaToken.trim()) : undefined,
      deviceFingerprint: xss(data.deviceFingerprint.trim())
    };

    // Validate against schema
    await loginSchema.validateAsync(sanitizedData, { abortEarly: false });

    // Additional security checks
    if (!validator.isStrongPassword(sanitizedData.password, {
      minLength: PASSWORD_MIN_LENGTH,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })) {
      throw new Error('Password does not meet security requirements');
    }

    return true;
  } catch (error) {
    throw new Error(`Login validation failed: ${error.message}`);
  }
}

/**
 * Validates refresh token request with security enhancements
 * @param data RefreshTokenRequest data to validate
 * @returns Promise<boolean>
 * @throws ValidationError with detailed message if validation fails
 */
export async function validateRefreshToken(data: RefreshTokenRequest): Promise<boolean> {
  try {
    // Sanitize input data
    const sanitizedData = {
      refreshToken: xss(data.refreshToken.trim()),
      deviceFingerprint: xss(data.deviceFingerprint.trim())
    };

    // Validate against schema
    await refreshTokenSchema.validateAsync(sanitizedData, { abortEarly: false });

    // Additional JWT format validation
    const tokenParts = sanitizedData.refreshToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid refresh token format');
    }

    return true;
  } catch (error) {
    throw new Error(`Refresh token validation failed: ${error.message}`);
  }
}

/**
 * Validates MFA setup request with enhanced security
 * @param setupData MFA setup data to validate
 * @returns Promise<boolean>
 * @throws ValidationError with detailed message if validation fails
 */
export async function validateMFASetup(setupData: any): Promise<boolean> {
  try {
    // Sanitize input data
    const sanitizedData = {
      userId: xss(setupData.userId.trim()),
      secret: setupData.secret.trim(),
      verificationCode: xss(setupData.verificationCode.trim()),
      backupCodes: setupData.backupCodes?.map((code: string) => xss(code.trim()))
    };

    // Validate against schema
    await mfaSetupSchema.validateAsync(sanitizedData, { abortEarly: false });

    // Additional validation for TOTP secret strength
    if (!validator.isBase32(sanitizedData.secret)) {
      throw new Error('Invalid TOTP secret format');
    }

    return true;
  } catch (error) {
    throw new Error(`MFA setup validation failed: ${error.message}`);
  }
}

/**
 * Helper function to check for common security threats in input
 * @param input String to check for threats
 * @returns boolean indicating if input contains threats
 */
export function containsSecurityThreats(input: string): boolean {
  const threatPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /(\b)(on\S+)(\s*)=/gi, // Event handlers
    /(javascript|vbscript|expression)\s*:/gi, // JavaScript injection
    /document\./gi, // DOM manipulation
    /alert\(.*?\)/gi, // Alert attempts
    /eval\((.*?)\)/gi // Eval attempts
  ];

  return threatPatterns.some(pattern => pattern.test(input));
}

/**
 * Helper function to validate password against common password lists
 * @param password Password to validate
 * @returns Promise<boolean>
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  // Implementation would typically call an API like HaveIBeenPwned
  // This is a placeholder implementation
  const commonPasswords = [
    'password123',
    'admin123',
    '12345678',
    'qwerty123'
  ];
  return commonPasswords.includes(password);
}