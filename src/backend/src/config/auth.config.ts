/**
 * Authentication Configuration Module
 * Defines core authentication settings for JWT, OAuth 2.0, and MFA
 * @module config/auth.config
 * @version 1.0.0
 */

import { config as dotenvConfig } from 'dotenv'; // v16.3.1
import { z } from 'zod'; // v3.22.2
import { AuthConfig } from '../interfaces/config.interface';

// Load environment variables
dotenvConfig();

/**
 * Required environment variables for authentication configuration
 */
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'OAUTH_CLIENT_ID',
  'OAUTH_CLIENT_SECRET',
  'OAUTH_CALLBACK_URL',
  'MFA_ISSUER'
] as const;

/**
 * Zod schema for runtime authentication configuration validation
 */
const AUTH_CONFIG_SCHEMA = z.object({
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiresIn: z.string().regex(/^\d+[hdwmy]$/, 'Invalid JWT expiration format'),
  oauth: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    callbackUrl: z.string().url('Invalid OAuth callback URL'),
    providers: z.array(z.enum(['google', 'github'])),
    scopes: z.array(z.string())
  }),
  mfa: z.object({
    enabled: z.boolean(),
    issuer: z.string().min(1),
    algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']),
    digits: z.number().int().min(6).max(8),
    period: z.number().int().min(30).max(60)
  }),
  session: z.object({
    maxAge: z.string().regex(/^\d+[hdwmy]$/, 'Invalid session max age format'),
    secure: z.boolean(),
    sameSite: z.enum(['strict', 'lax', 'none'])
  })
});

/**
 * Validates the authentication configuration
 * @param config - Partial authentication configuration
 * @throws {Error} If configuration validation fails
 */
function validateConfig(config: Partial<AuthConfig>): boolean {
  // Check required environment variables
  const missingVars = REQUIRED_ENV_VARS.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  try {
    AUTH_CONFIG_SCHEMA.parse(config);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Authentication configuration validation failed: ${error.errors
          .map((e) => e.message)
          .join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Loads and validates authentication configuration
 * @returns {Readonly<AuthConfig>} Immutable authentication configuration
 * @throws {Error} If configuration loading or validation fails
 */
function loadAuthConfig(): Readonly<AuthConfig> {
  const config: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    oauth: {
      clientId: process.env.OAUTH_CLIENT_ID!,
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      callbackUrl: process.env.OAUTH_CALLBACK_URL!,
      providers: ['google', 'github'],
      scopes: ['profile', 'email']
    },
    mfa: {
      enabled: process.env.MFA_ENABLED === 'true',
      issuer: process.env.MFA_ISSUER || 'Incepta',
      algorithm: 'SHA256',
      digits: 6,
      period: 30
    },
    session: {
      maxAge: process.env.SESSION_MAX_AGE || '24h',
      secure: true,
      sameSite: 'strict'
    }
  };

  // Validate configuration
  validateConfig(config);

  // Apply security hardening
  Object.defineProperties(config, {
    jwtSecret: {
      enumerable: false, // Hide JWT secret from object enumeration
      writable: false
    },
    oauth: {
      writable: false
    }
  });

  return Object.freeze(config);
}

/**
 * Exported immutable authentication configuration
 * @type {Readonly<AuthConfig>}
 */
export const authConfig: Readonly<AuthConfig> = loadAuthConfig();

/**
 * Export individual configuration properties for convenience
 */
export const {
  jwtSecret,
  jwtExpiresIn,
  oauth,
  mfa,
  session
} = authConfig;