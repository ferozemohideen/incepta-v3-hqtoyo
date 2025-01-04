/**
 * Validation Utilities
 * Version: 1.0.0
 * 
 * Comprehensive validation utilities for the Incepta platform implementing
 * enhanced security validation, form validation, and data structure validation.
 * @module validation.utils
 */

import { z } from 'zod'; // v3.22.0
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.4.0
import { LoginCredentials, RegisterCredentials } from '../interfaces/auth.interface';
import { UserRole, PASSWORD_POLICY } from '../constants/auth.constants';

// Initialize fingerprint generator
const fpPromise = FingerprintJS.load();

/**
 * Regular expressions for validation
 */
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_REGEX = new RegExp(
  `^(?=${PASSWORD_POLICY.REQUIRE_UPPERCASE ? '.*[A-Z]' : ''})` +
  `(?=${PASSWORD_POLICY.REQUIRE_NUMBERS ? '.*\\d' : ''})` +
  `(?=${PASSWORD_POLICY.REQUIRE_SPECIAL ? '.*[!@#$%^&*]' : ''})` +
  `[A-Za-z\\d!@#$%^&*]{${PASSWORD_POLICY.MIN_LENGTH},}$`
);
const IP_REGEX = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 300000; // 5 minutes in milliseconds

/**
 * Validation error class with enhanced error details
 */
class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Device fingerprint validation schema
 */
const deviceInfoSchema = z.object({
  userAgent: z.string().min(1),
  platform: z.string().min(1),
  version: z.string().min(1),
  fingerprint: z.string().min(1)
});

/**
 * Login credentials validation schema
 */
const loginSchema = z.object({
  email: z.string().email().regex(EMAIL_REGEX),
  password: z.string().regex(PASSWORD_REGEX),
  ipAddress: z.string().regex(IP_REGEX),
  deviceInfo: deviceInfoSchema
});

/**
 * Registration credentials validation schema
 */
const registrationSchema = z.object({
  email: z.string().email().regex(EMAIL_REGEX),
  password: z.string().regex(PASSWORD_REGEX),
  name: z.string().min(2).max(100),
  role: z.nativeEnum(UserRole),
  organization: z.string().min(2).max(200),
  organizationType: z.string().min(2).max(50),
  acceptedTerms: z.literal(true)
});

/**
 * User data validation schema
 */
const userDataSchema = z.object({
  profile: z.object({
    name: z.string().min(2).max(100),
    title: z.string().min(2).max(100),
    organization: z.string().min(2).max(200),
    bio: z.string().max(1000).optional(),
    avatar: z.string().url().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional()
  }),
  preferences: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    newsletterSubscription: z.boolean(),
    language: z.string().min(2).max(5),
    timezone: z.string().min(1),
    theme: z.enum(['light', 'dark', 'system'])
  }),
  security: z.object({
    mfaEnabled: z.boolean(),
    lastPasswordChange: z.string().datetime(),
    loginAlerts: z.boolean(),
    trustedDevices: z.array(deviceInfoSchema).max(5),
    ipWhitelist: z.array(z.string().regex(IP_REGEX)).optional()
  })
});

/**
 * Validates login credentials with enhanced security checks
 * @param credentials - Login credentials to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError if validation fails
 */
