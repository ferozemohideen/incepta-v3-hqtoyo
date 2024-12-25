/**
 * @fileoverview Main authentication module for the Incepta platform
 * Implements comprehensive authentication functionality with JWT, OAuth 2.0,
 * MFA, rate limiting, audit logging, and security monitoring.
 * @version 1.0.0
 */

import { generateToken, verifyToken, refreshToken } from './jwt';
import { OAuthClient } from './oauth';
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.0.0
import { createLogger } from 'winston'; // v3.8.0
import { AuthenticationClient } from 'auth0'; // v3.0.0
import { AuthenticationError } from '../../utils/errors';
import { JWTPayload, LoginRequest, MFAVerifyRequest } from '../../interfaces/auth.interface';
import { authConfig } from '../../config/auth.config';
import Redis from 'ioredis';

/**
 * Security utility functions for authentication
 */
export const SecurityUtils = {
  /**
   * Validates MFA status and requirements for a user
   */
  async checkMFAStatus(userId: string): Promise<boolean> {
    try {
      const auth0Client = new AuthenticationClient({
        domain: authConfig.oauth.domain,
        clientId: authConfig.oauth.clientId,
        clientSecret: authConfig.oauth.clientSecret
      });

      const userInfo = await auth0Client.getUser({ id: userId });
      return userInfo.multifactor?.length > 0 || false;
    } catch (error) {
      throw new AuthenticationError('MFA status check failed', {
        context: 'checkMFAStatus',
        userId
      });
    }
  },

  /**
   * Validates device fingerprint against known devices
   */
  async validateDeviceFingerprint(
    userId: string,
    fingerprint: string
  ): Promise<boolean> {
    try {
      const redis = new Redis(authConfig.redis);
      const knownDevices = await redis.smembers(`user:${userId}:devices`);
      return knownDevices.includes(fingerprint);
    } catch (error) {
      throw new AuthenticationError('Device validation failed', {
        context: 'validateDeviceFingerprint',
        userId
      });
    }
  },

  /**
   * Checks IP address against security rules and blacklists
   */
  async checkIPSecurity(ipAddress: string): Promise<boolean> {
    try {
      const redis = new Redis(authConfig.redis);
      const isBlacklisted = await redis.sismember('ip:blacklist', ipAddress);
      if (isBlacklisted) {
        throw new AuthenticationError('IP address blocked', {
          context: 'checkIPSecurity',
          ipAddress
        });
      }
      return true;
    } catch (error) {
      throw new AuthenticationError('IP security check failed', {
        context: 'checkIPSecurity',
        ipAddress
      });
    }
  }
};

/**
 * Authentication manager class that handles all authentication operations
 */
export class AuthenticationManager {
  private rateLimiter: RateLimiterRedis;
  private oauthClient: OAuthClient;
  private logger: ReturnType<typeof createLogger>;
  private redis: Redis;

  constructor() {
    // Initialize rate limiter
    this.redis = new Redis(authConfig.redis);
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'auth_ratelimit',
      points: 5, // Number of attempts
      duration: 60 // Per minute
    });

    // Initialize OAuth client
    this.oauthClient = new OAuthClient();

    // Initialize logger
    this.logger = createLogger({
      level: 'info',
      format: /* winston format configuration */
      transports: [/* winston transport configuration */]
    });
  }

  /**
   * Handles user authentication with comprehensive security checks
   */
  public async authenticate(
    credentials: LoginRequest
  ): Promise<{ token: string; requiresMFA: boolean }> {
    try {
      // Check rate limits
      await this.rateLimiter.consume(credentials.deviceFingerprint);

      // Validate IP security
      await SecurityUtils.checkIPSecurity(credentials.ipAddress);

      // Validate device fingerprint
      const isKnownDevice = await SecurityUtils.validateDeviceFingerprint(
        credentials.email,
        credentials.deviceFingerprint
      );

      // Get OAuth tokens and user profile
      const securityContext = {
        ipAddress: credentials.ipAddress,
        deviceFingerprint: credentials.deviceFingerprint,
        userAgent: credentials.userAgent
      };

      const jwtPayload = await this.oauthClient.handleCallback(
        credentials.code,
        credentials.state,
        securityContext
      );

      // Check MFA requirement
      const requiresMFA = await SecurityUtils.checkMFAStatus(jwtPayload.userId);
      if (requiresMFA && !credentials.mfaToken) {
        return { token: '', requiresMFA: true };
      }

      // Generate JWT token with security context
      const token = await generateToken(jwtPayload, {
        audience: authConfig.oauth.audience,
        issuer: authConfig.oauth.issuer
      });

      // Log successful authentication
      this.logger.info('Authentication successful', {
        userId: jwtPayload.userId,
        deviceFingerprint: credentials.deviceFingerprint,
        ipAddress: credentials.ipAddress,
        isKnownDevice
      });

      return { token, requiresMFA };
    } catch (error) {
      // Log authentication failure
      this.logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceFingerprint: credentials.deviceFingerprint,
        ipAddress: credentials.ipAddress
      });

      throw new AuthenticationError('Authentication failed', {
        context: 'authenticate',
        deviceFingerprint: credentials.deviceFingerprint
      });
    }
  }

  /**
   * Verifies MFA token during authentication
   */
  public async verifyMFA(request: MFAVerifyRequest): Promise<boolean> {
    try {
      const auth0Client = new AuthenticationClient({
        domain: authConfig.oauth.domain,
        clientId: authConfig.oauth.clientId,
        clientSecret: authConfig.oauth.clientSecret
      });

      await auth0Client.verifyMFAToken(request.userId, request.token);
      return true;
    } catch (error) {
      throw new AuthenticationError('MFA verification failed', {
        context: 'verifyMFA',
        userId: request.userId
      });
    }
  }
}

// Export enhanced token management functions with security logging
export { generateToken, verifyToken, refreshToken };

// Export OAuth client for external use
export { OAuthClient };