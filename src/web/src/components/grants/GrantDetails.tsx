// @mui/material v5.14.0
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Tooltip,
  Alert,
  Chip,
  Grid,
  useTheme
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Internal imports
import { CustomCard } from '../common/Card';
import { GrantStatusTracker } from './GrantStatusTracker';
import { grantService } from '../../services/grant.service';
import { IGrant, GrantStatus, IGrantRequirements } from '../../interfaces/grant.interface';

/**
 * Interface for error state management
 */
interface ErrorState {
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Interface for enhanced grant details props
 */
interface GrantDetailsProps {
  grantId?: string;
  onApply?: (grant: IGrant) => Promise<void>;
  refreshInterval?: number;
  onStatusChange?: (status: GrantStatus, timestamp: Date) => void;
}

/**
 * GrantDetails component for comprehensive grant information display
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
export const GrantDetails: React.FC<GrantDetailsProps> = ({
  grantId: propGrantId,
  onApply,
  refreshInterval = 30000,
  onStatusChange
}) => {
  const theme = useTheme();
  const { grantId: urlGrantId } = useParams<{ grantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const activeGrantId = propGrantId || urlGrantId;

  // State management
  const [grant, setGrant] = useState<IGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [eligibility, setEligibility] = useState<boolean | null>(null);

  // Refs for tracking mounted state
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Enhanced function to fetch and validate grant details
   */
  const fetchGrantDetails = useCallback(async () => {
    if (!activeGrantId) {
      setError({ message: 'Grant ID is required', severity: 'error' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const grantData = await grantService.getGrantById(activeGrantId);
      const eligibilityCheck = await grantService.checkEligibility(activeGrantId);

      if (mounted.current) {
        setGrant(grantData);
        setEligibility(eligibilityCheck);
      }
    } catch (err) {
      if (mounted.current) {
        setError({
          message: 'Failed to load grant details. Please try again later.',
          severity: 'error'
        });
      }
      console.error('Error fetching grant details:', err);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [activeGrantId]);

  useEffect(() => {
    fetchGrantDetails();
  }, [fetchGrantDetails]);

  /**
   * Format currency values with localization
   */
  const formatCurrency = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }, []);

  /**
   * Format dates with localization
   */
  const formatDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  /**
   * Enhanced application initiation handler
   */
  const handleApplyClick = useCallback(async () => {
    if (!grant) return;

    try {
      if (!eligibility) {
        setError({
          message: 'You do not meet the eligibility criteria for this grant.',
          severity: 'warning'
        });
        return;
      }

      if (onApply) {
        await onApply(grant);
      } else {
        navigate(`/grants/${grant.id}/apply`, {
          state: { grant, returnPath: location.pathname }
        });
      }
    } catch (err) {
      setError({
        message: 'Failed to initiate application. Please try again.',
        severity: 'error'
      });
      console.error('Error initiating application:', err);
    }
  }, [grant, eligibility, onApply, navigate, location.pathname]);

  /**
   * Render document requirements section
   */
  const renderRequirements = (requirements: IGrantRequirements) => (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom>
        Required Documents
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(requirements).map(([key, requirement]) => (
          <Grid item xs={12} sm={6} key={key}>
            <CustomCard elevation={1}>
              <Box p={2}>
                <Typography variant="subtitle1" gutterBottom>
                  {requirement.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max pages: {requirement.maxPages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Format: {requirement.format.join(', ')}
                </Typography>
                <Chip
                  label={requirement.required ? 'Required' : 'Optional'}
                  color={requirement.required ? 'primary' : 'default'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </CustomCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress aria-label="Loading grant details" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity={error.severity}
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={fetchGrantDetails}>
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }

  if (!grant) {
    return (
      <Alert severity="info">
        No grant information available
      </Alert>
    );
  }

  return (
    <Box>
      <CustomCard elevation={2}>
        <Box p={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            {grant.title}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="h6">
                {formatCurrency.format(grant.amount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Deadline
              </Typography>
              <Typography variant="h6">
                {formatDate.format(new Date(grant.deadline))}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Agency
              </Typography>
              <Typography variant="h6">
                {grant.agency}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Type
              </Typography>
              <Typography variant="h6">
                {grant.type}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" paragraph>
            {grant.description}
          </Typography>

          <Typography variant="h6" gutterBottom>
            Eligibility Criteria
          </Typography>
          <Box mb={3}>
            {grant.eligibilityCriteria.map((criterion, index) => (
              <Typography
                key={index}
                variant="body1"
                component="div"
                sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
              >
                • {criterion}
              </Typography>
            ))}
          </Box>

          {renderRequirements(grant.requirements)}

          <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              {eligibility === false && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You may not be eligible for this grant. Please review the criteria carefully.
                </Alert>
              )}
            </Box>
            <Tooltip
              title={
                !eligibility
                  ? "Please review eligibility criteria"
                  : "Apply for this grant"
              }
            >
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleApplyClick}
                  disabled={!eligibility}
                  aria-label="Apply for grant"
                >
                  Apply Now
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </CustomCard>

      {grant.id && (
        <Box mt={3}>
          <GrantStatusTracker
            applicationId={grant.id}
            refreshInterval={refreshInterval}
            onStatusChange={onStatusChange}
          />
        </Box>
      )}
    </Box>
  );
};

export default GrantDetails;