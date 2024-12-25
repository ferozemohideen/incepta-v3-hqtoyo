/**
 * @fileoverview Integration tests for user management functionality
 * Tests CRUD operations, profile management, RBAC, and security features
 * @version 1.0.0
 */

import { faker } from '@faker-js/faker'; // v8.3.1
import { UserService } from '../../src/services/user.service';
import { User, UserProfile, UserPreferences, UserSecurity } from '../../src/interfaces/user.interface';
import { UserRole } from '../../src/constants/roles';
import crypto from 'crypto'; // native

/**
 * Test user service instance
 */
const userService = new UserService();

/**
 * Test data cleanup IDs
 */
const testUserIds: string[] = [];

/**
 * Helper function to generate secure test user data
 */
const generateSecureTestUser = (role: UserRole = UserRole.ENTREPRENEUR) => {
  const profile: UserProfile = {
    organization: faker.company.name(),
    title: faker.person.jobTitle(),
    phone: faker.phone.number(),
    bio: faker.person.bio(),
    interests: [faker.science.chemicalElement().name, faker.science.chemicalElement().name],
    avatar: faker.image.avatar()
  };

  const preferences: UserPreferences = {
    emailNotifications: true,
    theme: 'light',
    language: 'en',
    timezone: 'UTC'
  };

  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password({ length: 12, memorable: true }) + '1aA!',
    role,
    profile,
    preferences
  };
};

/**
 * Helper function to cleanup test data
 */
const cleanupTestData = async () => {
  for (const userId of testUserIds) {
    try {
      await userService.deleteUser(userId);
    } catch (error) {
      console.error(`Failed to cleanup test user ${userId}:`, error);
    }
  }
  testUserIds.length = 0;
};

describe('User Service Integration Tests', () => {
  // Cleanup after all tests
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('User Creation Security Tests', () => {
    it('should create user with encrypted sensitive fields', async () => {
      const testUser = generateSecureTestUser();
      const createdUser = await userService.createUser(testUser);
      
      testUserIds.push(createdUser.id);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(testUser.email);
      expect(createdUser.role).toBe(testUser.role);
      
      // Verify field-level encryption
      const encryptionValidation = await userService.validateUserEncryption(createdUser.id);
      expect(encryptionValidation.isValid).toBe(true);
      expect(encryptionValidation.encryptedFields).toContain('profile');
      expect(encryptionValidation.encryptedFields).toContain('preferences');
    });

    it('should enforce password complexity requirements', async () => {
      const testUser = generateSecureTestUser();
      testUser.password = 'weak';

      await expect(userService.createUser(testUser))
        .rejects
        .toThrow('Password must meet complexity requirements');
    });

    it('should prevent duplicate email registration', async () => {
      const testUser = generateSecureTestUser();
      const createdUser = await userService.createUser(testUser);
      testUserIds.push(createdUser.id);

      await expect(userService.createUser(testUser))
        .rejects
        .toThrow('Email already exists');
    });
  });

  describe('Role-Based Access Control Tests', () => {
    it('should enforce role-specific permissions', async () => {
      // Create users with different roles
      const adminUser = await userService.createUser(generateSecureTestUser(UserRole.ADMIN));
      const ttoUser = await userService.createUser(generateSecureTestUser(UserRole.TTO));
      const entrepreneurUser = await userService.createUser(generateSecureTestUser(UserRole.ENTREPRENEUR));
      
      testUserIds.push(adminUser.id, ttoUser.id, entrepreneurUser.id);

      // Verify role-specific field access
      const adminAccess = await userService.verifyFieldLevelSecurity(adminUser.id);
      expect(adminAccess.hasFullAccess).toBe(true);

      const ttoAccess = await userService.verifyFieldLevelSecurity(ttoUser.id);
      expect(ttoAccess.restrictedFields).toContain('security');
      expect(ttoAccess.hasFullAccess).toBe(false);

      const entrepreneurAccess = await userService.verifyFieldLevelSecurity(entrepreneurUser.id);
      expect(entrepreneurAccess.restrictedFields).toContain('security');
      expect(entrepreneurAccess.restrictedFields).toContain('profile.phone');
      expect(entrepreneurAccess.hasFullAccess).toBe(false);
    });

    it('should prevent role escalation attacks', async () => {
      const entrepreneurUser = await userService.createUser(generateSecureTestUser(UserRole.ENTREPRENEUR));
      testUserIds.push(entrepreneurUser.id);

      await expect(userService.updateUser(entrepreneurUser.id, { role: UserRole.ADMIN }))
        .rejects
        .toThrow('Unauthorized role modification');
    });
  });

  describe('Profile Management Security Tests', () => {
    it('should maintain field encryption during profile updates', async () => {
      const testUser = await userService.createUser(generateSecureTestUser());
      testUserIds.push(testUser.id);

      const updatedProfile: UserProfile = {
        ...testUser.profile,
        organization: faker.company.name(),
        phone: faker.phone.number()
      };

      const updatedUser = await userService.updateUserProfile(testUser.id, updatedProfile);
      
      // Verify encryption is maintained
      const encryptionCheck = await userService.validateUserEncryption(updatedUser.id);
      expect(encryptionCheck.isValid).toBe(true);
      expect(encryptionCheck.encryptedFields).toContain('profile');
    });

    it('should enforce field-level access control during updates', async () => {
      const entrepreneurUser = await userService.createUser(generateSecureTestUser(UserRole.ENTREPRENEUR));
      testUserIds.push(entrepreneurUser.id);

      const sensitiveUpdate = {
        security: {
          mfaEnabled: false
        }
      };

      await expect(userService.updateUserSecurity(entrepreneurUser.id, sensitiveUpdate))
        .rejects
        .toThrow('Unauthorized access to security settings');
    });
  });

  describe('User Security Context Tests', () => {
    it('should track security-relevant user activities', async () => {
      const testUser = await userService.createUser(generateSecureTestUser());
      testUserIds.push(testUser.id);

      // Simulate multiple profile updates
      for (let i = 0; i < 3; i++) {
        await userService.updateUserProfile(testUser.id, {
          ...testUser.profile,
          organization: faker.company.name()
        });
      }

      const securityContext = await userService.validateUserEncryption(testUser.id);
      expect(securityContext.auditLog).toHaveLength(4); // 1 creation + 3 updates
      expect(securityContext.lastModified).toBeDefined();
    });

    it('should maintain encryption integrity across operations', async () => {
      const testUser = await userService.createUser(generateSecureTestUser());
      testUserIds.push(testUser.id);

      // Perform multiple operations
      await userService.updateUserProfile(testUser.id, {
        ...testUser.profile,
        bio: faker.person.bio()
      });

      await userService.updateUserPreferences(testUser.id, {
        ...testUser.preferences,
        theme: 'dark'
      });

      const encryptionValidation = await userService.validateUserEncryption(testUser.id);
      expect(encryptionValidation.isValid).toBe(true);
      expect(encryptionValidation.integrityChecks.profile).toBe(true);
      expect(encryptionValidation.integrityChecks.preferences).toBe(true);
    });
  });
});