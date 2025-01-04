import React, { useState, useCallback } from 'react';
import { 
  TextField, 
  Select, 
  MenuItem, 
  Button, 
  CircularProgress,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Checkbox,
  FormControlLabel
} from '@mui/material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import zxcvbn from 'zxcvbn'; // v4.4.2

import { Form } from '../common/Form';
import { useNotification } from '../../hooks/useNotification';
import { UserRole, PASSWORD_POLICY } from '../../constants/auth.constants';
import type { RegisterCredentials, AuthTokens } from '../../interfaces/auth.interface';

// Styled components for enhanced form layout
const StyledFormContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  margin: '0 auto',
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const PasswordStrengthMeter = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  '& .strength-bar': {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.palette.grey[200],
    position: 'relative',
    marginTop: theme.spacing(1),
  },
  '& .strength-indicator': {
    height: '100%',
    borderRadius: 2,
    transition: theme.transitions.create('all'),
  },
}));

// Props interface
interface RegisterFormProps {
  onSuccess: (tokens: AuthTokens, deviceId: string) => void;
  allowedRoles: UserRole[];
  organizationTypes: string[];
}

// Initial form values
const initialValues: RegisterCredentials = {
  email: '',
  password: '',
  name: '',
  role: UserRole.ENTREPRENEUR,
  organization: '',
  organizationType: '',
  acceptedTerms: false,
};

// Password strength colors
const strengthColors: Record<number, string> = {
  0: '#ff4444',
  1: '#ffbb33',
  2: '#ffbb33',
  3: '#00C851',
  4: '#007E33',
};

/**
 * Enhanced registration form component with security features and accessibility support
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  allowedRoles,
  organizationTypes,
}) => {
  // State for password strength and validation
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError, showSuccess } = useNotification();

  // Form validation schema
  const validationSchema = {
    email: {
      required: true,
      pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      validate: async () => {
        // Add domain validation for organization emails if needed
        return true;
      },
    },
    password: {
      required: true,
      minLength: PASSWORD_POLICY.MIN_LENGTH,
      validate: (value: string) => {
        const result = zxcvbn(value);
        return result.score >= 3 || 'Password is too weak';
      },
    },
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    role: {
      required: true,
      validate: (value: string) => allowedRoles.includes(value as UserRole),
    },
    organization: {
      required: true,
      minLength: 2,
      maxLength: 200,
    },
    organizationType: {
      required: true,
    },
    acceptedTerms: {
      validate: (value: boolean) => value === true || 'You must accept the terms',
    },
  };

  // Handle password strength calculation
  const calculatePasswordStrength = useCallback((password: string) => {
    const result = zxcvbn(password);
    setPasswordStrength(result.score);
    return result.feedback.warning || '';
  }, []);

  // Handle form submission
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      setIsSubmitting(true);

      // Generate device fingerprint for security
      const deviceId = await generateDeviceFingerprint();

      // Submit registration with enhanced security context
      const tokens = await registerUser({
        ...values as RegisterCredentials,
        deviceInfo: {
          fingerprint: deviceId,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          version: '1.0.0',
        },
      });

      showSuccess('Registration successful! Setting up MFA...');
      onSuccess(tokens, deviceId);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StyledFormContainer>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Create Account
      </Typography>

      <Form
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        securityOptions={{
          enableFingerprinting: true,
          rateLimitAttempts: 5,
          validationLevel: 'strict',
        }}
        accessibilityLabels={{
          form: 'Registration Form',
          submit: 'Create Account',
          loading: 'Creating account...',
        }}
      >
        <TextField
          name="email"
          label="Email Address"
          type="email"
          required
          fullWidth
          autoComplete="email"
          aria-describedby="email-helper-text"
        />

        <TextField
          name="password"
          label="Password"
          type="password"
          required
          fullWidth
          autoComplete="new-password"
          onChange={(e) => calculatePasswordStrength(e.target.value)}
        />

        <PasswordStrengthMeter>
          <Typography variant="caption" color="textSecondary">
            Password Strength: {['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][passwordStrength]}
          </Typography>
          <div className="strength-bar">
            <div
              className="strength-indicator"
              style={{
                width: `${(passwordStrength + 1) * 20}%`,
                backgroundColor: strengthColors[passwordStrength],
              }}
            />
          </div>
        </PasswordStrengthMeter>

        <TextField
          name="name"
          label="Full Name"
          required
          fullWidth
          autoComplete="name"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="role-label">Role</InputLabel>
          <Select
            name="role"
            labelId="role-label"
            label="Role"
            required
          >
            {allowedRoles.map((role) => (
              <MenuItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          name="organization"
          label="Organization"
          required
          fullWidth
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="org-type-label">Organization Type</InputLabel>
          <Select
            name="organizationType"
            labelId="org-type-label"
            label="Organization Type"
            required
          >
            {organizationTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              name="acceptedTerms"
              color="primary"
              required
            />
          }
          label={
            <Typography variant="body2">
              I accept the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </Typography>
          }
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3 }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Create Account'
          )}
        </Button>
      </Form>
    </StyledFormContainer>
  );
};

// Helper function to generate device fingerprint
async function generateDeviceFingerprint(): Promise<string> {
  // Implementation would use FingerprintJS or similar
  return 'device-id';
}

// Helper function to register user
async function registerUser(data: RegisterCredentials & { deviceInfo: any }): Promise<AuthTokens> {
  // Implementation would call API endpoint
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: ['user'],
  };
}

export default RegisterForm;