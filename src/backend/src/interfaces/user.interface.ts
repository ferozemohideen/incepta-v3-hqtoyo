/**
 * @fileoverview User interface definitions for the Incepta platform.
 * Implements comprehensive TypeScript interfaces for user management with RBAC
 * and data classification support.
 * @version 1.0.0
 */

import { UserRole } from '../constants/roles';

/**
 * Main user interface defining core user properties with strict type safety.
 * Implements RBAC support and data classification requirements.
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** User's email address (unique) */
  email: string;

  /** User's full name */
  name: string;

  /** User's role for RBAC (from UserRole enum) */
  role: UserRole;

  /** Extended profile information (internal classification) */
  profile: UserProfile;

  /** User preferences (public classification) */
  preferences: UserPreferences;

  /** Security-related data (confidential classification) */
  security: UserSecurity;

  /** Timestamp of user creation */
  createdAt: Date;

  /** Timestamp of last user update */
  updatedAt: Date;
}

/**
 * Interface for extended user profile information.
 * Data Classification: Internal
 */
export interface UserProfile {
  /** User's organization or institution */
  organization: string;

  /** User's job title or position */
  title: string;

  /** Contact phone number */
  phone: string;

  /** Professional biography or description */
  bio: string;

  /** Array of technology/research interests */
  interests: string[];

  /** URL or path to user's avatar image */
  avatar: string;
}

/**
 * Interface for user preferences configuration.
 * Data Classification: Public
 */
export interface UserPreferences {
  /** Flag for email notification opt-in */
  emailNotifications: boolean;

  /** UI theme preference (light/dark) */
  theme: string;

  /** Preferred language for interface */
  language: string;

  /** User's timezone for date/time display */
  timezone: string;
}

/**
 * Interface for security-related user data.
 * Data Classification: Confidential
 */
export interface UserSecurity {
  /** Flag indicating if MFA is enabled */
  mfaEnabled: boolean;

  /** Timestamp of user's last login */
  lastLogin: Date;

  /** Timestamp of last password change */
  passwordChangedAt: Date;
}

/**
 * Type guard to check if a value is a valid User object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid User
 */
export function isUser(value: any): value is User {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    Object.values(UserRole).includes(value.role) &&
    isUserProfile(value.profile) &&
    isUserPreferences(value.preferences) &&
    isUserSecurity(value.security) &&
    value.createdAt instanceof Date &&
    value.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if a value is a valid UserProfile object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid UserProfile
 */
export function isUserProfile(value: any): value is UserProfile {
  return (
    value &&
    typeof value.organization === 'string' &&
    typeof value.title === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.bio === 'string' &&
    Array.isArray(value.interests) &&
    value.interests.every((interest: any) => typeof interest === 'string') &&
    typeof value.avatar === 'string'
  );
}

/**
 * Type guard to check if a value is a valid UserPreferences object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid UserPreferences
 */
export function isUserPreferences(value: any): value is UserPreferences {
  return (
    value &&
    typeof value.emailNotifications === 'boolean' &&
    typeof value.theme === 'string' &&
    typeof value.language === 'string' &&
    typeof value.timezone === 'string'
  );
}

/**
 * Type guard to check if a value is a valid UserSecurity object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid UserSecurity
 */
export function isUserSecurity(value: any): value is UserSecurity {
  return (
    value &&
    typeof value.mfaEnabled === 'boolean' &&
    value.lastLogin instanceof Date &&
    value.passwordChangedAt instanceof Date
  );
}