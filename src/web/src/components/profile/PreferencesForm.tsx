import React, { memo } from 'react';
import { Box, Switch, Select, MenuItem, FormControlLabel, CircularProgress } from '@mui/material'; // v5.14.0
import { object, string, boolean } from 'yup'; // v1.2.0
import Form from '../common/Form';
import { useNotification } from '../../hooks/useNotification';
import { UserPreferences } from '../../interfaces/user.interface';

// Validation schema for preferences form
const validationSchema = object({
  emailNotifications: object({
    updates: boolean().required('Required'),
    marketing: boolean().required('Required'),
    security: boolean().required('Required'),
  }),
  theme: string().oneOf(['light', 'dark', 'system']).required('Theme selection is required'),
  language: string().oneOf(['en', 'es', 'fr', 'de', 'zh']).required('Language selection is required'),
  timezone: string().matches(/^[A-Za-z_\/]+\/[A-Za-z_]+$/).required('Timezone selection is required'),
});

// Available language options
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
];

// Theme options
const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System Default' },
];

// Props interface
interface PreferencesFormProps {
  initialPreferences: UserPreferences;
  onSave: (preferences: UserPreferences) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Enhanced preferences form component with accessibility and internationalization support
 */
const PreferencesForm: React.FC<PreferencesFormProps> = memo(({ 
  initialPreferences, 
  onSave, 
  isLoading = false 
}) => {
  const { showSuccess, showError } = useNotification();

  // Handle form submission
  const handleSubmit = async (values: Record<string, any>, formActions: { setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      await onSave(values as UserPreferences);
      showSuccess('Preferences updated successfully');
    } catch (error) {
      showError('Failed to update preferences. Please try again.');
      throw error; // Re-throw to trigger form error state
    }
  };

  return (
    <Form
      initialValues={initialPreferences}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      accessibilityLabels={{
        form: 'User preferences form',
        submit: 'Save preferences',
        loading: 'Saving preferences...',
        success: 'Preferences saved successfully',
        error: 'Error saving preferences',
      }}
    >
      <Box
        role="region"
        aria-label="Notification preferences"
        sx={{ mb: 4 }}
      >
        <h3>Notification Preferences</h3>
        <FormControlLabel
          control={
            <Switch
              name="emailNotifications.updates"
              color="primary"
              disabled={isLoading}
            />
          }
          label="Receive platform updates"
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              name="emailNotifications.marketing"
              color="primary"
              disabled={isLoading}
            />
          }
          label="Receive marketing communications"
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              name="emailNotifications.security"
              color="primary"
              disabled={isLoading}
            />
          }
          label="Receive security alerts"
          sx={{ mb: 2 }}
        />
      </Box>

      <Box
        role="region"
        aria-label="Display preferences"
        sx={{ mb: 4 }}
      >
        <h3>Display Preferences</h3>
        <Select
          name="theme"
          label="Theme"
          fullWidth
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {themeOptions.map(option => (
            <MenuItem 
              key={option.value} 
              value={option.value}
              aria-label={`Theme: ${option.label}`}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>

        <Select
          name="language"
          label="Language"
          fullWidth
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {languageOptions.map(option => (
            <MenuItem 
              key={option.value} 
              value={option.value}
              aria-label={`Language: ${option.label}`}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>

        <Select
          name="timezone"
          label="Timezone"
          fullWidth
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {Intl.supportedValuesOf('timeZone').map(zone => (
            <MenuItem 
              key={zone} 
              value={zone}
              aria-label={`Timezone: ${zone}`}
            >
              {zone}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {isLoading && (
        <Box
          role="status"
          aria-label="Loading"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Form>
  );
});

PreferencesForm.displayName = 'PreferencesForm';

export default PreferencesForm;