/**
 * User Interface Definitions
 * Version: 1.0.0
 * 
 * Defines TypeScript interfaces for user-related data structures with enhanced
 * security, validation, and tracking features for the Incepta platform.
 * @module user.interface
 */

import { UserRole } from '../constants/auth.constants';

/**
 * Enum defining possible user account statuses
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  LOCKED = 'locked'
}

/**
 * Enum defining supported MFA methods
 */
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  SECURITY_KEY = 'security_key'
}

/**
 * Enum defining notification channel preferences
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

/**
 * Interface for verified credential entries
 */
export interface VerifiedCredentials {
  type: string;
  issuer: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationUrl: string;
  status: 'active' | 'expired' | 'revoked';
}

/**
 * Interface for privacy settings
 */
export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'connections';
  showEmail: boolean;
  showPhone: boolean;
  allowMessaging: boolean;
  dataSharing: boolean;
}

/**
 * Interface for accessibility preferences
 */
export interface AccessibilityPreferences {
  highContrast: boolean;
  fontSize: 'default' | 'large' | 'larger';
  reduceMotion: boolean;
  screenReader: boolean;
}

/**
 * Interface for security questions
 */
export interface SecurityQuestion {
  questionId: string;
  question: string;
  hashedAnswer: string;
  lastUpdated: Date;
}

/**
 * Interface for device information
 */
export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  browser: string;
  os: string;
  lastUsed: Date;
  isTrusted: boolean;
}

/**
 * Interface for IP history tracking
 */
export interface IPHistoryEntry {
  ip: string;
  timestamp: Date;
  location?: string;
  userAgent: string;
  activity: string;
}

/**
 * Interface for social media profiles
 */
export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  orcid?: string;
  googleScholar?: string;
  researchGate?: string;
}

/**
 * Interface for user profile information with version tracking
 */
export interface UserProfile {
  organization: string;
  title: string;
  phone: string;
  bio: string;
  interests: string[];
  avatar: string;
  version: number;
  lastUpdatedBy: string;
  verifiedCredentials: VerifiedCredentials[];
}

/**
 * Interface for user preferences including privacy and accessibility
 */
export interface UserPreferences {
  emailNotifications: boolean;
  notificationChannels: NotificationChannel[];
  theme: string;
  language: string;
  timezone: string;
  privacySettings: PrivacySettings;
  accessibility: AccessibilityPreferences;
}

/**
 * Interface for user security settings and tracking
 */
export interface UserSecurity {
  mfaEnabled: boolean;
  mfaMethod: MFAMethod;
  lastLogin: Date;
  passwordChangedAt: Date;
  failedLoginAttempts: number;
  securityQuestions: SecurityQuestion[];
  devices: DeviceInfo[];
  ipHistory: IPHistoryEntry[];
}

/**
 * Interface for security context information
 */
export interface SecurityContext {
  sessionId: string;
  lastActivity: Date;
  currentDevice: DeviceInfo;
  currentIp: string;
  mfaVerified: boolean;
  permissionLevel: UserRole;
  securityFlags: string[];
}

/**
 * Main user interface with enhanced security and tracking features
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  preferences: UserPreferences;
  security: UserSecurity;
  socialProfiles: SocialProfiles;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type guard to check if an object is a valid User
 * @param obj - Object to validate
 * @returns boolean indicating if object is valid User
 */
export const isUser = (obj: any): obj is User => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.name === 'string' &&
    Object.values(UserRole).includes(obj.role) &&
    Object.values(UserStatus).includes(obj.status) &&
    obj.profile &&
    obj.preferences &&
    obj.security &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};