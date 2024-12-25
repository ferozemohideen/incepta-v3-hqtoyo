/**
 * @fileoverview Enhanced JWT (JSON Web Token) authentication library
 * Implements secure token generation, verification, and management with advanced security features
 * @version 1.0.0
 */

import { sign, verify, SignOptions, VerifyOptions } from 'jsonwebtoken'; // v9.0.0
import { createClient } from 'redis'; // v4.6.7
import { JWTPayload } from '../../interfaces/auth.interface';
import { authConfig } from '../../config/auth.config';
import { AuthenticationError } from '../../utils/errors';
import { ErrorCodes } from '../../constants/errorCodes';
import { HTTP_STATUS } from '../../constants/statusCodes';

// Initialize Redis client for token blacklist
const redisClient = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

/**
 * Default JWT sign options with enhanced security
 */
const DEFAULT_SIGN_OPTIONS: SignOptions = {
  algorithm: 'RS256', // Use RSA with SHA-256
  expiresIn: authConfig.jwtExpiresIn,
  issuer: 'Incepta Platform',
  audience: 'incepta.io',
  notBefore: '0s', // Token valid immediately
};

/**
 * Default JWT verify options with strict validation
 */
const DEFAULT_VERIFY_OPTIONS: VerifyOptions = {
  algorithms: ['RS256'], // Only allow RSA with SHA-256
  issuer: 'Incepta Platform',
  audience: 'incepta.io',
  complete: true, // Return decoded header and payload
};

/**
 * Generates a new JWT token with enhanced security features
 * @param payload - Token payload with user and security metadata
 * @param options - Optional signing options to override defaults
 * @returns Signed JWT token
 * @throws AuthenticationError if token generation fails
 */
export async function generateToken(
  payload: JWTPayload,
  options: SignOptions = {}
): Promise<string> {
  try {
    // Validate required payload fields
    if (!payload.userId || !payload.email || !payload.role) {
      throw new AuthenticationError(
        'Invalid token payload',
        { context: 'generateToken', source: 'jwt.ts' }
      );
    }

    // Add security metadata
    const enhancedPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // Unique token ID
    };

    // Merge options with defaults
    const signOptions = {
      ...DEFAULT_SIGN_OPTIONS,
      ...options,
    };

    // Generate token
    const token = sign(
      enhancedPayload,
      authConfig.jwtSecret,
      signOptions
    );

    // Log token generation for audit (implement proper logging)
    console.info(`Token generated for user ${payload.userId}`);

    return token;
  } catch (error) {
    throw new AuthenticationError(
      'Token generation failed',
      {
        context: 'generateToken',
        source: 'jwt.ts',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * Verifies and decodes a JWT token with comprehensive security checks
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws AuthenticationError if token is invalid or verification fails
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    // Check token blacklist
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError(
        'Token has been revoked',
        { context: 'verifyToken', source: 'jwt.ts' }
      );
    }

    // Verify token signature and expiration
    const decoded = verify(
      token,
      authConfig.jwtSecret,
      DEFAULT_VERIFY_OPTIONS
    );

    // Type guard for decoded payload
    if (typeof decoded === 'string' || !decoded.payload) {
      throw new AuthenticationError(
        'Invalid token format',
        { context: 'verifyToken', source: 'jwt.ts' }
      );
    }

    // Extract payload
    const payload = decoded.payload as JWTPayload;

    // Validate payload structure
    if (!payload.userId || !payload.email || !payload.role) {
      throw new AuthenticationError(
        'Invalid token payload',
        { context: 'verifyToken', source: 'jwt.ts' }
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      'Token verification failed',
      {
        context: 'verifyToken',
        source: 'jwt.ts',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * Refreshes a JWT token while maintaining security context
 * @param token - Current valid JWT token
 * @returns New JWT token
 * @throws AuthenticationError if refresh fails
 */
export async function refreshToken(token: string): Promise<string> {
  try {
    // Verify current token
    const payload = await verifyToken(token);

    // Generate new token with updated expiration
    const newToken = await generateToken(payload);

    // Blacklist old token
    await redisClient.set(
      `blacklist:${token}`,
      'true',
      {
        EX: 24 * 60 * 60 // 24 hours
      }
    );

    return newToken;
  } catch (error) {
    throw new AuthenticationError(
      'Token refresh failed',
      {
        context: 'refreshToken',
        source: 'jwt.ts',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * Revokes a JWT token by adding it to the blacklist
 * @param token - JWT token to revoke
 * @throws AuthenticationError if revocation fails
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    await redisClient.set(
      `blacklist:${token}`,
      'true',
      {
        EX: 24 * 60 * 60 // 24 hours
      }
    );
  } catch (error) {
    throw new AuthenticationError(
      'Token revocation failed',
      {
        context: 'revokeToken',
        source: 'jwt.ts',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}