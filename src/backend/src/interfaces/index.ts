/**
 * @fileoverview Central export file for all TypeScript interfaces used in the Incepta platform.
 * Organizes interfaces by domain and security classification level for strict access control.
 * @version 1.0.0
 */

// Import all interfaces from domain-specific files
import * as auth from './auth.interface';
import * as config from './config.interface';
import * as grant from './grant.interface';
import * as message from './message.interface';
import * as technology from './technology.interface';
import * as user from './user.interface';

/**
 * Authentication interfaces with restricted security classification
 * @security-level RESTRICTED
 */
export namespace AuthInterfaces {
  export type JWTPayload = auth.JWTPayload;
  export type LoginRequest = auth.LoginRequest;
  export type LoginResponse = auth.LoginResponse;
  export type MFAVerifyRequest = auth.MFAVerifyRequest;
  export type PasswordResetRequest = auth.PasswordResetRequest;
  export type AuthAuditLog = auth.AuthAuditLog;
  export type UserSession = auth.UserSession;
  export type OAuth2Token = auth.OAuth2Token;
  export type ConsentRecord = auth.ConsentRecord;
}

/**
 * Configuration interfaces with confidential security classification
 * @security-level CONFIDENTIAL
 */
export namespace ConfigInterfaces {
  export type AuthConfig = config.AuthConfig;
  export type DatabaseConfig = config.DatabaseConfig;
  export type ElasticsearchConfig = config.ElasticsearchConfig;
  export type RedisConfig = config.RedisConfig;
  export type S3Config = config.S3Config;
  export type ScraperConfig = config.ScraperConfig;
}

/**
 * Grant interfaces with internal security classification
 * @security-level INTERNAL
 */
export namespace GrantInterfaces {
  export type IGrant = grant.IGrant;
  export type IGrantApplication = grant.IGrantApplication;
  export type IGrantSearchParams = grant.IGrantSearchParams;
  export type IGrantResponse = grant.IGrantResponse;
  export const GrantType = grant.GrantType;
  export const GrantStatus = grant.GrantStatus;
}

/**
 * Message interfaces with confidential security classification
 * @security-level CONFIDENTIAL
 */
export namespace MessageInterfaces {
  export type Message = message.Message;
  export type MessageThread = message.MessageThread;
  export type MessageMetadata = message.MessageMetadata;
  export const MessageType = message.MessageType;
  export const MessageStatus = message.MessageStatus;
}

/**
 * Technology interfaces with internal security classification
 * @security-level INTERNAL
 */
export namespace TechnologyInterfaces {
  export type Technology = technology.Technology;
  export type TechnologyMetadata = technology.TechnologyMetadata;
  export type TechnologySearchParams = technology.TechnologySearchParams;
  export type TechnologySearchResult = technology.TechnologySearchResult;
  export type PublicationReference = technology.PublicationReference;
  export type FundingRecord = technology.FundingRecord;
  export const PatentStatus = technology.PatentStatus;
  export const DevelopmentStage = technology.DevelopmentStage;
  export const SecurityClassification = technology.SecurityClassification;
  export const SortOptions = technology.SortOptions;
}

/**
 * User interfaces with confidential security classification
 * @security-level CONFIDENTIAL
 */
export namespace UserInterfaces {
  export type User = user.User;
  export type UserProfile = user.UserProfile;
  export type UserPreferences = user.UserPreferences;
  export type UserSecurity = user.UserSecurity;
  export const isUser = user.isUser;
  export const isUserProfile = user.isUserProfile;
  export const isUserPreferences = user.isUserPreferences;
  export const isUserSecurity = user.isUserSecurity;
}

/**
 * Type guard to check if a value matches a specific security classification
 * @param value - The value to check
 * @param classification - The security classification level to verify
 * @returns boolean indicating if the value matches the security classification
 */
export function hasSecurityClassification(
  value: any,
  classification: technology.SecurityClassification
): boolean {
  if (!value || typeof value !== 'object') return false;
  return value.securityLevel === classification;
}

/**
 * Re-export security classification enum for external use
 */
export const SecurityClassification = technology.SecurityClassification;