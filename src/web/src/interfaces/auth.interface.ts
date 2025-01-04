/**
 * Authentication Interfaces
 * Version: 1.0.0
 * 
 * Defines TypeScript interfaces for authentication-related data structures
 * implementing OAuth 2.0 + JWT with MFA support for the Incepta platform.
 * @module auth.interface
 */

import { UserRole } from '../constants/auth.constants';

/**
 * Interface defining secure login request payload with additional security context
 * for enhanced authentication tracking and security monitoring.
 */
export interface LoginCredentials {
  /** User's email address for authentication */
  email: string;
  /** User's password - must meet PASSWORD_POLICY requirements */
  password: string;
  /** Client IP address for security logging and rate limiting */
  ipAddress: string;
  /** Device information for security context and session management */
  deviceInfo: {
    /** Browser user agent string */
    userAgent: string;
    /** Device platform (e.g., web, mobile) */
    platform: string;
    /** Browser/app version */
    version: string;
    /** Device fingerprint for fraud detection */
    fingerprint: string;
  };
}

/**
 * Interface defining comprehensive user registration data with organizational context
 * for role-based access control and institutional affiliations.
 */
export interface RegisterCredentials {
  /** User's email address for account creation */
  email: string;
  /** User's password - must meet PASSWORD_POLICY requirements */
  password: string;
  /** User's full name */
  name: string;
  /** User's role in the system for RBAC */
  role: UserRole;
  /** User's affiliated organization name */
  organization: string;
  /** Type of organization (e.g., university, company, research lab) */
  organizationType: string;
  /** Terms and conditions acceptance flag */
  acceptedTerms: boolean;
}

/**
 * Interface for JWT authentication tokens with enhanced security metadata
 * implementing secure token rotation and version control.
 */
export interface AuthTokens {
  /** JWT access token for API authentication */
  accessToken: string;
  /** JWT refresh token for token rotation */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Token type (e.g., 'Bearer') */
  tokenType: string;
  /** Array of granted authorization scopes */
  scope: string[];
}

/**
 * Interface for multi-factor authentication with support for multiple MFA methods
 * including TOTP and backup codes.
 */
export interface MFACredentials {
  /** MFA verification token (e.g., TOTP code) */
  token: string;
  /** Temporary token from initial authentication */
  tempToken: string;
  /** MFA method type (e.g., 'totp', 'backup') */
  method: string;
  /** Unique verification request identifier */
  verificationId: string;
}

/**
 * Interface for secure password reset flow with confirmation
 * implementing NIST password reset guidelines.
 */
export interface ResetPasswordCredentials {
  /** User's email address for password reset */
  email: string;
  /** Password reset verification token */
  token: string;
  /** New password - must meet PASSWORD_POLICY requirements */
  newPassword: string;
  /** Password confirmation for validation */
  confirmPassword: string;
}

/**
 * Interface defining authentication error structure for consistent
 * error handling across the authentication system.
 */
export interface AuthError {
  /** Error code for programmatic error handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code associated with the error */
  status: number;
  /** Additional error details for debugging */
  details?: Record<string, unknown>;
  /** Timestamp when the error occurred */
  timestamp: number;
}