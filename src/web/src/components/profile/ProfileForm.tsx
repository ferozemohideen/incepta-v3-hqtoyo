import React, { useState, useEffect } from 'react';
import { TextField, Grid, Button, CircularProgress, Alert } from '@mui/material'; // v5.14.0
import { object, string, array, mixed } from 'yup'; // v1.2.0
import { Form } from '../common/Form';
import { useTheme } from '../../hooks/useTheme';
import ErrorBoundary from '../common/ErrorBoundary';

// Profile form validation schema
const profileValidationSchema = object().shape({
  name: string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  organization: string()
    .required('Organization is required')
    .min(2, 'Organization must be at least 2 characters')
    .max(200, 'Organization cannot exceed 200 characters'),
  organizationType: string()
    .required('Organization type is required')
    .min(2, 'Organization type must be at least 2 characters')
    .max(50, 'Organization type cannot exceed 50 characters'),
  email: string()
    .required('Email is required')
    .email('Invalid email format'),
  role: string()
    .required('Role is required')
    .oneOf(['admin', 'tto', 'entrepreneur', 'researcher', 'guest'], 'Invalid role'),
  researchInterests: array().of(string()),
  bio: string()
    .max(500, 'Bio cannot exceed 500 characters'),
  phoneNumber: string()
    .matches(/^\+?[\d\s-()]+$/, 'Invalid phone number format'),
  website: string()
    .url('Invalid website URL'),
  orcidId: string()
    .matches(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'Invalid ORCID ID format'),
});

// Profile form props interface
interface ProfileFormProps {
  user: User;
  onSubmit: (profile: UserProfile) => Promise<void>;
  onError: (error: Error) => void;
}

// User profile interface
interface UserProfile {
  name: string;
  organization: string;
  organizationType: string;
  email: string;
  role: string;
  researchInterests: string[];
  bio?: string;
  phoneNumber?: string;
  website?: string;
  orcidId?: string;
}

/**
 * Enhanced profile form component implementing Material Design 3.0 principles
 * with comprehensive validation, security, and accessibility features.
 */
export const ProfileForm: React.FC<ProfileFormProps> = ({
  user,
  onSubmit,
  onError,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mode: themeMode } = useTheme();

  // Initialize form with user data
  const initialValues: UserProfile = {
    name: user.name || '',
    organization: user.organization || '',
    organizationType: user.organizationType || '',
    email: user.email || '',
    role: user.role || '',
    researchInterests: user.researchInterests || [],
    bio: user.bio || '',
    phoneNumber: user.phoneNumber || '',
    website: user.website || '',
    orcidId: user.orcidId || '',
  };

  // Handle form submission with security measures
  const handleSubmit = async (values: UserProfile) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate form data
      await profileValidationSchema.validate(values, { abortEarly: false });

      // Submit form data
      await onSubmit(values);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitError(errorMessage);
      onError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary>
      <Form
        initialValues={initialValues}
        validationSchema={profileValidationSchema}
        onSubmit={handleSubmit}
        securityOptions={{
          enableFingerprinting: true,
          validationLevel: 'strict',
        }}
        accessibilityLabels={{
          form: 'Profile Information Form',
          submit: 'Save Profile Changes',
        }}
      >
        <Grid container spacing={3}>
          {/* Personal Information Section */}
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Full Name"
              required
              fullWidth
              autoComplete="name"
              inputProps={{
                'aria-label': 'Full Name',
                maxLength: 100,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="email"
              label="Email Address"
              required
              fullWidth
              autoComplete="email"
              type="email"
              inputProps={{
                'aria-label': 'Email Address',
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="phoneNumber"
              label="Phone Number"
              fullWidth
              autoComplete="tel"
              inputProps={{
                'aria-label': 'Phone Number',
                pattern: '^\\+?[\\d\\s-()]+$',
              }}
            />
          </Grid>

          {/* Organization Information Section */}
          <Grid item xs={12} md={6}>
            <TextField
              name="organization"
              label="Organization"
              required
              fullWidth
              inputProps={{
                'aria-label': 'Organization Name',
                maxLength: 200,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="organizationType"
              label="Organization Type"
              required
              fullWidth
              inputProps={{
                'aria-label': 'Organization Type',
                maxLength: 50,
              }}
            />
          </Grid>

          {/* Professional Information Section */}
          <Grid item xs={12}>
            <TextField
              name="bio"
              label="Professional Bio"
              multiline
              rows={4}
              fullWidth
              inputProps={{
                'aria-label': 'Professional Bio',
                maxLength: 500,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="website"
              label="Website"
              fullWidth
              type="url"
              inputProps={{
                'aria-label': 'Website URL',
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="orcidId"
              label="ORCID ID"
              fullWidth
              inputProps={{
                'aria-label': 'ORCID ID',
                pattern: '^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$',
              }}
            />
          </Grid>

          {/* Error Display */}
          {submitError && (
            <Grid item xs={12}>
              <Alert 
                severity="error"
                onClose={() => setSubmitError(null)}
                sx={{ mb: 2 }}
              >
                {submitError}
              </Alert>
            </Grid>
          )}

          {/* Form Actions */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              sx={{
                minWidth: 120,
                position: 'relative',
              }}
            >
              {isSubmitting ? (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              ) : (
                'Save Changes'
              )}
            </Button>
          </Grid>
        </Grid>
      </Form>
    </ErrorBoundary>
  );
};

export default ProfileForm;