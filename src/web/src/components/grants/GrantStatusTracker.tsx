// @mui/material v5.14.0
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Stepper, 
  Step, 
  StepLabel, 
  Typography, 
  CircularProgress,
  Box,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Internal imports
import { CustomCard } from '../common/Card';
import { grantService } from '../../services/grant.service';
import { GrantStatus, IGrantApplication } from '../../interfaces/grant.interface';

/**
 * Styled components for enhanced visual presentation
 */
const StyledStepper = styled(Stepper)(({ theme }) => ({
  '& .MuiStepLabel-root': {
    '&.Mui-active': {
      color: theme.palette.primary.main,
    },
    '&.Mui-completed': {
      color: theme.palette.success.main,
    },
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

/**
 * Props interface for the GrantStatusTracker component
 */
export interface GrantStatusTrackerProps {
  applicationId: string;
  onStatusChange?: (status: GrantStatus, timestamp: Date) => void;
  refreshInterval?: number;
  showHistory?: boolean;
}

/**
 * Status step configuration with labels and descriptions
 */
const STATUS_STEPS = [
  {
    status: GrantStatus.DRAFT,
    label: 'Draft',
    description: 'Application is in draft state',
  },
  {
    status: GrantStatus.IN_PROGRESS,
    label: 'In Progress',
    description: 'Application is being prepared',
  },
  {
    status: GrantStatus.SUBMITTED,
    label: 'Submitted',
    description: 'Application has been submitted for review',
  },
  {
    status: GrantStatus.UNDER_REVIEW,
    label: 'Under Review',
    description: 'Application is being reviewed',
  },
  {
    status: GrantStatus.APPROVED,
    label: 'Approved',
    description: 'Application has been approved',
  },
] as const;

/**
 * Helper function to get the active step index
 */
const getActiveStep = (status: GrantStatus): number => {
  const index = STATUS_STEPS.findIndex(step => step.status === status);
  return index === -1 ? 0 : index;
};

/**
 * GrantStatusTracker component for tracking grant application status
 * Implements Material Design principles and accessibility features
 */
export const GrantStatusTracker: React.FC<GrantStatusTrackerProps> = ({
  applicationId,
  onStatusChange,
  refreshInterval = 30000, // 30 seconds default refresh
  showHistory = false,
}) => {
  const theme = useTheme();
  const [application, setApplication] = useState<IGrantApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current application status
   */
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await grantService.getApplicationStatus(applicationId);
      setApplication(data);
      
      if (onStatusChange && data.status !== application?.status) {
        onStatusChange(data.status, data.lastModifiedAt);
      }
    } catch (err) {
      setError('Failed to fetch application status');
      console.error('Error fetching application status:', err);
    } finally {
      setLoading(false);
    }
  }, [applicationId, application?.status, onStatusChange]);

  /**
   * Initialize status polling
   */
  useEffect(() => {
    fetchStatus();
    
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchStatus, refreshInterval]);

  /**
   * Render loading state
   */
  if (loading && !application) {
    return (
      <CustomCard>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress aria-label="Loading application status" />
        </Box>
      </CustomCard>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <CustomCard>
        <Box p={2} role="alert" aria-live="polite">
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Box>
      </CustomCard>
    );
  }

  /**
   * Render main component
   */
  return (
    <CustomCard>
      <Box p={2}>
        <Typography
          variant="h6"
          gutterBottom
          component="h2"
          aria-label="Application Status Tracker"
        >
          Application Status
        </Typography>
        
        <StyledStepper
          activeStep={application ? getActiveStep(application.status) : 0}
          alternativeLabel
          aria-label="Application progress steps"
        >
          {STATUS_STEPS.map((step, index) => (
            <Step
              key={step.status}
              completed={application ? getActiveStep(application.status) > index : false}
            >
              <StepLabel
                optional={
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </StyledStepper>

        {showHistory && application?.feedback && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Status History
            </Typography>
            {application.feedback.map((item) => (
              <Box
                key={item.id}
                mt={1}
                p={1}
                bgcolor="background.default"
                borderRadius={1}
              >
                <Typography variant="body2" color="text.secondary">
                  {new Date(item.createdAt).toLocaleDateString()} -{' '}
                  {item.message}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </CustomCard>
  );
};

export default GrantStatusTracker;