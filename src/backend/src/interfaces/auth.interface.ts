/**
 * @fileoverview Authentication and Authorization Interfaces
 * Defines TypeScript interfaces for auth-related types including JWT payloads,
 * authentication requests/responses, and security audit data.
 * @version 1.0.0
 */

import { UserRole } from '../constants/roles';

/**
 * Enhanced JWT payload interface with security tracking and session management
 * Implements requirements from Technical Specifications 7.1.1
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
  iss?: string; // Issuer
  sub?: string; // Subject
  aud?: string; // Audience
}

/**
 * Enhanced login request interface with MFA and device tracking support
 * Implements OAuth 2.0 + JWT authentication requirements
 */
export interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  deviceFingerprint: string;
  clientId?: string;
  clientSecret?: string;
  grantType?: 'password' | 'refresh_token';
  scope?: string[];
}

/**
 * Comprehensive login response with token metadata and user profile
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  requiresMFA: boolean;
  expiresIn: number;
  tokenType: string;
  scope?: string[];
  idToken?: string; // For OpenID Connect support
}

/**
 * Enhanced user profile with security and compliance tracking
 * Implements RBAC requirements from Technical Specifications 7.1.3
 */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin: Date;
  failedLoginAttempts: number;
  accountLocked: boolean;
  consentStatus: Record<string, boolean>;
  dataRetentionPeriod: number;
  securityQuestions?: SecurityQuestion[];
  preferredMfaMethod?: 'totp' | 'sms' | 'email';
  lastPasswordChange?: Date;
  passwordExpiryDate?: Date;
}

/**
 * Security question interface for account recovery
 */
interface SecurityQuestion {
  questionId: string;
  question: string;
  hashedAnswer: string;
  lastUpdated: Date;
}

/**
 * MFA verification request interface with backup code support
 */
export interface MFAVerifyRequest {
  userId: string;
  token: string;
  backupCode?: string;
  deviceFingerprint?: string;
  rememberDevice?: boolean;
}

/**
 * Password reset request with enhanced security
 */
export interface PasswordResetRequest {
  email: string;
  token: string;
  newPassword: string;
  securityAnswers?: Record<string, string>;
  deviceFingerprint?: string;
}

/**
 * Authentication audit log interface for security tracking
 */
export interface AuthAuditLog {
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
  deviceFingerprint: string;
  success: boolean;
  failureReason?: string;
  correlationId: string;
  userAgent?: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  riskScore?: number;
}

/**
 * Rate limiting metadata interface for security controls
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  scope: 'ip' | 'user' | 'global';
  identifier: string;
}

/**
 * Session management interface for tracking active user sessions
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  mfaVerified: boolean;
}

/**
 * OAuth2 token interface for external service integration
 */
export interface OAuth2Token {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string[];
  idToken?: string;
}

/**
 * Consent tracking interface for GDPR compliance
 */
export interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  deviceFingerprint: string;
  version: string;
  expiryDate?: Date;
}