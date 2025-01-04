/**
 * Authentication Constants
 * Version: 1.0.0
 * 
 * Defines core authentication configuration and constants for the Incepta platform.
 * Implements secure authentication flows with OAuth 2.0 + JWT and MFA support.
 * @module auth.constants
 */

/**
 * Enum defining user roles with strict type safety.
 * Used for role-based access control (RBAC) throughout the application.
 */
export enum UserRole {
  ADMIN = 'admin',
  TTO = 'tto',
  ENTREPRENEUR = 'entrepreneur',
  RESEARCHER = 'researcher',
  GUEST = 'guest'
}

/**
 * Authentication API endpoints with comprehensive MFA support.
 * All paths are relative to the API base URL.
 * @constant
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_MFA: '/auth/mfa/verify',
  SETUP_MFA: '/auth/mfa/setup',
  DISABLE_MFA: '/auth/mfa/disable'
} as const;

/**
 * JWT token configuration with secure defaults.
 * Implements token rotation and version control.
 * 
 * ACCESS_TOKEN_EXPIRY: 1 hour in seconds
 * REFRESH_TOKEN_EXPIRY: 7 days in seconds
 * ROTATION_WINDOW: 5 minutes in seconds before expiry
 * @constant
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 3600,
  REFRESH_TOKEN_EXPIRY: 604800,
  TOKEN_TYPE: 'Bearer',
  TOKEN_VERSION: 'v1',
  ROTATION_WINDOW: 300
} as const;

/**
 * Secure storage keys for authentication data.
 * Uses prefixed keys to avoid naming conflicts.
 * Implements activity tracking for security monitoring.
 * @constant
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: '_incepta_at',
  REFRESH_TOKEN: '_incepta_rt',
  USER_ROLE: '_incepta_role',
  MFA_ENABLED: '_incepta_mfa',
  LAST_ACTIVE: '_incepta_last',
  DEVICE_ID: '_incepta_device',
  MFA_STATUS: '_incepta_mfa_status'
} as const;

/**
 * Password policy configuration enforcing strong security requirements.
 * Follows NIST 800-63B guidelines for password complexity.
 * @constant
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true
} as const;

/**
 * Type guard to check if a string is a valid UserRole
 * @param role - Role string to validate
 * @returns boolean indicating if role is valid
 */
export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

/**
 * Type definitions for authentication state
 */
export type AuthState = {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  mfaEnabled: boolean;
  lastActive: number;
};

/**
 * Type definitions for token payload
 */
export type TokenPayload = {
  sub: string;
  role: UserRole;
  version: string;
  mfa: boolean;
  exp: number;
  iat: number;
};