import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LockOutlined,
  SaveOutlined,
  EmailOutlined,
  DownloadOutlined,
} from '@mui/icons-material';

import {
  Technology,
  PatentStatus,
  DevelopmentStage,
  TechnologyPermissions,
} from '../../interfaces/technology.interface';
import CustomCard from '../common/Card';
import ErrorBoundary from '../common/ErrorBoundary';
import { technologyService } from '../../services/technology.service';
import { useNotification } from '../../hooks/useNotification';
import { SPACING, ANIMATION } from '../../constants/ui.constants';

// Props interface for the component
interface TechnologyDetailsProps {
  id?: string;
  onSave?: (technology: Technology) => Promise<void>;
  onContact?: (technology: Technology) => void;
  securityLevel?: string;
}

/**
 * Enhanced technology details component with security classification and accessibility
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const TechnologyDetails: React.FC<TechnologyDetailsProps> = ({
  id: propId,
  onSave,
  onContact,
  securityLevel,
}) => {
  // Hooks
  const { id: urlId } = useParams<{ id: string }>();
  const { showSuccess, showError } = useNotification();
  const [permissions, setPermissions] = useState<TechnologyPermissions | null>(null);

  // Get technology ID from props or URL
  const technologyId = propId || urlId;

  // Fetch technology data with react-query
  const {
    data: technology,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['technology', technologyId],
    () => technologyService.getTechnologyById(technologyId),
    {
      enabled: !!technologyId,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (err) => {
        showError('Failed to load technology details. Please try again.');
        console.error('Technology fetch error:', err);
      },
    }
  );

  // Check permissions on mount and data change
  useEffect(() => {
    const checkUserPermissions = async () => {
      if (technology) {
        try {
          // Temporarily use permissions from technology data until service is updated
          setPermissions(technology.permissions);
        } catch (err) {
          console.error('Permission check failed:', err);
          setPermissions(null);
        }
      }
    };

    checkUserPermissions();
  }, [technology]);

  // Handle save action with optimistic update
  const handleSave = async () => {
    if (!technology || !permissions?.canSave) return;

    try {
      await technologyService.saveTechnology(technology.id);
      showSuccess('Technology saved successfully');
      onSave?.(technology);
    } catch (err) {
      showError('Failed to save technology. Please try again.');
      console.error('Save error:', err);
    }
  };

  // Handle contact action
  const handleContact = () => {
    if (!technology || !permissions?.canContact) return;
    onContact?.(technology);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress
          size={40}
          aria-label="Loading technology details"
        />
      </Box>
    );
  }

  // Error state
  if (isError || !technology) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Failed to load technology details. Please try again.
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <CustomCard
        elevation={2}
        sx={{ p: SPACING.SCALE.lg }}
        aria-label="Technology details"
      >
        {/* Security Classification Banner */}
        {technology.securityLevel && (
          <Alert
            severity="info"
            icon={<LockOutlined />}
            sx={{ mb: SPACING.SCALE.md }}
          >
            Security Level: {technology.securityLevel}
          </Alert>
        )}

        {/* Title Section */}
        <Typography variant="h4" component="h1" gutterBottom>
          {technology.title}
        </Typography>

        {/* Status Chips */}
        <Box sx={{ mb: SPACING.SCALE.md }}>
          <Chip
            label={technology.patentStatus}
            color={technology.patentStatus === PatentStatus.GRANTED ? 'success' : 'default'}
            sx={{ mr: 1 }}
          />
          <Chip
            label={`TRL ${technology.trl}`}
            color="primary"
            sx={{ mr: 1 }}
          />
          <Chip
            label={technology.metadata.stage}
            color="secondary"
          />
        </Box>

        <Divider sx={{ my: SPACING.SCALE.md }} />

        {/* Main Content Grid */}
        <Grid container spacing={SPACING.SCALE.md}>
          {/* Description Section */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography paragraph>
              {technology.description}
            </Typography>

            {/* Inventors Section */}
            <Typography variant="h6" gutterBottom>
              Inventors
            </Typography>
            <Box sx={{ mb: SPACING.SCALE.md }}>
              {technology.metadata.inventors.map((inventor, index) => (
                <Chip
                  key={index}
                  label={inventor}
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            {/* Keywords Section */}
            <Typography variant="h6" gutterBottom>
              Keywords
            </Typography>
            <Box sx={{ mb: SPACING.SCALE.md }}>
              {technology.metadata.keywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Grid>

          {/* Action Sidebar */}
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: SPACING.SCALE.lg }}>
              {/* University Info */}
              <Typography variant="h6" gutterBottom>
                {technology.university}
              </Typography>

              {/* Patent Information */}
              {technology.metadata.patentNumber && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  Patent Number: {technology.metadata.patentNumber}
                </Typography>
              )}

              {/* Action Buttons */}
              <Box sx={{ mt: SPACING.SCALE.lg }}>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlined />}
                  onClick={handleSave}
                  disabled={!permissions?.canSave}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Save Technology
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<EmailOutlined />}
                  onClick={handleContact}
                  disabled={!permissions?.canContact}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Contact TTO
                </Button>

                {/* Attachments Section */}
                {technology.metadata.attachments.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Attachments
                    </Typography>
                    {technology.metadata.attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        variant="text"
                        startIcon={<DownloadOutlined />}
                        disabled={!permissions?.canDownload}
                        fullWidth
                        sx={{ justifyContent: 'flex-start', mb: 1 }}
                      >
                        {attachment.name}
                      </Button>
                    ))}
                  </>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CustomCard>
    </ErrorBoundary>
  );
};

export default TechnologyDetails;