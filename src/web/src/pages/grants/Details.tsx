// @mui/material v5.14.0
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Alert,
  Skeleton,
  useTheme
} from '@mui/material';

// Internal imports
import { GrantDetails } from '../../components/grants/GrantDetails';
import { IGrant } from '../../interfaces/grant.interface';
import { grantService } from '../../services/grant.service';

/**
 * Enhanced error state interface with retry information
 */
interface ErrorState {
  message: string;
  retryCount: number;
  canRetry: boolean;
}

/**
 * GrantDetailsPage component for displaying comprehensive grant information
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const GrantDetailsPage: React.FC = React.memo(() => {
  const theme = useTheme();
  const { grantId } = useParams<{ grantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [grant, setGrant] = useState<IGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  // Request cancellation reference
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetches grant details with enhanced error handling and retry logic
   */
  const fetchGrantDetails = useCallback(async () => {
    if (!grantId) {
      setError({
        message: 'Grant ID is required',
        retryCount: 0,
        canRetry: false
      });
      setLoading(false);
      return;
    }

    try {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const grantData = await grantService.getGrantById(grantId);
      setGrant(grantData);
    } catch (err) {
      const currentRetries = error?.retryCount || 0;
      setError({
        message: 'Failed to load grant details. Please try again.',
        retryCount: currentRetries + 1,
        canRetry: currentRetries < 3
      });
      console.error('Error fetching grant details:', err);
    } finally {
      setLoading(false);
    }
  }, [grantId, error?.retryCount]);

  /**
   * Initialize data fetching with cleanup
   */
  useEffect(() => {
    fetchGrantDetails();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchGrantDetails]);

  /**
   * Handles navigation to grant application with state preservation
   */
  const handleApplyClick = useCallback(async (grant: IGrant) => {
    try {
      // Preserve current page state for back navigation
      navigate(`/grants/${grant.id}/apply`, {
        state: {
          grant,
          returnPath: location.pathname
        }
      });
    } catch (err) {
      console.error('Error navigating to application:', err);
      setError({
        message: 'Failed to start application process. Please try again.',
        retryCount: 0,
        canRetry: true
      });
    }
  }, [navigate, location.pathname]);

  /**
   * Render loading state with skeleton UI
   */
  if (loading && !grant) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 3 }}>
          <Skeleton variant="rectangular" height={200} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" height={40} width="60%" />
            <Skeleton variant="text" height={20} width="40%" />
          </Box>
          <Box sx={{ mt: 3 }}>
            <Skeleton variant="rectangular" height={400} />
          </Box>
        </Box>
      </Container>
    );
  }

  /**
   * Render error state with retry option
   */
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity="error"
            action={
              error.canRetry && (
                <button
                  onClick={fetchGrantDetails}
                  style={{ 
                    background: 'none',
                    border: 'none',
                    color: theme.palette.error.main,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Retry
                </button>
              )
            }
          >
            {error.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  /**
   * Render main content
   */
  return (
    <Container 
      maxWidth="lg"
      sx={{
        mt: 3,
        mb: 4,
        minHeight: '80vh'
      }}
    >
      <GrantDetails
        grantId={grantId}
        onApply={handleApplyClick}
        refreshInterval={30000}
        onStatusChange={(status, timestamp) => {
          console.log('Grant status updated:', status, timestamp);
        }}
      />
    </Container>
  );
});

// Display name for debugging
GrantDetailsPage.displayName = 'GrantDetailsPage';

export default GrantDetailsPage;