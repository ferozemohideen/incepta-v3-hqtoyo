import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'; // v5.14.0
import { useNavigate } from 'react-router-dom'; // v6.14.0

// Internal imports
import SecuritySettings from '../../components/profile/SecuritySettings';
import PreferencesForm from '../../components/profile/PreferencesForm';
import { useAuth } from '../../hooks/useAuth';
import { UserPreferences, UserSecurity } from '../../interfaces/user.interface';

/**
 * Interface for accessible tab panel props
 */
interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
  ariaLabel: string;
  focusable?: boolean;
}

/**
 * Enhanced accessible tab panel component
 */
const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  ariaLabel,
  focusable = true,
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      aria-label={ariaLabel}
      tabIndex={focusable && value === index ? 0 : -1}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

/**
 * Enhanced settings page component implementing comprehensive user settings management
 * with improved security features and accessibility compliance
 */
const Settings: React.FC = () => {
  // Initialize hooks
  const { user } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  /**
   * Handle tab changes with accessibility focus management
   */
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Reset status messages on tab change
    setUpdateError(null);
    setUpdateSuccess(null);
  }, []);

  /**
   * Handle security settings updates with enhanced validation and audit logging
   */
  const handleSecurityUpdate = useCallback(async (security: Partial<UserSecurity>) => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      // Create security audit log entry
      const auditLog = {
        timestamp: new Date(),
        userId: user?.id,
        action: 'security_update',
        changes: security,
      };

      // Update security settings with audit log
      await onUpdate({ ...security, auditLog });
      setUpdateSuccess('Security settings updated successfully');
    } catch (error) {
      setUpdateError('Failed to update security settings. Please try again.');
      console.error('Security update error:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [user]);

  /**
   * Handle preferences updates with validation
   */
  const handlePreferencesUpdate = useCallback(async (preferences: UserPreferences) => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      await onUpdate({ preferences });
      setUpdateSuccess('Preferences updated successfully');
    } catch (error) {
      setUpdateError('Failed to update preferences. Please try again.');
      console.error('Preferences update error:', error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Render loading state if user data is not available
  if (!user) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Account Settings
        </Typography>

        {/* Status messages */}
        {updateSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {updateSuccess}
          </Alert>
        )}
        {updateError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateError}
          </Alert>
        )}

        {/* Enhanced accessible tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Settings sections"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Security" 
            id="settings-tab-0"
            aria-controls="settings-tabpanel-0"
          />
          <Tab 
            label="Preferences" 
            id="settings-tab-1"
            aria-controls="settings-tabpanel-1"
          />
        </Tabs>

        {/* Security Settings Tab */}
        <TabPanel 
          value={activeTab} 
          index={0}
          ariaLabel="Security settings section"
        >
          <SecuritySettings
            userSecurity={user.security}
            onUpdate={handleSecurityUpdate}
          />
        </TabPanel>

        {/* Preferences Tab */}
        <TabPanel 
          value={activeTab} 
          index={1}
          ariaLabel="Preferences section"
        >
          <PreferencesForm
            initialPreferences={user.preferences}
            onSave={handlePreferencesUpdate}
            isLoading={isUpdating}
          />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default Settings;