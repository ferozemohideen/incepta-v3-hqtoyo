/**
 * Authentication Slice Tests
 * Version: 1.0.0
 * 
 * Comprehensive test suite for Redux auth slice covering:
 * - OAuth 2.0 + JWT authentication flows
 * - Multi-factor authentication (MFA)
 * - Role-based access control (RBAC)
 * - Token refresh mechanics
 * - Error handling scenarios
 */

import { describe, beforeEach, test, expect, jest } from '@jest/globals'; // ^29.0.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import {
  reducer as authReducer,
  login,
  logout,
  refreshToken,
  verifyMFA,
  clearError,
  updateSecurityFlags,
  selectAuth,
  selectIsAuthenticated,
  selectMFAStatus,
  selectUserRole
} from '../../src/store/auth.slice';
import { authService } from '../../src/services/auth.service';
import { UserRole } from '../../src/constants/auth.constants';
import { AUTH_STORAGE_KEYS } from '../../src/constants/auth.constants';
import { StorageType } from '../../src/utils/storage.utils';

// Mock auth service
jest.mock('../../src/services/auth.service');

// Mock storage utils
jest.mock('../../src/utils/storage.utils', () => ({
  setLocalStorageItem: jest.fn(),
  removeStorageItem: jest.fn(),
  StorageType: {
    LOCAL: 'localStorage'
  }
}));

describe('Auth Slice', () => {
  // Configure test store
  const store = configureStore({
    reducer: {
      auth: authReducer
    }
  });

  // Test data
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.ENTREPRENEUR,
    permissions: ['read:technologies', 'apply:grants'],
    lastLogin: new Date()
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: ['user']
  };

  // Reset store and mocks before each test
  beforeEach(() => {
    store.dispatch({ type: 'auth/reset' });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: {
          login: false,
          refresh: false,
          mfa: false
        },
        error: null,
        requiresMFA: false,
        mfaVerified: false,
        sessionExpiry: null,
        lastTokenRefresh: null,
        securityFlags: {
          passwordChangeRequired: false,
          accountLocked: false
        }
      });
    });
  });

  describe('Authentication Flow', () => {
    test('should handle successful login without MFA', async () => {
      // Mock successful login
      (authService.login as jest.Mock).mockResolvedValueOnce({
        ...mockTokens,
        scope: ['user']
      });

      // Dispatch login action
      await store.dispatch(login({
        email: 'test@example.com',
        password: 'password123',
        ipAddress: '127.0.0.1',
        deviceInfo: {
          userAgent: 'test-agent',
          platform: 'web',
          version: '1.0.0',
          fingerprint: 'test-fingerprint'
        }
      }));

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.tokens).toEqual(expect.objectContaining(mockTokens));
      expect(state.loading.login).toBe(false);
      expect(state.error).toBeNull();
    });

    test('should handle login with MFA requirement', async () => {
      // Mock login requiring MFA
      (authService.login as jest.Mock).mockResolvedValueOnce({
        ...mockTokens,
        scope: ['mfa_required']
      });

      await store.dispatch(login({
        email: 'test@example.com',
        password: 'password123',
        ipAddress: '127.0.0.1',
        deviceInfo: {
          userAgent: 'test-agent',
          platform: 'web',
          version: '1.0.0',
          fingerprint: 'test-fingerprint'
        }
      }));

      const state = store.getState().auth;
      expect(state.requiresMFA).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.mfaVerified).toBe(false);
    });

    test('should handle successful MFA verification', async () => {
      // Mock MFA verification
      (authService.verifyMFA as jest.Mock).mockResolvedValueOnce({
        ...mockTokens,
        scope: ['user']
      });

      await store.dispatch(verifyMFA('123456'));

      const state = store.getState().auth;
      expect(state.mfaVerified).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.loading.mfa).toBe(false);
    });

    test('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authService.login as jest.Mock).mockRejectedValueOnce({
        message: errorMessage,
        code: 'AUTH_001'
      });

      await store.dispatch(login({
        email: 'test@example.com',
        password: 'wrong-password',
        ipAddress: '127.0.0.1',
        deviceInfo: {
          userAgent: 'test-agent',
          platform: 'web',
          version: '1.0.0',
          fingerprint: 'test-fingerprint'
        }
      }));

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual(expect.objectContaining({
        message: errorMessage
      }));
    });
  });

  describe('Token Management', () => {
    test('should handle successful token refresh', async () => {
      // Mock token refresh
      (authService.refreshToken as jest.Mock).mockResolvedValueOnce({
        ...mockTokens,
        accessToken: 'new-access-token'
      });

      await store.dispatch(refreshToken());

      const state = store.getState().auth;
      expect(state.tokens?.accessToken).toBe('new-access-token');
      expect(state.lastTokenRefresh).toBeTruthy();
      expect(state.loading.refresh).toBe(false);
    });

    test('should handle token refresh failure', async () => {
      (authService.refreshToken as jest.Mock).mockRejectedValueOnce({
        message: 'Token expired',
        code: 'AUTH_002'
      });

      await store.dispatch(refreshToken());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe('Logout', () => {
    test('should handle logout correctly', async () => {
      // Set initial authenticated state
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: mockTokens
      });

      await store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(removeStorageItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEYS.ACCESS_TOKEN,
        StorageType.LOCAL
      );
    });
  });

  describe('Security Flags', () => {
    test('should update security flags', () => {
      store.dispatch(updateSecurityFlags({
        passwordChangeRequired: true,
        accountLocked: false
      }));

      const state = store.getState().auth;
      expect(state.securityFlags).toEqual({
        passwordChangeRequired: true,
        accountLocked: false
      });
    });
  });

  describe('Selectors', () => {
    test('should select authentication state correctly', () => {
      // Set some state
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          ...mockTokens,
          user: mockUser
        }
      });

      const state = store.getState();
      expect(selectIsAuthenticated(state)).toBe(true);
      expect(selectUserRole(state)).toBe(UserRole.ENTREPRENEUR);
      expect(selectMFAStatus(state)).toEqual({
        requiresMFA: false,
        mfaVerified: false
      });
    });
  });

  describe('Error Handling', () => {
    test('should clear error state', () => {
      // Set error state
      store.dispatch({
        type: 'auth/login/rejected',
        payload: {
          message: 'Test error',
          code: 'TEST_001'
        }
      });

      store.dispatch(clearError());

      const state = store.getState().auth;
      expect(state.error).toBeNull();
    });
  });
});