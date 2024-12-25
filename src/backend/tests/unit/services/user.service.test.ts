/**
 * @fileoverview Comprehensive unit tests for UserService class
 * Tests user management operations, security features, RBAC, and audit logging
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals'; // v29.7.0
import { MockInstance } from 'jest-mock'; // v29.7.0
import { UserService } from '../../../src/services/user.service';
import { User, UserProfile, UserPreferences, UserSecurity } from '../../../src/interfaces/user.interface';
import { UserModel } from '../../../src/db/models/user.model';
import { UserRole } from '../../../src/constants/roles';
import { AuditLog } from '../../../src/utils/audit';
import { 
  hashPassword, 
  comparePassword, 
  encryptData, 
  decryptData 
} from '../../../src/utils/encryption';

// Mock external dependencies
jest.mock('../../../src/db/models/user.model');
jest.mock('../../../src/utils/encryption');
jest.mock('../../../src/utils/audit');

describe('UserService', () => {
  let userService: UserService;
  let mockUserModel: jest.Mocked<typeof UserModel>;
  let mockAuditLog: jest.Mocked<typeof AuditLog>;

  // Test data
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.ENTREPRENEUR,
    profile: {
      organization: 'Test Org',
      title: 'Founder',
      phone: '+1234567890',
      bio: 'Test bio',
      interests: ['AI', 'Biotech'],
      avatar: 'avatar.jpg'
    },
    preferences: {
      emailNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    },
    security: {
      mfaEnabled: true,
      lastLogin: new Date('2024-01-01T00:00:00Z'),
      passwordChangedAt: new Date('2024-01-01T00:00:00Z')
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize service
    userService = new UserService();
    
    // Setup mock implementations
    mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
    mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;
    
    // Mock encryption utilities
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (encryptData as jest.Mock).mockResolvedValue({
      encryptedData: 'encrypted',
      iv: 'iv',
      authTag: 'authTag'
    });
    (decryptData as jest.Mock).mockResolvedValue(JSON.stringify(mockUser.security));
  });

  describe('createUser', () => {
    test('should create user with encrypted data and audit log', async () => {
      // Setup
      const userData = {
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        password: 'TestPassword123!',
        profile: mockUser.profile,
        preferences: mockUser.preferences
      };

      mockUserModel.create.mockResolvedValue(mockUser as any);

      // Execute
      const result = await userService.createUser(userData);

      // Verify
      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(encryptData).toHaveBeenCalledTimes(3); // profile, preferences, security
      expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({
        email: userData.email,
        name: userData.name,
        role: userData.role
      }));
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        action: 'CREATE_USER',
        userId: mockUser.id,
        details: {
          email: mockUser.email,
          role: mockUser.role
        }
      });
      expect(result).toEqual(expect.objectContaining({
        email: userData.email,
        name: userData.name,
        role: userData.role
      }));
    });

    test('should validate required fields', async () => {
      // Setup
      const invalidUserData = {
        email: mockUser.email
      };

      // Execute & Verify
      await expect(userService.createUser(invalidUserData))
        .rejects
        .toThrow('Missing required user data');
    });

    test('should validate role assignment', async () => {
      // Setup
      const invalidUserData = {
        ...mockUser,
        role: 'invalid-role' as UserRole
      };

      // Execute & Verify
      await expect(userService.createUser(invalidUserData))
        .rejects
        .toThrow('Invalid user role');
    });
  });

  describe('updateUserSecurity', () => {
    test('should update MFA settings with audit log', async () => {
      // Setup
      const securityUpdate = {
        mfaEnabled: true
      };

      mockUserModel.findByPk.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser)
      } as any);

      // Execute
      const result = await userService.updateUserSecurity(mockUser.id, securityUpdate);

      // Verify
      expect(decryptData).toHaveBeenCalled();
      expect(encryptData).toHaveBeenCalled();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        action: 'UPDATE_USER_SECURITY',
        userId: mockUser.id,
        details: {
          mfaUpdated: true,
          passwordUpdated: false
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email
      }));
    });

    test('should update password with history validation', async () => {
      // Setup
      const securityUpdate = {
        newPassword: 'NewTestPassword123!'
      };

      mockUserModel.findByPk.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser)
      } as any);

      (comparePassword as jest.Mock).mockResolvedValue(false);

      // Execute
      const result = await userService.updateUserSecurity(mockUser.id, securityUpdate);

      // Verify
      expect(hashPassword).toHaveBeenCalledWith(securityUpdate.newPassword);
      expect(comparePassword).toHaveBeenCalled();
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        action: 'UPDATE_USER_SECURITY',
        userId: mockUser.id,
        details: {
          mfaUpdated: false,
          passwordUpdated: true
        }
      });
    });
  });

  describe('authenticateUser', () => {
    test('should authenticate user and update login history', async () => {
      // Setup
      const credentials = {
        email: mockUser.email,
        password: 'TestPassword123!',
        ip: '127.0.0.1'
      };

      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser)
      } as any);

      (comparePassword as jest.Mock).mockResolvedValue(true);

      // Execute
      const result = await userService.authenticateUser(
        credentials.email,
        credentials.password,
        credentials.ip
      );

      // Verify
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email: credentials.email }
      });
      expect(comparePassword).toHaveBeenCalledWith(
        credentials.password,
        mockUser.password
      );
      expect(mockAuditLog.create).toHaveBeenCalledWith({
        action: 'USER_LOGIN',
        userId: mockUser.id,
        details: { ip: credentials.ip }
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email
      }));
    });

    test('should handle invalid credentials', async () => {
      // Setup
      mockUserModel.findOne.mockResolvedValue(null);

      // Execute & Verify
      await expect(userService.authenticateUser(
        'invalid@example.com',
        'password',
        '127.0.0.1'
      )).rejects.toThrow('Invalid credentials');
    });

    test('should handle incorrect password', async () => {
      // Setup
      mockUserModel.findOne.mockResolvedValue(mockUser as any);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      // Execute & Verify
      await expect(userService.authenticateUser(
        mockUser.email,
        'wrongpassword',
        '127.0.0.1'
      )).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Data Encryption', () => {
    test('should encrypt sensitive user data', async () => {
      // Setup
      const sensitiveData = {
        profile: mockUser.profile,
        preferences: mockUser.preferences,
        security: mockUser.security
      };

      // Execute
      await userService.createUser({
        ...mockUser,
        password: 'TestPassword123!'
      });

      // Verify
      expect(encryptData).toHaveBeenCalledWith(JSON.stringify(sensitiveData.profile));
      expect(encryptData).toHaveBeenCalledWith(JSON.stringify(sensitiveData.preferences));
      expect(encryptData).toHaveBeenCalledWith(expect.any(String)); // security data
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Setup
      mockUserModel.create.mockRejectedValue(new Error('Database error'));

      // Execute & Verify
      await expect(userService.createUser({
        ...mockUser,
        password: 'TestPassword123!'
      })).rejects.toThrow('User creation failed');
    });

    test('should handle encryption errors', async () => {
      // Setup
      (encryptData as jest.Mock).mockRejectedValue(new Error('Encryption failed'));

      // Execute & Verify
      await expect(userService.createUser({
        ...mockUser,
        password: 'TestPassword123!'
      })).rejects.toThrow('User creation failed');
    });
  });
});