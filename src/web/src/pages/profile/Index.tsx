import React, { useEffect, useCallback, useMemo } from 'react';
import { Container, Grid, Typography, CircularProgress, Paper, useTheme } from '@mui/material';
import { sanitize } from 'dompurify'; // v3.0.5
import { useAppDispatch, useAppSelector } from '../../store';
import { useNotification } from '../../hooks/useNotification';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ProfileForm from '../../components/profile/ProfileForm';
import { fetchUserProfile, updateUserProfile, selectCurrentUser } from '../../store/user.slice';

/**
 * Main profile page component implementing Material Design 3.0 principles
 * with comprehensive error handling and accessibility features
 */
const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotification();

  // Redux selectors
  const currentUser = useAppSelector(selectCurrentUser);

  // Fetch user profile on mount
  useEffect(() => {
    const deviceId = window.navigator.userAgent;
    dispatch(fetchUserProfile(deviceId))
      .unwrap()
      .catch((error: Error) => {
        showError('Failed to load profile: ' + error.message);
      });
  }, [dispatch, showError]);

  // Memoized profile data for form
  const profileData = useMemo(() => {
    if (!currentUser) return null;
    return {
      name: currentUser.name,
      organization: currentUser.profile.organization,
      organizationType: currentUser.profile.title,
      email: currentUser.email,
      role: currentUser.role,
      bio: currentUser.profile.bio || '',
      phoneNumber: currentUser.profile.phone || '',
      website: currentUser.socialProfiles?.linkedin || '',
      orcidId: currentUser.socialProfiles?.orcid || '',
    };
  }, [currentUser]);

  /**
   * Handle profile update with security measures and optimistic updates
   */
  const handleProfileUpdate = useCallback(async (formData: typeof profileData) => {
    if (!formData || !currentUser) return;

    try {
      // Sanitize input data
      const sanitizedData = {
        profile: {
          organization: sanitize(formData.organization),
          title: sanitize(formData.organizationType),
          bio: sanitize(formData.bio),
          phone: sanitize(formData.phoneNumber),
          version: currentUser.profile.version + 1,
        },
        socialProfiles: {
          linkedin: sanitize(formData.website),
          orcid: sanitize(formData.orcidId),
        },
      };

      // Dispatch update action
      await dispatch(updateUserProfile({
        profileData: sanitizedData,
        version: currentUser.profile.version,
      })).unwrap();

      showSuccess('Profile updated successfully');
    } catch (error) {
      showError('Failed to update profile: ' + (error as Error).message);
    }
  }, [currentUser, dispatch, showSuccess, showError]);

  // Loading state
  if (!currentUser || !profileData) {
    return (
      <Container
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress
          size={40}
          aria-label="Loading profile"
        />
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Header Section */}
          <Grid item xs={12}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              Profile Settings
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              paragraph
            >
              Manage your profile information and preferences
            </Typography>
          </Grid>

          {/* Profile Form Section */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <ProfileForm
                user={profileData}
                onSubmit={handleProfileUpdate}
                onError={(error) => showError(error.message)}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ErrorBoundary>
  );
};

export default ProfilePage;