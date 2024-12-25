/**
 * Authentication Configuration
 * Version: 1.0.0
 * 
 * Comprehensive authentication configuration implementing OAuth 2.0 + JWT with MFA
 * support and enhanced security features for the Incepta platform.
 * @module auth.config
 */

// @auth0/auth0-spa-js v2.1.0
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AuthTokens } from '../interfaces/auth.interface';
import { UserRole, PASSWORD_POLICY } from '../constants/auth.constants';

/**
 * Interface for comprehensive authentication configuration
 */
interface AuthConfig {
  auth0: {
    domain: string;
    clientId: string;
    audience: string;
    redirectUri: string;
    scope: string;
    responseType: string;
    codeVerifier: boolean;
    usePKCE: boolean;
  };
  jwt: {
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
    tokenType: string;
    issuer: string;
    algorithm: string;
    rotationWindow: number;
    clockTolerance: number;
    maxTokenAge: number;
  };
  mfa: {
    enabled: boolean;
    provider: string;
    issuer: string;
    codeLength: number;
    validityWindow: number;
    backupCodesCount: number;
    maxAttempts: number;
    cooldownPeriod: number;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      requireUppercase: boolean;
      maxAge: number;
    };
    sessionManagement: {
      maxConcurrentSessions: number;
      inactivityTimeout: number;
      absoluteTimeout: number;
    };
    rateLimit: {
      loginAttempts: number;
      windowMs: number;
      blockDuration: number;
    };
  };
}

/**
 * Comprehensive authentication configuration with enhanced security settings
 * Implements OAuth 2.0 + JWT with MFA support and strict security policies
 */
export const authConfig: AuthConfig = {
  // Auth0 Configuration
  auth0: {
    domain: process.env.VITE_AUTH0_DOMAIN || '',
    clientId: process.env.VITE_AUTH0_CLIENT_ID || '',
    audience: process.env.VITE_AUTH0_AUDIENCE || '',
    redirectUri: window.location.origin,
    scope: 'openid profile email',
    responseType: 'code',
    codeVerifier: true,
    usePKCE: true, // Enhanced security with PKCE
  },

  // JWT Configuration
  jwt: {
    accessTokenExpiry: 3600, // 1 hour
    refreshTokenExpiry: 604800, // 7 days
    tokenType: 'Bearer',
    issuer: 'incepta-platform',
    algorithm: 'RS256', // Asymmetric signing
    rotationWindow: 300, // 5 minutes before expiry
    clockTolerance: 60, // 1 minute clock skew tolerance
    maxTokenAge: 86400, // 24 hours maximum token age
  },

  // Multi-Factor Authentication Configuration
  mfa: {
    enabled: true,
    provider: 'google-authenticator',
    issuer: 'Incepta Platform',
    codeLength: 6,
    validityWindow: 30, // 30 seconds TOTP window
    backupCodesCount: 10,
    maxAttempts: 3,
    cooldownPeriod: 300, // 5 minutes cooldown after max attempts
  },

  // Enhanced Security Configuration
  security: {
    passwordPolicy: {
      minLength: 12,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true,
      maxAge: 90, // 90 days password rotation
    },
    sessionManagement: {
      maxConcurrentSessions: 3,
      inactivityTimeout: 900, // 15 minutes
      absoluteTimeout: 28800, // 8 hours
    },
    rateLimit: {
      loginAttempts: 5,
      windowMs: 900000, // 15 minutes
      blockDuration: 3600000, // 1 hour block after max attempts
    },
  },
};

/**
 * Creates and configures an Auth0 client instance with enhanced security settings
 * @returns Configured Auth0 client instance
 */
export const createAuth0Client = async (): Promise<Auth0Client> => {
  return await new Auth0Client({
    domain: authConfig.auth0.domain,
    clientId: authConfig.auth0.clientId,
    authorizationParams: {
      audience: authConfig.auth0.audience,
      redirect_uri: authConfig.auth0.redirectUri,
      scope: authConfig.auth0.scope,
    },
    useRefreshTokens: true,
    cacheLocation: 'memory', // More secure than localStorage
    useRefreshTokensFallback: false, // Enforce refresh token rotation
  });
};

/**
 * Role-based access configuration mapping
 * Defines permitted actions for each user role
 */
export const rolePermissions: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'], // Full access
  [UserRole.TTO]: [
    'technology.manage',
    'licensing.manage',
    'communications.manage',
  ],
  [UserRole.ENTREPRENEUR]: [
    'technology.view',
    'technology.contact',
    'grants.apply',
  ],
  [UserRole.RESEARCHER]: [
    'research.manage',
    'technology.submit',
    'publications.manage',
  ],
  [UserRole.GUEST]: [
    'technology.view',
    'public.access',
  ],
};

/**
 * Validates authentication tokens against security requirements
 * @param tokens - Authentication tokens to validate
 * @returns boolean indicating if tokens are valid
 */
export const validateTokens = (tokens: AuthTokens): boolean => {
  if (!tokens.accessToken || !tokens.refreshToken) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return tokens.expiresIn > now + authConfig.jwt.rotationWindow;
};

/**
 * Security utility to sanitize authentication errors
 * Prevents information disclosure in error messages
 * @param error - Original error object
 * @returns Sanitized error message
 */
export const sanitizeAuthError = (error: Error): string => {
  // Generic error messages for security
  const genericErrors: Record<string, string> = {
    'invalid_grant': 'Authentication failed',
    'invalid_token': 'Session expired',
    'login_required': 'Please log in again',
  };

  return genericErrors[error.message] || 'An authentication error occurred';
};

export default authConfig;