/**
 * Authentication Utilities
 * Version: 1.0.0
 * 
 * Advanced utility functions for handling authentication, token management,
 * role validation, and security checks with OAuth 2.0 + JWT support.
 * @module auth.utils
 */

import jwtDecode from 'jwt-decode'; // v3.1.2
import { LoginCredentials, AuthTokens } from '../interfaces/auth.interface';
import { UserRole, AUTH_STORAGE_KEYS, TokenPayload, isValidUserRole } from '../constants/auth.constants';
import { getLocalStorageItem, setLocalStorageItem } from './storage.utils';

// Configuration constants
const AUTH_CONFIG = {
  TOKEN_GRACE_PERIOD: 300, // 5 minutes in seconds
  ROLE_CACHE_DURATION: 300000, // 5 minutes in milliseconds
  MFA_REQUIRED: true,
  DEVICE_BINDING: true,
} as const;

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4,
  [UserRole.TTO]: 3,
  [UserRole.ENTREPRENEUR]: 2,
  [UserRole.RESEARCHER]: 2,
  [UserRole.GUEST]: 1,
};

/**
 * Enhanced authentication check with MFA validation and device binding
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = (): boolean => {
  try {
    const accessToken = getLocalStorageItem<string>(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    const deviceId = getLocalStorageItem<string>(AUTH_STORAGE_KEYS.DEVICE_ID);
    const mfaVerified = getLocalStorageItem<boolean>(AUTH_STORAGE_KEYS.MFA_STATUS);

    if (!accessToken || !deviceId) {
      return false;
    }

    // Validate token format and structure
    if (!accessToken.split('.').length === 3) {
      return false;
    }

    // Check token expiration with grace period
    if (isTokenExpired(accessToken)) {
      return false;
    }

    // Verify device binding
    const decodedToken = parseJwt<TokenPayload>(accessToken);
    if (AUTH_CONFIG.DEVICE_BINDING && decodedToken.deviceId !== deviceId) {
      return false;
    }

    // Verify MFA if required
    if (AUTH_CONFIG.MFA_REQUIRED && !mfaVerified) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
};

/**
 * Gets and validates current user's role with caching
 * @returns {UserRole | null} Validated user role or null
 */
export const getUserRole = (): UserRole | null => {
  try {
    const cachedRole = getLocalStorageItem<{ role: UserRole; timestamp: number }>(
      AUTH_STORAGE_KEYS.USER_ROLE
    );

    // Check cache validity
    if (
      cachedRole &&
      Date.now() - cachedRole.timestamp < AUTH_CONFIG.ROLE_CACHE_DURATION
    ) {
      return cachedRole.role;
    }

    const accessToken = getLocalStorageItem<string>(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!accessToken) {
      return null;
    }

    const decodedToken = parseJwt<TokenPayload>(accessToken);
    if (!decodedToken || !isValidUserRole(decodedToken.role)) {
      return null;
    }

    // Cache the validated role
    setLocalStorageItem(AUTH_STORAGE_KEYS.USER_ROLE, {
      role: decodedToken.role,
      timestamp: Date.now(),
    });

    return decodedToken.role;
  } catch (error) {
    console.error('Role validation failed:', error);
    return null;
  }
};

/**
 * Advanced permission checker with role hierarchy support
 * @param {UserRole} requiredRole - Minimum required role
 * @returns {boolean} Permission status
 */
export const hasPermission = (requiredRole: UserRole): boolean => {
  try {
    const currentRole = getUserRole();
    if (!currentRole) {
      return false;
    }

    const currentRoleLevel = ROLE_HIERARCHY[currentRole];
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

    return currentRoleLevel >= requiredRoleLevel;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

/**
 * Secure JWT token parser with comprehensive validation
 * @param {string} token - JWT token to parse
 * @returns {T} Decoded token payload
 * @throws {Error} If token is invalid
 */
export const parseJwt = <T extends object>(token: string): T => {
  try {
    // Basic structure validation
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      throw new Error('Invalid token format');
    }

    // Decode token with validation
    const decoded = jwtDecode<T>(token);
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid token payload');
    }

    return decoded;
  } catch (error) {
    console.error('Token parsing failed:', error);
    throw error;
  }
};

/**
 * Enhanced token expiration checker with grace period
 * @param {string} token - JWT token to check
 * @returns {boolean} Expiration status
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = parseJwt<TokenPayload>(token);
    if (!decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = decoded.exp - AUTH_CONFIG.TOKEN_GRACE_PERIOD;

    return currentTime >= expirationTime;
  } catch (error) {
    console.error('Token expiration check failed:', error);
    return true;
  }
};

/**
 * Validates token claims and security requirements
 * @param {TokenPayload} payload - Decoded token payload
 * @returns {boolean} Validation status
 */
const validateTokenClaims = (payload: TokenPayload): boolean => {
  return !!(
    payload.sub &&
    payload.role &&
    payload.version &&
    typeof payload.mfa === 'boolean' &&
    payload.exp &&
    payload.iat
  );
};

/**
 * Type guard for AuthTokens interface
 * @param {unknown} tokens - Potential AuthTokens object
 * @returns {boolean} Type validation result
 */
export const isAuthTokens = (tokens: unknown): tokens is AuthTokens => {
  return !!(
    tokens &&
    typeof tokens === 'object' &&
    'accessToken' in tokens &&
    'refreshToken' in tokens &&
    'expiresIn' in tokens
  );
};