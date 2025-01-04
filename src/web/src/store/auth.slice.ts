/**
 * Authentication Redux Slice
 * Version: 1.0.0
 * 
 * Implements comprehensive authentication state management with:
 * - OAuth 2.0 + JWT authentication
 * - Multi-factor authentication (MFA)
 * - Role-based access control (RBAC)
 * - Secure token storage and rotation
 * - Session management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import { LoginCredentials, AuthTokens, RegisterCredentials } from '../interfaces/auth.interface';
import { UserRole } from '../constants/auth.constants';
import { authService } from '../services/auth.service';
import { setLocalStorageItem, removeStorageItem, StorageType } from '../utils/storage.utils';
import { AUTH_STORAGE_KEYS, TOKEN_CONFIG } from '../constants/auth.constants';

/**
 * Interface for enhanced authentication state
 */
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    permissions: string[];
    lastLogin: Date;
  } | null;
  tokens: AuthTokens | null;
  loading: {
    login: boolean;
    refresh: boolean;
    mfa: boolean;
  };
  error: {
    message: string;
    code: string;
    timestamp: Date;
  } | null;
  requiresMFA: boolean;
  mfaVerified: boolean;
  sessionExpiry: Date | null;
  lastTokenRefresh: Date | null;
  securityFlags: {
    passwordChangeRequired: boolean;
    accountLocked: boolean;
  };
}

/**
 * Initial authentication state
 */
const initialState: AuthState = {
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
};

/**
 * Async thunk for user registration
 */
export const register = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.register(credentials);
      
      // Store tokens securely
      setLocalStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      setLocalStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      return response;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
        timestamp: new Date()
      });
    }
  }
);

/**
 * Async thunk for user login with MFA support
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      
      // Store tokens securely
      setLocalStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      setLocalStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      return response;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
        timestamp: new Date()
      });
    }
  }
);

/**
 * Async thunk for MFA verification
 */
export const verifyMFA = createAsyncThunk(
  'auth/verifyMFA',
  async (mfaData: { token: string; tempToken: string; method: string; verificationId: string }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyMFA({
        token: mfaData.token,
        tempToken: mfaData.tempToken,
        method: mfaData.method,
        verificationId: mfaData.verificationId
      });
      return response;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
        timestamp: new Date()
      });
    }
  }
);

/**
 * Async thunk for token refresh
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken();
      
      // Update stored tokens
      setLocalStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      setLocalStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      return response;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        code: error.code,
        timestamp: new Date()
      });
    }
  }
);

/**
 * Authentication slice with comprehensive state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // Clear all auth data
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = null;
      state.requiresMFA = false;
      state.mfaVerified = false;
      state.sessionExpiry = null;
      state.lastTokenRefresh = null;
      
      // Clear stored tokens
      removeStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, StorageType.LOCAL);
      removeStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, StorageType.LOCAL);
    },
    clearError: (state) => {
      state.error = null;
    },
    updateSecurityFlags: (state, action) => {
      state.securityFlags = {
        ...state.securityFlags,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    // Register reducers
    builder.addCase(register.pending, (state) => {
      state.loading.login = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading.login = false;
      state.tokens = action.payload;
      state.isAuthenticated = true;
      state.lastTokenRefresh = new Date();
      state.sessionExpiry = new Date(Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000);
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading.login = false;
      state.error = action.payload as AuthState['error'];
    });

    // Login reducers
    builder.addCase(login.pending, (state) => {
      state.loading.login = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading.login = false;
      state.tokens = action.payload;
      state.requiresMFA = action.payload.scope.includes('mfa_required');
      state.lastTokenRefresh = new Date();
      state.sessionExpiry = new Date(Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000);
      
      if (!state.requiresMFA) {
        state.isAuthenticated = true;
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading.login = false;
      state.error = action.payload as AuthState['error'];
    });

    // MFA verification reducers
    builder.addCase(verifyMFA.pending, (state) => {
      state.loading.mfa = true;
      state.error = null;
    });
    builder.addCase(verifyMFA.fulfilled, (state, action) => {
      state.loading.mfa = false;
      state.mfaVerified = true;
      state.isAuthenticated = true;
      state.tokens = action.payload;
    });
    builder.addCase(verifyMFA.rejected, (state, action) => {
      state.loading.mfa = false;
      state.error = action.payload as AuthState['error'];
    });

    // Token refresh reducers
    builder.addCase(refreshToken.pending, (state) => {
      state.loading.refresh = true;
      state.error = null;
    });
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.loading.refresh = false;
      state.tokens = action.payload;
      state.lastTokenRefresh = new Date();
      state.sessionExpiry = new Date(Date.now() + TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY * 1000);
    });
    builder.addCase(refreshToken.rejected, (state, action) => {
      state.loading.refresh = false;
      state.error = action.payload as AuthState['error'];
      state.isAuthenticated = false;
    });
  }
});

// Export actions
export const { logout, clearError, updateSecurityFlags } = authSlice.actions;

// Memoized selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;
export const selectMFAStatus = (state: { auth: AuthState }) => ({
  requiresMFA: state.auth.requiresMFA,
  mfaVerified: state.auth.mfaVerified
});
export const selectTokens = (state: { auth: AuthState }) => state.auth.tokens;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectSecurityFlags = (state: { auth: AuthState }) => state.auth.securityFlags;

// Export reducer
export default authSlice.reducer;