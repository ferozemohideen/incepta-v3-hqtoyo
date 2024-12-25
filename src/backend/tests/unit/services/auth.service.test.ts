/**
 * @fileoverview Comprehensive unit tests for AuthService
 * Tests authentication, authorization, session management and security features
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockInstance } from 'jest-mock';
import { faker } from '@faker-js/faker';
import { AuthService } from '../../src/services/auth.service';
import { 
  LoginRequest, 
  LoginResponse,
  UserProfile,
  MFAVerifyRequest,
  AuthAuditLog,
  UserSession
} from '../../src/interfaces/auth.interface';
import { UserRole, Permission } from '../../src/constants/roles';

// Mock external dependencies
jest.mock('otplib');
jest.mock('bcryptjs');
jest.mock('@fingerprintjs/fingerprintjs-pro');
jest.mock('rate-limiter-flexible');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockRateLimiter: jest.Mocked<any>;
  let mockFingerprinter: jest.Mocked<any>;
  let mockAuditLogger: jest.SpyInstance;

  const mockUser: UserProfile = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    role: UserRole.ENTREPRENEUR,
    permissions: [],
    mfaEnabled: true,
    lastLogin: new Date(),
    failedLoginAttempts: 0,
    accountLocked: false,
    consentStatus: {},
    dataRetentionPeriod: 365
  };

  const mockContext = {
    ip: faker.internet.ip(),
    userAgent: faker.internet.userAgent()
  };

  beforeEach(() => {
    // Reset mocks and create fresh instance
    jest.clearAllMocks();
    authService = new AuthService();
    mockAuditLogger = jest.spyOn(authService as any, 'logAuthEvent');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    test('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const loginRequest: LoginRequest = {
        email: mockUser.email,
        password: 'ValidPassword123!',
        deviceFingerprint: faker.string.alphanumeric(32)
      };

      // Mock successful authentication flow
      jest.spyOn(authService as any, 'validateCredentials').mockResolvedValue(mockUser);
      jest.spyOn(authService as any, 'generateDeviceFingerprint')
        .mockResolvedValue(loginRequest.deviceFingerprint);
      jest.spyOn(authService as any, 'calculateRiskScore').mockResolvedValue(0);
      jest.spyOn(authService as any, 'createSession').mockResolvedValue({
        sessionId: faker.string.uuid(),
        userId: mockUser.id,
        deviceFingerprint: loginRequest.deviceFingerprint,
        ipAddress: mockContext.ip,
        userAgent: mockContext.userAgent,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        isActive: true,
        mfaVerified: false
      });

      // Act
      const result = await authService.login(loginRequest, mockContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.id).toBe(mockUser.id);
      expect(mockAuditLogger).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUser.id,
        action: 'LOGIN',
        success: true,
        ipAddress: mockContext.ip
      }));
    });

    test('should require MFA when risk score is high', async () => {
      // Arrange
      const loginRequest: LoginRequest = {
        email: mockUser.email,
        password: 'ValidPassword123!',
        deviceFingerprint: faker.string.alphanumeric(32)
      };

      jest.spyOn(authService as any, 'validateCredentials').mockResolvedValue(mockUser);
      jest.spyOn(authService as any, 'calculateRiskScore').mockResolvedValue(75);

      // Act
      const result = await authService.login(loginRequest, mockContext);

      // Assert
      expect(result.requiresMFA).toBe(true);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    test('should block login after rate limit exceeded', async () => {
      // Arrange
      const loginRequest: LoginRequest = {
        email: mockUser.email,
        password: 'WrongPassword123!',
        deviceFingerprint: faker.string.alphanumeric(32)
      };

      jest.spyOn(authService as any, 'checkRateLimit')
        .mockRejectedValue(new Error('Too many login attempts'));

      // Act & Assert
      await expect(authService.login(loginRequest, mockContext))
        .rejects.toThrow('Too many login attempts');
      
      expect(mockAuditLogger).toHaveBeenCalledWith(expect.objectContaining({
        userId: loginRequest.email,
        action: 'LOGIN_FAILED',
        success: false,
        failureReason: 'Too many login attempts'
      }));
    });
  });

  describe('setupMFA', () => {
    test('should successfully set up MFA for user', async () => {
      // Arrange
      const userId = mockUser.id;
      const deviceContext = {
        fingerprint: faker.string.alphanumeric(32),
        userAgent: mockContext.userAgent
      };

      jest.spyOn(authService as any, 'generateBackupCodes')
        .mockResolvedValue(Array(10).fill(0).map(() => faker.string.alphanumeric(8)));
      jest.spyOn(authService as any, 'generateRecoveryCodes')
        .mockResolvedValue(Array(5).fill(0).map(() => faker.string.alphanumeric(16)));

      // Act
      const result = await authService.setupMFA(userId, deviceContext);

      // Assert
      expect(result.secret).toBeTruthy();
      expect(result.qrCode).toBeTruthy();
      expect(result.backupCodes).toHaveLength(10);
      expect(result.recoveryCodes).toHaveLength(5);
      expect(mockAuditLogger).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        action: 'MFA_SETUP',
        success: true
      }));
    });
  });

  describe('validatePermission', () => {
    test('should correctly validate user permissions', async () => {
      // Arrange
      const permission: Permission = 'SEARCH_TECHNOLOGIES';
      jest.spyOn(authService as any, 'getUserById').mockResolvedValue(mockUser);

      // Act
      const result = await authService.validatePermission(mockUser.id, permission);

      // Assert
      expect(result).toBe(true);
    });

    test('should deny access for invalid permissions', async () => {
      // Arrange
      const permission: Permission = 'MANAGE_USERS';
      jest.spyOn(authService as any, 'getUserById').mockResolvedValue(mockUser);

      // Act
      const result = await authService.validatePermission(mockUser.id, permission);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Device Fingerprinting', () => {
    test('should detect new device and require additional verification', async () => {
      // Arrange
      const loginRequest: LoginRequest = {
        email: mockUser.email,
        password: 'ValidPassword123!',
        deviceFingerprint: faker.string.alphanumeric(32)
      };

      jest.spyOn(authService as any, 'validateCredentials').mockResolvedValue(mockUser);
      jest.spyOn(authService as any, 'verifyDeviceFingerprint')
        .mockResolvedValue({ isNewDevice: true, riskScore: 60 });

      // Act
      const result = await authService.login(loginRequest, mockContext);

      // Assert
      expect(result.requiresMFA).toBe(true);
      expect(mockAuditLogger).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUser.id,
        action: 'NEW_DEVICE_DETECTED'
      }));
    });
  });

  describe('Security Event Logging', () => {
    test('should log comprehensive security events', async () => {
      // Arrange
      const securityEvent: Partial<AuthAuditLog> = {
        userId: mockUser.id,
        action: 'SUSPICIOUS_ACTIVITY',
        ipAddress: mockContext.ip,
        deviceFingerprint: faker.string.alphanumeric(32),
        success: false,
        failureReason: 'Unusual login pattern detected',
        correlationId: faker.string.uuid()
      };

      // Act
      await authService['logAuthEvent'](securityEvent);

      // Assert
      expect(mockAuditLogger).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUser.id,
        action: 'SUSPICIOUS_ACTIVITY',
        success: false
      }));
    });
  });
});