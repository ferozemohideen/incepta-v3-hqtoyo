import React, { useState, useCallback, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { object, string, ref } from 'yup';
import { debounce } from 'lodash';

import Form from '../common/Form';
import { ResetPasswordCredentials } from '../../interfaces/auth.interface';
import { authService } from '../../services/auth.service';
import { useNotification } from '../../hooks/useNotification';

// Constants for rate limiting
const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT = 300000; // 5 minutes

// Validation schema following NIST guidelines
const validationSchema = object().shape({
  newPassword: string()
    .required('Password is required')
    .min(12, 'Password must be at least 12 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Password must contain uppercase, lowercase, numbers, and special characters'
    ),
  confirmPassword: string()
    .required('Please confirm password')
    .oneOf([ref('newPassword')], 'Passwords must match')
});

interface ResetPasswordFormProps {
  token: string;
  email: string;
}

interface ResetPasswordState {
  isLoading: boolean;
  isTokenValid: boolean;
  error: string;
  attempts: number;
}

/**
 * Password reset form component with enhanced security and accessibility features
 */
export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = memo(({ token, email }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [state, setState] = useState<ResetPasswordState>({
    isLoading: true,
    isTokenValid: false,
    error: '',
    attempts: 0
  });

  // Verify token validity on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const isValid = await authService.verifyResetToken(token);
        setState(prev => ({ ...prev, isLoading: false, isTokenValid: isValid }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Invalid or expired reset token'
        }));
      }
    };

    verifyToken();
  }, [token]);

  // Debounced validation to prevent rapid attempts
  const debouncedValidation = useCallback(
    debounce(async (values: ResetPasswordCredentials) => {
      try {
        await validationSchema.validate(values, { abortEarly: false });
      } catch (error) {
        if (error instanceof Error) {
          showError(error.message);
        }
      }
    }, 300),
    []
  );

  // Handle form submission with rate limiting
  const handleResetPassword = async (values: ResetPasswordCredentials) => {
    // Check rate limiting
    if (state.attempts >= MAX_ATTEMPTS) {
      showError(`Too many attempts. Please try again in ${ATTEMPT_TIMEOUT / 60000} minutes.`);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      await authService.resetPassword({
        email,
        token,
        newPassword: values.newPassword
      });

      showSuccess('Password has been reset successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      setState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        error: error instanceof Error ? error.message : 'Failed to reset password'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (state.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress aria-label="Verifying reset token" />
      </Box>
    );
  }

  if (!state.isTokenValid) {
    return (
      <Alert 
        severity="error"
        aria-live="polite"
        sx={{ mb: 2 }}
      >
        {state.error || 'Invalid or expired reset token'}
      </Alert>
    );
  }

  return (
    <Form
      initialValues={{ newPassword: '', confirmPassword: '' }}
      validationSchema={validationSchema}
      onSubmit={handleResetPassword}
      accessibilityLabels={{
        form: 'Password reset form',
        submit: 'Reset password',
        loading: 'Resetting password...',
        success: 'Password reset successful',
        error: 'Password reset failed'
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        Reset Your Password
      </Typography>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Please enter your new password below. Password must be at least 12 characters
        and include uppercase, lowercase, numbers, and special characters.
      </Typography>

      <TextField
        name="newPassword"
        type="password"
        label="New Password"
        required
        fullWidth
        autoComplete="new-password"
        sx={{ mb: 2 }}
      />

      <TextField
        name="confirmPassword"
        type="password"
        label="Confirm Password"
        required
        fullWidth
        autoComplete="new-password"
        sx={{ mb: 3 }}
      />

      {state.error && (
        <Alert 
          severity="error"
          aria-live="polite"
          sx={{ mb: 2 }}
        >
          {state.error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={state.isLoading}
        aria-label="Reset password"
      >
        {state.isLoading ? <CircularProgress size={24} /> : 'Reset Password'}
      </Button>
    </Form>
  );
});

ResetPasswordForm.displayName = 'ResetPasswordForm';

export default ResetPasswordForm;