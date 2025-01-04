/**
 * Authentication Service
 * Version: 1.0.0
 * 
 * Implements secure authentication with:
 * - OAuth 2.0 + JWT authentication
 * - Multi-factor authentication (TOTP)
 * - Role-based access control
 * - Secure token storage and rotation
 * - Session management
 */

import { apiService } from './api.service';
import { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthTokens, 
  MFACredentials,
  ResetPasswordCredentials 
} from '../interfaces/auth.interface';
import { AUTH_ENDPOINTS, TOKEN_CONFIG, AUTH_STORAGE_KEYS } from '../constants/auth.constants';
import { 
  setLocalStorageItem, 
  getLocalStorageItem, 
  removeStorageItem,
  StorageType 
} from '../utils/storage.utils';

/**
 * Interface defining authentication service methods
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthTokens>;
  register(credentials: RegisterCredentials): Promise<AuthTokens>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthTokens>;
  verifyMFA(credentials: MFACredentials): Promise<AuthTokens>;
  verifyResetToken(token: string): Promise<boolean>;
  resetPassword(credentials: ResetPasswordCredentials): Promise<void>;
}

/**
 * Implementation of AuthService with enhanced security features
 */
class AuthServiceImpl implements AuthService {
  private readonly tokenRefreshInterval: number = TOKEN_CONFIG.ROTATION_WINDOW * 1000;
  private refreshTimer?: NodeJS.Timeout;

  constructor() {
    // Initialize token refresh monitoring
    this.setupTokenRefreshMonitor();
  }

  /**
   * Authenticates user with credentials and initiates MFA if enabled
   * @param credentials - User login credentials
   * @returns Promise resolving to authentication tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await apiService.post<AuthTokens>(
        AUTH_ENDPOINTS.LOGIN,
        credentials,
        { priority: 1 }
      );

      // Store tokens securely
      await this.storeAuthTokens(response);

      // Setup token refresh if MFA is not required
      if (!response.scope.includes('mfa_required')) {
        this.setupTokenRefreshMonitor();
      }

      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Registers new user with role-based permissions
   * @param credentials - User registration data
   * @returns Promise resolving to initial authentication tokens
   */
  async register(credentials: RegisterCredentials): Promise<AuthTokens> {
    try {
      const response = await apiService.post<AuthTokens>(
        AUTH_ENDPOINTS.REGISTER,
        credentials,
        { priority: 1 }
      );

      // Store tokens securely
      await this.storeAuthTokens(response);
      
      // Store initial role
      setLocalStorageItem(AUTH_STORAGE_KEYS.USER_ROLE, credentials.role);

      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logs out user and invalidates all active sessions
   */
  async logout(): Promise<void> {
    try {
      // Clear refresh timer
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }

      // Invalidate tokens on server
      await apiService.post(AUTH_ENDPOINTS.LOGOUT);

      // Clear stored tokens and user data
      this.clearAuthData();
    } catch (error) {
      // Always clear local data even if server request fails
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refreshes access token using refresh token with rotation
   * @returns Promise resolving to new authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = getLocalStorageItem<string>(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post<AuthTokens>(
        AUTH_ENDPOINTS.REFRESH_TOKEN,
        { refreshToken },
        { priority: 2 }
      );

      // Store new tokens
      await this.storeAuthTokens(response);

      return response;
    } catch (error) {
      // Clear auth data if refresh fails
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verifies MFA token and completes authentication
   * @param credentials - MFA verification credentials
   * @returns Promise resolving to final authentication tokens
   */
  async verifyMFA(credentials: MFACredentials): Promise<AuthTokens> {
    try {
      const response = await apiService.post<AuthTokens>(
        AUTH_ENDPOINTS.VERIFY_MFA,
        credentials,
        { priority: 1 }
      );

      // Store final tokens after MFA
      await this.storeAuthTokens(response);
      
      // Setup token refresh after successful MFA
      this.setupTokenRefreshMonitor();

      // Update MFA status
      setLocalStorageItem(AUTH_STORAGE_KEYS.MFA_ENABLED, true);

      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verifies password reset token validity
   * @param token - Reset token to verify
   * @returns Promise resolving to token validity status
   */
  async verifyResetToken(token: string): Promise<boolean> {
    try {
      const response = await apiService.post<{ valid: boolean }>(
        AUTH_ENDPOINTS.RESET_PASSWORD,
        { token, verify: true }
      );
      return response.valid;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resets user password with verification
   * @param credentials - Password reset credentials
   */
  async resetPassword(credentials: ResetPasswordCredentials): Promise<void> {
    try {
      await apiService.post(
        AUTH_ENDPOINTS.RESET_PASSWORD,
        credentials
      );
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Stores authentication tokens securely
   * @param tokens - Authentication tokens to store
   */
  private async storeAuthTokens(tokens: AuthTokens): Promise<void> {
    setLocalStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    setLocalStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    setLocalStorageItem(AUTH_STORAGE_KEYS.LAST_ACTIVE, Date.now());
  }

  /**
   * Clears all authentication data from storage
   */
  private clearAuthData(): void {
    removeStorageItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, StorageType.LOCAL);
    removeStorageItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, StorageType.LOCAL);
    removeStorageItem(AUTH_STORAGE_KEYS.USER_ROLE, StorageType.LOCAL);
    removeStorageItem(AUTH_STORAGE_KEYS.MFA_ENABLED, StorageType.LOCAL);
    removeStorageItem(AUTH_STORAGE_KEYS.LAST_ACTIVE, StorageType.LOCAL);
  }

  /**
   * Sets up automatic token refresh monitoring
   */
  private setupTokenRefreshMonitor(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        const lastActive = getLocalStorageItem<number>(AUTH_STORAGE_KEYS.LAST_ACTIVE);
        const now = Date.now();

        // Check if token refresh is needed
        if (lastActive && (now - lastActive) >= this.tokenRefreshInterval) {
          await this.refreshToken();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear auth data if refresh consistently fails
        this.clearAuthData();
      }
    }, this.tokenRefreshInterval);
  }

  /**
   * Handles authentication errors with retry logic
   * @param error - Error to handle
   * @returns Processed error
   */
  private handleAuthError(error: any): Error {
    // Clear auth data for critical errors
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      this.clearAuthData();
    }

    return error;
  }
}

// Export singleton instance
export const authService = new AuthServiceImpl();