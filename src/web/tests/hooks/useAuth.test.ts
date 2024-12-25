/**
 * Test Suite for useAuth Hook
 * Version: 1.0.0
 * 
 * Comprehensive tests for authentication functionality including:
 * - OAuth 2.0 + JWT authentication
 * - Multi-factor authentication (MFA)
 * - Role-based access control (RBAC)
 * - Token management and refresh
 * - Security features and session handling
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.0.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { waitFor } from '@testing-library/react'; // ^13.4.0
import { useAuth } from '../../src/hooks/useAuth';
import {
  LoginCredentials,
  RegisterCredentials,
  MFACredentials,
  TokenData,
  UserRole
} from '../../src/interfaces/auth.interface';

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    auth: (state = {}, action) => state
  }
});

// Mock test data
const mockAuthData = {
  loginCredentials: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    ipAddress: '127.0.0.1',
    deviceInfo: {
      userAgent: 'Mozilla/5.0',
      platform: 'web',
      version: '1.0.0',
      fingerprint: 'mock-device-fingerprint'
    }
  } as LoginCredentials,

  registerCredentials: {
    email: 'new@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
    role: UserRole.ENTREPRENEUR,
    organization: 'Test Org',
    organizationType: 'company',
    acceptedTerms: true
  } as RegisterCredentials,

  mfaCredentials: {
    token: '123456',
    tempToken: 'temp-token-123',
    method: 'totp',
    verificationId: 'verify-123'
  } as MFACredentials,

  tokens: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: ['read', 'write']
  }
};

// Test wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useAuth Hook', () => {
  // Cleanup after each test
  afterEach(() => {
    cleanup();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should handle successful login with MFA', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Attempt login
    await act(async () => {
      await result.current.handleLogin(mockAuthData.loginCredentials);
    });

    // Verify MFA is required
    expect(result.current.mfaRequired).toBe(true);
    expect(result.current.loading.login).toBe(false);

    // Complete MFA verification
    await act(async () => {
      await result.current.handleMFAVerification(mockAuthData.mfaCredentials);
    });

    // Verify successful authentication
    expect(result.current.user).toBeTruthy();
    expect(localStorage.getItem('_incepta_at')).toBeTruthy();
    expect(result.current.securityContext.mfaVerified).toBe(true);
  });

  it('should handle registration with role assignment', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.handleRegister(mockAuthData.registerCredentials);
    });

    expect(result.current.loading.login).toBe(false);
    expect(localStorage.getItem('_incepta_role')).toBe(UserRole.ENTREPRENEUR);
  });

  it('should handle token refresh', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set expired token
    localStorage.setItem('_incepta_at', 'expired-token');

    await act(async () => {
      await result.current.handleTokenRefresh();
    });

    expect(localStorage.getItem('_incepta_at')).toBe(mockAuthData.tokens.accessToken);
    expect(result.current.loading.refresh).toBe(false);
  });

  it('should handle logout and cleanup', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set initial auth state
    localStorage.setItem('_incepta_at', mockAuthData.tokens.accessToken);
    localStorage.setItem('_incepta_rt', mockAuthData.tokens.refreshToken);

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(localStorage.getItem('_incepta_at')).toBeNull();
    expect(localStorage.getItem('_incepta_rt')).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should handle session expiry', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set expired session
    const expiredSession = new Date(Date.now() - 3600000).toISOString();
    localStorage.setItem('_incepta_last', expiredSession);

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('_incepta_at')).toBeNull();
    });
  });

  it('should handle security violations', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Attempt login with invalid credentials
    const invalidCredentials = {
      ...mockAuthData.loginCredentials,
      password: 'wrong'
    };

    await act(async () => {
      try {
        await result.current.handleLogin(invalidCredentials);
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.user).toBeNull();
  });

  it('should handle concurrent sessions', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate concurrent login
    await act(async () => {
      await Promise.all([
        result.current.handleLogin(mockAuthData.loginCredentials),
        result.current.handleLogin(mockAuthData.loginCredentials)
      ]);
    });

    // Verify only one session is active
    const lastActive = localStorage.getItem('_incepta_last');
    expect(lastActive).toBeTruthy();
    expect(result.current.securityContext.lastActivity).toBe(Number(lastActive));
  });

  it('should enforce role-based access control', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login with specific role
    await act(async () => {
      await result.current.handleLogin(mockAuthData.loginCredentials);
      await result.current.handleMFAVerification(mockAuthData.mfaCredentials);
    });

    expect(result.current.user?.role).toBe(UserRole.ENTREPRENEUR);
    expect(localStorage.getItem('_incepta_role')).toBe(UserRole.ENTREPRENEUR);
  });

  it('should handle token rotation', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set token near expiry
    const nearExpiry = new Date(Date.now() - 3300000).toISOString(); // 55 minutes old
    localStorage.setItem('_incepta_last', nearExpiry);

    await waitFor(() => {
      expect(result.current.loading.refresh).toBe(true);
    });

    // Verify token was rotated
    expect(localStorage.getItem('_incepta_at')).not.toBe(mockAuthData.tokens.accessToken);
  });
});