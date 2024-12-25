import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Skeleton, Alert } from '@mui/material';
import { useSnackbar } from 'notistack';

import TechnologyDetails from '../../components/technologies/TechnologyDetails';
import useAuth from '../../hooks/useAuth';
import { technologyService } from '../../services/technology.service';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Technology } from '../../interfaces/technology.interface';
import { SPACING } from '../../constants/ui.constants';

/**
 * Technology Details Page Component
 * Displays comprehensive information about a specific technology listing
 * with security controls and accessibility features
 */
const TechnologyDetailsPage: React.FC = () => {
  // Hooks
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [technology, setTechnology] = useState<Technology | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch technology data with security checks
  useEffect(() => {
    const fetchTechnology = async () => {
      if (!id) {
        setError('Invalid technology ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await technologyService.getTechnologyById(id);
        
        // Verify user has permission to view this technology
        if (!data.permissions.canView) {
          throw new Error('You do not have permission to view this technology');
        }

        setTechnology(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch technology:', err);
        setError(err instanceof Error ? err.message : 'Failed to load technology details');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnology();
  }, [id]);

  /**
   * Handles saving technology to user's list
   */
  const handleSaveTechnology = async (technologyId: string) => {
    if (!user) {
      enqueueSnackbar('Please log in to save technologies', { variant: 'warning' });
      return;
    }

    try {
      await technologyService.saveTechnology(technologyId);
      enqueueSnackbar('Technology saved successfully', { variant: 'success' });
    } catch (err) {
      console.error('Failed to save technology:', err);
      enqueueSnackbar('Failed to save technology', { variant: 'error' });
    }
  };

  /**
   * Handles initiating contact with TTO
   */
  const handleContactTTO = (technologyId: string) => {
    if (!user) {
      enqueueSnackbar('Please log in to contact TTOs', { variant: 'warning' });
      return;
    }

    // Navigate to messaging with context
    navigate(`/messages/new`, {
      state: {
        technologyId,
        recipientType: 'tto',
        subject: technology?.title
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: SPACING.SCALE.lg }}>
        <Skeleton variant="rectangular" height={400} sx={{ mb: SPACING.SCALE.md }} />
        <Skeleton variant="text" height={60} sx={{ mb: SPACING.SCALE.sm }} />
        <Skeleton variant="text" height={40} sx={{ mb: SPACING.SCALE.md }} />
        <Skeleton variant="rectangular" height={200} />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: SPACING.SCALE.lg }}>
        <Alert 
          severity="error"
          sx={{ mb: SPACING.SCALE.md }}
          aria-live="polite"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // Render technology details with error boundary
  return (
    <ErrorBoundary>
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: SPACING.SCALE.lg,
          minHeight: '80vh'
        }}
      >
        {technology && (
          <TechnologyDetails
            id={technology.id}
            onSave={handleSaveTechnology}
            onContact={handleContactTTO}
            securityLevel={technology.metadata?.securityLevel}
          />
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default TechnologyDetailsPage;