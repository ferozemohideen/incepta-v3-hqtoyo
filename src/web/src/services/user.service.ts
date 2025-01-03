/**
 * User Service Implementation
 * Version: 1.0.0
 * 
 * Implements comprehensive user profile management with enhanced security,
 * version control, and accessibility features for the Incepta platform.
 */

import { apiService } from './api.service'; // ^1.0.0
import { User } from '../interfaces/user.interface';
import { validateUserData } from '../utils/validation.utils';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Enhanced interface for user service operations with security and accessibility features
 */
export interface UserService {
  /**
   * Retrieves current user's profile with version information
   * @returns Promise resolving to user data
   * @throws ApiError if request fails
   */
  getProfile(): Promise<User>;

  /**
   * Updates user profile with version control and validation
   * @param profileData - Partial profile data to update
   * @param version - Current profile version for optimistic locking
   * @returns Promise resolving to updated user data
   * @throws ValidationError if data is invalid
   * @throws ApiError if request fails
   */
  updateProfile(profileData: Partial<User['profile']>, version: number): Promise<User>;

  /**
   * Updates user preferences including accessibility settings
   * @param preferences - User preferences to update
   * @param accessibility - Accessibility settings
   * @returns Promise resolving to updated user data
   * @throws ValidationError if data is invalid
   * @throws ApiError if request fails
   */
  updatePreferences(
    preferences: Partial<User['preferences']>,
    accessibility: User['preferences']['accessibility']
  ): Promise<User>;

  /**
   * Updates user security settings with audit logging
   * @param settings - Security settings to update
   * @returns Promise resolving to updated user data
   * @throws ValidationError if data is invalid
   * @throws ApiError if request fails
   */
  updateSecuritySettings(settings: Partial<User['security']>): Promise<User>;

  /**
   * Validates security context for user operations
   * @param context - Security context object containing deviceId, timestamp, and userAgent
   * @returns Promise resolving to validation result
   */
  validateSecurityContext(context: {
    deviceId: string;
    timestamp: string;
    userAgent: string;
  }): Promise<boolean>;
}

/**
 * Enhanced user service implementation with comprehensive security and accessibility features
 */
class UserServiceImpl implements UserService {
  // Retry configuration for critical operations
  private readonly retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    statusCodesToRetry: [408, 500, 502, 503, 504]
  };

  /**
   * Retrieves current user's profile with version information
   */
  async getProfile(): Promise<User> {
    try {
      const response = await apiService.get<User>(
        API_ENDPOINTS.USERS.PROFILE,
        undefined,
        {
          cache: false, // Disable caching for security
          retry: true,
          ...this.retryConfig
        }
      );

      // Validate response data
      const isValid = await validateUserData(response);
      if (!isValid) {
        throw new Error('Invalid user data received');
      }

      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Updates user profile with version control and validation
   */
  async updateProfile(
    profileData: Partial<User['profile']>,
    version: number
  ): Promise<User> {
    try {
      // Validate profile data before update
      const isValid = await validateUserData({ profile: profileData });
      if (!isValid) {
        throw new Error('Invalid profile data');
      }

      const response = await apiService.put<User>(
        API_ENDPOINTS.USERS.PROFILE,
        {
          profile: profileData,
          version // Include version for optimistic locking
        },
        {
          retry: true,
          ...this.retryConfig
        }
      );

      // Validate response data
      const isValidResponse = await validateUserData(response);
      if (!isValidResponse) {
        throw new Error('Invalid response data');
      }

      return response;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Updates user preferences including accessibility settings
   */
  async updatePreferences(
    preferences: Partial<User['preferences']>,
    accessibility: User['preferences']['accessibility']
  ): Promise<User> {
    try {
      // Validate preferences and accessibility data
      const isValid = await validateUserData({
        preferences: {
          ...preferences,
          accessibility
        }
      });
      if (!isValid) {
        throw new Error('Invalid preferences data');
      }

      const response = await apiService.put<User>(
        API_ENDPOINTS.USERS.PREFERENCES,
        {
          preferences: {
            ...preferences,
            accessibility
          }
        },
        {
          retry: true,
          ...this.retryConfig
        }
      );

      // Validate response data
      const isValidResponse = await validateUserData(response);
      if (!isValidResponse) {
        throw new Error('Invalid response data');
      }

      return response;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Updates user security settings with audit logging
   */
  async updateSecuritySettings(
    settings: Partial<User['security']>
  ): Promise<User> {
    try {
      // Validate security settings
      const isValid = await validateUserData({ security: settings });
      if (!isValid) {
        throw new Error('Invalid security settings');
      }

      const response = await apiService.put<User>(
        API_ENDPOINTS.USERS.SETTINGS,
        {
          security: settings,
          // Include audit information
          audit: {
            timestamp: new Date().toISOString(),
            ipAddress: window.clientIP, // Set by security middleware
            userAgent: navigator.userAgent
          }
        },
        {
          retry: true,
          ...this.retryConfig
        }
      );

      // Validate response data
      const isValidResponse = await validateUserData(response);
      if (!isValidResponse) {
        throw new Error('Invalid response data');
      }

      return response;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  }

  /**
   * Validates security context for user operations
   */
  async validateSecurityContext(context: {
    deviceId: string;
    timestamp: string;
    userAgent: string;
  }): Promise<boolean> {
    try {
      const response = await apiService.post<{ valid: boolean }>(
        API_ENDPOINTS.USERS.VALIDATE_SECURITY,
        context,
        {
          retry: true,
          ...this.retryConfig
        }
      );

      return response.valid;
    } catch (error) {
      console.error('Error validating security context:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserServiceImpl();

// Export interface for type usage
export type { UserService };