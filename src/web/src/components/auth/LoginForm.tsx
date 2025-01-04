import React, { useState, useEffect } from 'react'; // ^18.0.0
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  FormHelperText,
} from '@mui/material'; // ^5.14.0
import { Visibility, VisibilityOff } from '@mui/icons-material'; // ^5.14.0
import DOMPurify from 'dompurify'; // ^3.0.0
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // ^3.4.0

import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { LoginCredentials, AuthTokens, AuthError } from '../../interfaces/auth.interface';

// Initialize fingerprint generator
const fpPromise = FingerprintJS.load();

interface LoginFormProps {
  onSuccess: (tokens: AuthTokens) => void;
  onMFARequired: () => void;
  onError: (error: AuthError) => void;
  maxAttempts?: number;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onMFARequired,
  onError,
  maxAttempts = 5
}) => {
  // State management
  const [showPassword, setShowPassword] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [attempts, setAttempts] = useState(0);

  // Custom hooks
  const { handleLogin, loading, error, mfaRequired } = useAuth();
  const { values, errors, handleChange, handleSubmit, validateField } = useForm<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
      deviceInfo: {
        userAgent: '',
        platform: '',
        version: '',
        fingerprint: ''
      },
      ipAddress: ''
    },
    validationSchema: {
      email: {
        required: true,
        pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        validate: (value) => {
          return DOMPurify.sanitize(value) === value;
        }
      },
      password: {
        required: true,
        minLength: 12,
        validate: (value) => {
          return DOMPurify.sanitize(value) === value;
        }
      }
    },
    onSubmit: async (formValues) => {
      if (attempts >= maxAttempts) {
        onError({ 
          message: 'Maximum login attempts exceeded. Please try again later.',
          code: 'MAX_ATTEMPTS_EXCEEDED',
          status: 429,
          timestamp: new Date()
        });
        return;
      }

      try {
        const response = await handleLogin({
          ...formValues,
          deviceInfo: {
            userAgent: window.navigator.userAgent,
            platform: window.navigator.platform,
            version: window.navigator.appVersion,
            fingerprint: deviceFingerprint
          }
        });

        if (mfaRequired) {
          onMFARequired();
        } else if (response) {
          onSuccess(response);
        }
      } catch (err) {
        setAttempts(prev => prev + 1);
        onError(err as AuthError);
      }
    }
  });

  // Generate device fingerprint on mount
  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const fp = await fpPromise;
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (err) {
        console.error('Failed to generate device fingerprint:', err);
      }
    };

    generateFingerprint();
  }, []);

  // Handle password visibility toggle
  const handlePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Keyboard accessibility
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit(event as any);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Login form"
      sx={{
        width: '100%',
        maxWidth: 400,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      {error && (
        <Alert 
          severity="error" 
          aria-live="polite"
          sx={{ mb: 2 }}
        >
          {error.message}
        </Alert>
      )}

      <TextField
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={values.email}
        onChange={handleChange}
        error={!!errors.email}
        helperText={errors.email}
        disabled={loading}
        required
        fullWidth
        autoComplete="email"
        autoFocus
        inputProps={{
          'aria-label': 'Email address',
          'aria-describedby': errors.email ? 'email-error' : undefined
        }}
      />

      <TextField
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        value={values.password}
        onChange={handleChange}
        error={!!errors.password}
        helperText={errors.password}
        disabled={loading}
        required
        fullWidth
        autoComplete="current-password"
        InputProps={{
          'aria-label': 'Password',
          'aria-describedby': errors.password ? 'password-error' : undefined,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={handlePasswordVisibility}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      {attempts > 0 && (
        <FormHelperText error>
          {`${maxAttempts - attempts} login attempts remaining`}
        </FormHelperText>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        fullWidth
        sx={{ mt: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Sign In'
        )}
      </Button>

      {deviceFingerprint && (
        <Typography
          variant="caption"
          color="textSecondary"
          align="center"
          sx={{ mt: 2 }}
        >
          Secured with device verification
        </Typography>
      )}
    </Box>
  );
};

export default LoginForm;