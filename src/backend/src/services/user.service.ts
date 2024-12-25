/**
 * @fileoverview Enhanced User Service Implementation
 * Implements core user management with RBAC, field-level encryption, and security features
 * @version 1.0.0
 */

import { Op } from 'sequelize'; // v6.35.1
import { User, UserProfile, UserPreferences, UserSecurity } from '../../interfaces/user.interface';
import { UserModel } from '../../db/models/user.model';
import { UserRole, hasPermission, Permission } from '../../constants/roles';
import { 
  hashPassword, 
  comparePassword, 
  encryptData, 
  decryptData 
} from '../../utils/encryption';
import { Logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import { AuditLog } from '../../utils/audit';

/**
 * Custom error types for user service operations
 */
class UserServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserServiceError';
  }
}

/**
 * Enhanced User Service implementing secure user management operations
 */
export class UserService {
  private userModel: typeof UserModel;
  private logger: Logger;
  private readonly PASSWORD_HISTORY_LIMIT = 5;
  private readonly SESSION_LIMIT = 5;

  constructor() {
    this.userModel = UserModel;
    this.logger = new Logger('UserService');
  }

  /**
   * Creates a new user with enhanced security features
   * @param userData User creation data
   * @returns Created user object
   * @throws UserServiceError if validation fails
   */
  public async createUser(userData: Partial<User>): Promise<User> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password || !userData.role) {
        throw new UserServiceError('Missing required user data');
      }

      // Validate role is allowed
      if (!Object.values(UserRole).includes(userData.role)) {
        throw new UserServiceError('Invalid user role');
      }

      // Hash password with enhanced security
      const hashedPassword = await hashPassword(userData.password);

      // Encrypt sensitive profile data
      const encryptedProfile = await this.encryptUserProfile(userData.profile);
      const encryptedPreferences = await this.encryptUserPreferences(userData.preferences);

      // Initialize security settings
      const security: UserSecurity = {
        mfaEnabled: false,
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
        passwordHistory: [hashedPassword],
        sessions: []
      };

      const encryptedSecurity = await this.encryptUserSecurity(security);

      // Create user with encrypted data
      const user = await this.userModel.create({
        ...userData,
        password: hashedPassword,
        profile: encryptedProfile,
        preferences: encryptedPreferences,
        security: encryptedSecurity
      });

      // Log user creation
      await AuditLog.create({
        action: 'CREATE_USER',
        userId: user.id,
        details: {
          email: user.email,
          role: user.role
        }
      });

      return this.sanitizeUserData(user);
    } catch (error) {
      this.logger.error('User creation failed', { error });
      throw new UserServiceError(error instanceof Error ? error.message : 'User creation failed');
    }
  }

  /**
   * Updates user security settings with enhanced validation
   * @param userId User ID
   * @param securityData Security settings to update
   * @returns Updated user object
   * @throws UserServiceError if validation fails
   */
  public async updateUserSecurity(
    userId: string,
    securityData: Partial<UserSecurity>
  ): Promise<User> {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new UserServiceError('User not found');
      }

      const currentSecurity = await this.decryptUserSecurity(user.security);

      // Update MFA settings if provided
      if (typeof securityData.mfaEnabled !== 'undefined') {
        currentSecurity.mfaEnabled = securityData.mfaEnabled;
      }

      // Update password if provided
      if (securityData.newPassword) {
        await this.validatePasswordHistory(
          securityData.newPassword,
          currentSecurity.passwordHistory
        );
        
        const hashedPassword = await hashPassword(securityData.newPassword);
        
        // Update password history
        currentSecurity.passwordHistory = [
          hashedPassword,
          ...currentSecurity.passwordHistory.slice(0, this.PASSWORD_HISTORY_LIMIT - 1)
        ];
        
        currentSecurity.passwordChangedAt = new Date();
        user.password = hashedPassword;
      }

      // Encrypt updated security data
      const encryptedSecurity = await this.encryptUserSecurity(currentSecurity);
      user.security = encryptedSecurity;

      await user.save();

      // Log security update
      await AuditLog.create({
        action: 'UPDATE_USER_SECURITY',
        userId: user.id,
        details: {
          mfaUpdated: typeof securityData.mfaEnabled !== 'undefined',
          passwordUpdated: !!securityData.newPassword
        }
      });

      return this.sanitizeUserData(user);
    } catch (error) {
      this.logger.error('Security update failed', { error, userId });
      throw new UserServiceError(error instanceof Error ? error.message : 'Security update failed');
    }
  }

  /**
   * Validates user credentials and handles login
   * @param email User email
   * @param password User password
   * @returns Authenticated user object
   * @throws UserServiceError if authentication fails
   */
  public async authenticateUser(
    email: string,
    password: string,
    ip: string
  ): Promise<User> {
    try {
      const user = await this.userModel.findOne({ where: { email } });
      if (!user) {
        throw new UserServiceError('Invalid credentials');
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        throw new UserServiceError('Invalid credentials');
      }

      // Update security information
      const security = await this.decryptUserSecurity(user.security);
      security.lastLogin = new Date();
      
      // Manage active sessions
      security.sessions = [
        { ip, loginTime: new Date() },
        ...security.sessions.slice(0, this.SESSION_LIMIT - 1)
      ];

      user.security = await this.encryptUserSecurity(security);
      user.lastLoginAt = new Date();
      user.lastLoginIp = ip;

      await user.save();

      // Log successful authentication
      await AuditLog.create({
        action: 'USER_LOGIN',
        userId: user.id,
        details: { ip }
      });

      return this.sanitizeUserData(user);
    } catch (error) {
      this.logger.error('Authentication failed', { error, email });
      throw new UserServiceError('Invalid credentials');
    }
  }

  /**
   * Helper method to encrypt user profile data
   */
  private async encryptUserProfile(profile: UserProfile): Promise<string> {
    const { encryptedData, iv, authTag } = await encryptData(JSON.stringify(profile));
    return JSON.stringify({ data: encryptedData, iv, authTag });
  }

  /**
   * Helper method to encrypt user preferences
   */
  private async encryptUserPreferences(preferences: UserPreferences): Promise<string> {
    const { encryptedData, iv, authTag } = await encryptData(JSON.stringify(preferences));
    return JSON.stringify({ data: encryptedData, iv, authTag });
  }

  /**
   * Helper method to encrypt user security data
   */
  private async encryptUserSecurity(security: UserSecurity): Promise<string> {
    const { encryptedData, iv, authTag } = await encryptData(JSON.stringify(security));
    return JSON.stringify({ data: encryptedData, iv, authTag });
  }

  /**
   * Helper method to decrypt user security data
   */
  private async decryptUserSecurity(encryptedSecurity: string): Promise<UserSecurity> {
    const { data, iv, authTag } = JSON.parse(encryptedSecurity);
    const decrypted = await decryptData(data, iv, authTag);
    return JSON.parse(decrypted);
  }

  /**
   * Validates password against history to prevent reuse
   */
  private async validatePasswordHistory(
    newPassword: string,
    passwordHistory: string[]
  ): Promise<void> {
    for (const historicPassword of passwordHistory) {
      const matches = await comparePassword(newPassword, historicPassword);
      if (matches) {
        throw new UserServiceError('Password has been used recently');
      }
    }
  }

  /**
   * Removes sensitive data before returning user object
   */
  private sanitizeUserData(user: UserModel): User {
    const sanitized = user.toJSON();
    delete sanitized.password;
    delete sanitized.security;
    return sanitized;
  }
}

export default UserService;