export async function validateLoginCredentials(
  credentials: LoginCredentials
): Promise<boolean> {
  try {
    // Validate basic schema
    loginSchema.parse(credentials);

    // Generate and validate device fingerprint
    const fp = await fpPromise;
    const result = await fp.get();
    
    if (result.visitorId !== credentials.deviceInfo.fingerprint) {
      throw new ValidationError(
        'Invalid device fingerprint',
        'deviceInfo',
        'INVALID_FINGERPRINT'
      );
    }

    // Check rate limiting (implementation would connect to rate limiting service)
    const rateLimitCheck = await checkRateLimit(credentials.ipAddress);
    if (!rateLimitCheck.allowed) {
      throw new ValidationError(
        'Rate limit exceeded',
        'ipAddress',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Log validation attempt for security monitoring
    await logValidationAttempt({
      type: 'login',
      email: credentials.email,
      ipAddress: credentials.ipAddress,
      deviceInfo: credentials.deviceInfo
    });

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        error.errors[0].path.join('.'),
        'SCHEMA_VALIDATION_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Validates registration data with organization validation
 * @param data - Registration data to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError if validation fails
 */
export async function validateRegistrationData(
  data: RegisterCredentials
): Promise<boolean> {
  try {
    // Validate basic schema
    registrationSchema.parse(data);

    // Validate organization against approved list
    const orgValidation = await validateOrganization(data.organization);
    if (!orgValidation.valid) {
      throw new ValidationError(
        'Invalid organization',
        'organization',
        'INVALID_ORGANIZATION'
      );
    }

    // Check for duplicate email
    const emailExists = await checkDuplicateEmail(data.email);
    if (emailExists) {
      throw new ValidationError(
        'Email already registered',
        'email',
        'DUPLICATE_EMAIL'
      );
    }

    // Validate role permissions
    if (!await validateRolePermissions(data.role)) {
      throw new ValidationError(
        'Invalid role assignment',
        'role',
        'INVALID_ROLE'
      );
    }

    // Log registration attempt
    await logValidationAttempt({
      type: 'registration',
      email: data.email,
      organization: data.organization,
      role: data.role
    });

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        error.errors[0].path.join('.'),
        'SCHEMA_VALIDATION_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Validates user data including profile, preferences, and security settings
 * @param userData - User data to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError if validation fails
 */
export async function validateUserData(
  userData: z.infer<typeof userDataSchema>
): Promise<boolean> {
  try {
    // Validate basic schema
    userDataSchema.parse(userData);

    // Validate organization if present in profile
    if (userData.profile.organization) {
      const orgValidation = await validateOrganization(userData.profile.organization);
      if (!orgValidation.valid) {
        throw new ValidationError(
          'Invalid organization',
          'profile.organization',
          'INVALID_ORGANIZATION'
        );
      }
    }

    // Validate trusted devices
    if (userData.security.trustedDevices.length > 0) {
      const fp = await fpPromise;
      const currentDevice = await fp.get();
      const validDevices = userData.security.trustedDevices.some(
        device => device.fingerprint === currentDevice.visitorId
      );
      if (!validDevices) {
        throw new ValidationError(
          'Current device not in trusted devices list',
          'security.trustedDevices',
          'INVALID_TRUSTED_DEVICE'
        );
      }
    }

    // Log validation attempt
    await logValidationAttempt({
      type: 'user_data_update',
      profile: userData.profile,
      security: {
        mfaEnabled: userData.security.mfaEnabled,
        loginAlerts: userData.security.loginAlerts
      }
    });

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        error.errors[0].path.join('.'),
        'SCHEMA_VALIDATION_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Checks rate limiting for an IP address
 * @param ipAddress - IP address to check
 * @returns Promise resolving to rate limit check result
 */
async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; remaining: number }> {
  // Implementation would connect to rate limiting service
  return { allowed: true, remaining: RATE_LIMIT_ATTEMPTS };
}

/**
 * Validates organization against approved list
 * @param organization - Organization name to validate
 * @returns Promise resolving to organization validation result
 */
async function validateOrganization(
  organization: string
): Promise<{ valid: boolean; details?: string }> {
  // Implementation would connect to organization validation service
  return { valid: true };
}

/**
 * Checks for duplicate email addresses
 * @param email - Email to check
 * @returns Promise resolving to boolean indicating if email exists
 */
async function checkDuplicateEmail(email: string): Promise<boolean> {
  // Implementation would connect to user service
  return false;
}

/**
 * Validates role permissions
 * @param role - Role to validate
 * @returns Promise resolving to boolean indicating if role is valid
 */
async function validateRolePermissions(role: UserRole): Promise<boolean> {
  // Implementation would connect to authorization service
  return true;
}

/**
 * Logs validation attempts for security monitoring
 * @param data - Validation attempt data to log
 * @returns Promise resolving when logging is complete
 */
async function logValidationAttempt(data: Record<string, any>): Promise<void> {
  // Implementation would connect to logging service
  console.log('Validation attempt:', data);
}