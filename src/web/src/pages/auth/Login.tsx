import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { Box, Typography, Link, CircularProgress } from '@mui/material'; // ^5.14.0

import { LoginForm } from '../../components/auth/LoginForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { AuthError } from '../../interfaces/auth.interface';

/**
 * Login page component implementing secure authentication with:
 * - OAuth 2.0 + JWT authentication
 * - Multi-factor authentication (MFA)
 * - Device fingerprinting
 * - WCAG 2.1 Level AA compliance
 */
const LoginPage: React.FC = () => {
  // Hooks
  const navigate = useNavigate();
  const { handleLogin, error: authError, mfaRequired } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error on unmount
  useEffect(() => {
    return () => setError(null);
  }, []);

  /**
   * Handles successful login with enhanced security
   */
  const handleLoginSuccess = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // Handle login with credentials
      await handleLogin(credentials);

      // Handle MFA requirement
      if (mfaRequired) {
        navigate('/auth/mfa');
        return;
      }

      // Navigate to dashboard on success
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [handleLogin, mfaRequired, navigate]);

  /**
   * Handles login errors with user feedback
   */
  const handleLoginError = useCallback((error: AuthError) => {
    setLoading(false);
    setError(error.message || 'Authentication failed. Please try again.');
  }, []);

  /**
   * Handles MFA requirement redirect
   */
  const handleMFARequired = useCallback(() => {
    setLoading(false);
    navigate('/auth/mfa');
  }, [navigate]);

  return (
    <AuthLayout 
      title="Sign in to Incepta"
      maxWidth="sm"
    >
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {/* Loading indicator */}
        {loading && (
          <CircularProgress
            size={24}
            sx={{ mb: 2 }}
            aria-label="Authenticating..."
          />
        )}

        {/* Error message */}
        {(error || authError) && (
          <Typography
            color="error"
            variant="body2"
            align="center"
            sx={{ mb: 2 }}
            role="alert"
          >
            {error || (typeof authError === 'string' ? authError : authError?.message)}
          </Typography>
        )}

        {/* Login form */}
        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          onMFARequired={handleMFARequired}
          maxAttempts={5}
        />

        {/* Additional links */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link
            href="/auth/forgot-password"
            variant="body2"
            sx={{ mb: 1, display: 'block' }}
            underline="hover"
          >
            Forgot password?
          </Link>
          <Link
            href="/auth/register"
            variant="body2"
            underline="hover"
          >
            Don't have an account? Sign up
          </Link>
        </Box>

        {/* Security information */}
        <Typography
          variant="caption"
          color="textSecondary"
          align="center"
          sx={{ mt: 3 }}
        >
          Protected by enhanced security measures including device verification
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default LoginPage;