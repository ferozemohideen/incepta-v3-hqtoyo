/**
 * OAuth 2.0 Authentication Library
 * Implements secure authentication flows with Auth0 integration, including SAML SSO,
 * comprehensive security logging, and role-based access control.
 * @version 1.0.0
 */

import { AuthenticationClient, ManagementClient } from 'auth0'; // v4.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { createHash, randomBytes } from 'crypto';
import { authConfig } from '../../config/auth.config';
import { JWTPayload } from '../../interfaces/auth.interface';
import { UserRole, RolePermissions } from '../../constants/roles';
import Redis from 'ioredis';

/**
 * Interface for security context in authentication flows
 */
interface SecurityContext {
  ipAddress: string;
  deviceFingerprint: string;
  userAgent?: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

/**
 * Interface for OAuth state parameters
 */
interface OAuthState {
  state: string;
  codeVerifier: string;
  deviceFingerprint: string;
  timestamp: number;
}

/**
 * OAuth client class that handles Auth0 integration, OAuth/SAML flows,
 * token validation, and security logging
 */
export class OAuthClient {
  private authClient: AuthenticationClient;
  private managementClient: ManagementClient;
  private rateLimiter: RateLimiterRedis;
  private redis: Redis;

  constructor() {
    // Initialize Auth0 clients
    this.authClient = new AuthenticationClient({
      domain: authConfig.oauth.domain,
      clientId: authConfig.oauth.clientId,
      clientSecret: authConfig.oauth.clientSecret
    });

    this.managementClient = new ManagementClient({
      domain: authConfig.oauth.domain,
      clientId: authConfig.oauth.clientId,
      clientSecret: authConfig.oauth.clientSecret
    });

    // Initialize Redis for state and rate limiting
    this.redis = new Redis(authConfig.redis);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'oauth_ratelimit',
      points: 5, // Number of attempts
      duration: 60 // Per minute
    });
  }

  /**
   * Generates OAuth authorization URL with enhanced security parameters
   */
  public async getAuthorizationUrl(
    options: {
      responseType: string;
      scope: string[];
      connection?: string;
    },
    deviceId: string,
    ipAddress: string
  ): Promise<string> {
    try {
      // Generate PKCE challenge
      const codeVerifier = randomBytes(32).toString('base64url');
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Generate state parameter with security context
      const state = randomBytes(32).toString('hex');
      const stateParams: OAuthState = {
        state,
        codeVerifier,
        deviceFingerprint: deviceId,
        timestamp: Date.now()
      };

      // Store state parameters in Redis with expiration
      await this.redis.setex(
        `oauth_state:${state}`,
        300, // 5 minutes expiration
        JSON.stringify(stateParams)
      );

      // Build authorization URL
      const authUrl = this.authClient.buildAuthorizeUrl({
        ...options,
        state,
        codeChallengeMethod: 'S256',
        codeChallenge,
        audience: authConfig.oauth.audience,
        redirectUri: authConfig.oauth.callbackUrl
      });

      // Log authorization attempt
      await this.logAuthEvent({
        action: 'AUTHORIZATION_REQUEST',
        ipAddress,
        deviceFingerprint: deviceId,
        success: true
      });

      return authUrl;
    } catch (error) {
      await this.logAuthEvent({
        action: 'AUTHORIZATION_REQUEST',
        ipAddress,
        deviceFingerprint: deviceId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handles OAuth callback with comprehensive security validation
   */
  public async handleCallback(
    code: string,
    state: string,
    securityContext: SecurityContext
  ): Promise<JWTPayload> {
    try {
      // Check rate limits
      await this.rateLimiter.consume(securityContext.ipAddress);

      // Retrieve and validate state
      const storedState = await this.redis.get(`oauth_state:${state}`);
      if (!storedState) {
        throw new Error('Invalid or expired state parameter');
      }

      const stateParams: OAuthState = JSON.parse(storedState);
      if (stateParams.deviceFingerprint !== securityContext.deviceFingerprint) {
        throw new Error('Device fingerprint mismatch');
      }

      // Exchange code for tokens
      const tokens = await this.authClient.getTokensWithPKCE(
        code,
        stateParams.codeVerifier,
        authConfig.oauth.callbackUrl
      );

      // Validate tokens
      await this.validateTokens(tokens);

      // Get user profile from Auth0
      const auth0Profile = await this.authClient.getProfile(tokens.access_token);
      
      // Map Auth0 roles to system roles and permissions
      const userRole = this.mapAuth0Role(auth0Profile.roles?.[0]);
      const permissions = RolePermissions[userRole];

      // Create JWT payload
      const jwtPayload: JWTPayload = {
        userId: auth0Profile.sub,
        email: auth0Profile.email,
        role: userRole,
        permissions,
        sessionId: randomBytes(16).toString('hex'),
        deviceFingerprint: securityContext.deviceFingerprint,
        ipAddress: securityContext.ipAddress
      };

      // Log successful authentication
      await this.logAuthEvent({
        action: 'AUTHENTICATION_SUCCESS',
        userId: jwtPayload.userId,
        ipAddress: securityContext.ipAddress,
        deviceFingerprint: securityContext.deviceFingerprint,
        success: true
      });

      return jwtPayload;
    } catch (error) {
      await this.logAuthEvent({
        action: 'AUTHENTICATION_FAILURE',
        ipAddress: securityContext.ipAddress,
        deviceFingerprint: securityContext.deviceFingerprint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Comprehensive token validation with security checks
   */
  private async validateTokens(tokens: {
    access_token: string;
    id_token?: string;
  }): Promise<boolean> {
    try {
      // Verify token signatures
      await this.authClient.getTokenInfo(tokens.access_token);

      if (tokens.id_token) {
        // Verify ID token if present
        await this.authClient.validateIdToken(tokens.id_token);
      }

      // Check token revocation status
      const tokenStatus = await this.managementClient.getBlacklistedTokens();
      if (tokenStatus.some(t => t.jti === tokens.access_token)) {
        throw new Error('Token has been revoked');
      }

      return true;
    } catch (error) {
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Maps Auth0 roles to system roles
   */
  private mapAuth0Role(auth0Role?: string): UserRole {
    switch (auth0Role?.toLowerCase()) {
      case 'admin':
        return UserRole.ADMIN;
      case 'tto':
        return UserRole.TTO;
      case 'entrepreneur':
        return UserRole.ENTREPRENEUR;
      case 'researcher':
        return UserRole.RESEARCHER;
      default:
        return UserRole.GUEST;
    }
  }

  /**
   * Logs authentication events for security auditing
   */
  private async logAuthEvent(event: {
    action: string;
    userId?: string;
    ipAddress: string;
    deviceFingerprint: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await this.redis.lpush('auth_audit_log', JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        correlationId: randomBytes(16).toString('hex')
      }));
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }
}