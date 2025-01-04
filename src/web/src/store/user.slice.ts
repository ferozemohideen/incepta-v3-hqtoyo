/**
 * User Redux Slice
 * Version: 1.0.0
 * 
 * Implements comprehensive user state management with enhanced security features,
 * version control, and audit logging for the Incepta platform.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { User, UserProfile, UserPreferences, UserSecurity, SecurityContext } from '../interfaces/user.interface';
import { userService } from '../services/user.service';

/**
 * Enhanced interface for user slice state with security tracking
 */
interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isProfileUpdating: boolean;
  isPreferencesUpdating: boolean;
  isSecurityUpdating: boolean;
  lastError: string | null;
  securityContext: SecurityContext | null;
  retryAttempts: Record<string, number>;
  auditLog: Record<string, string>;
}

/**
 * Initial state with security defaults
 */
const initialState: UserState = {
  currentUser: null,
  loading: false,
  error: null,
  isProfileUpdating: false,
  isPreferencesUpdating: false,
  isSecurityUpdating: false,
  lastError: null,
  securityContext: null,
  retryAttempts: {},
  auditLog: {}
};

/**
 * Security audit levels for logging
 */
const SECURITY_AUDIT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
} as const;

/**
 * Async thunk for fetching user profile with enhanced security validation
 */
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await userService.getProfile();
      
      // Validate security context
      const securityContext = await userService.validateSecurityContext({
        deviceId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      if (!securityContext.valid) {
        throw new Error('Invalid security context');
      }

      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for updating user profile with version control
 */
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async ({ profileData, version }: { profileData: Partial<UserProfile>; version: number }, 
    { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(profileData, version);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for updating user preferences with accessibility validation
 */
export const updateUserPreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<UserPreferences>, { rejectWithValue }) => {
    try {
      const response = await userService.updatePreferences(preferences, preferences.accessibility!);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for updating security settings with audit logging
 */
export const updateSecuritySettings = createAsyncThunk(
  'user/updateSecurity',
  async (settings: Partial<UserSecurity>, { rejectWithValue }) => {
    try {
      const response = await userService.updateSecuritySettings(settings);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * User slice with enhanced security features and comprehensive error handling
 */
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.lastError = null;
    },
    logSecurityEvent: (state, action: PayloadAction<{ type: keyof typeof SECURITY_AUDIT_LEVELS; message: string }>) => {
      const timestamp = new Date().toISOString();
      state.auditLog[timestamp] = `[${action.payload.type}] ${action.payload.message}`;
    },
    resetRetryAttempts: (state) => {
      state.retryAttempts = {};
    }
  },
  extraReducers: (builder) => {
    // Fetch Profile Reducers
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.retryAttempts = {};
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.INFO}] Profile fetched successfully`;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.lastError = new Date().toISOString();
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.ERROR}] Profile fetch failed: ${action.payload}`;
      })

    // Update Profile Reducers
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isProfileUpdating = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isProfileUpdating = false;
        state.currentUser = action.payload;
        state.retryAttempts = {};
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.INFO}] Profile updated successfully`;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isProfileUpdating = false;
        state.error = action.payload as string;
        state.lastError = new Date().toISOString();
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.ERROR}] Profile update failed: ${action.payload}`;
      })

    // Update Preferences Reducers
    builder
      .addCase(updateUserPreferences.pending, (state) => {
        state.isPreferencesUpdating = true;
        state.error = null;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.isPreferencesUpdating = false;
        state.currentUser = action.payload;
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.INFO}] Preferences updated successfully`;
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.isPreferencesUpdating = false;
        state.error = action.payload as string;
        state.lastError = new Date().toISOString();
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.ERROR}] Preferences update failed: ${action.payload}`;
      })

    // Update Security Settings Reducers
    builder
      .addCase(updateSecuritySettings.pending, (state) => {
        state.isSecurityUpdating = true;
        state.error = null;
      })
      .addCase(updateSecuritySettings.fulfilled, (state, action) => {
        state.isSecurityUpdating = false;
        state.currentUser = action.payload;
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.INFO}] Security settings updated successfully`;
      })
      .addCase(updateSecuritySettings.rejected, (state, action) => {
        state.isSecurityUpdating = false;
        state.error = action.payload as string;
        state.lastError = new Date().toISOString();
        state.auditLog[new Date().toISOString()] = `[${SECURITY_AUDIT_LEVELS.ERROR}] Security settings update failed: ${action.payload}`;
      });
  }
});

// Export actions
export const { clearError, logSecurityEvent, resetRetryAttempts } = userSlice.actions;

// Export selectors
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectUserSecurityContext = (state: { user: UserState }) => state.user.securityContext;
export const selectUserUpdateStatus = (state: { user: UserState }) => ({
  isProfileUpdating: state.user.isProfileUpdating,
  isPreferencesUpdating: state.user.isPreferencesUpdating,
  isSecurityUpdating: state.user.isSecurityUpdating
});
export const selectUserErrors = (state: { user: UserState }) => ({
  error: state.user.error,
  lastError: state.user.lastError
});

// Export reducer
export default userSlice.reducer;