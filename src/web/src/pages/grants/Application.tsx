import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';

import GrantApplicationForm from '../../components/grants/GrantApplicationForm';
import GrantWritingAssistant from '../../components/grants/GrantWritingAssistant';
import { grantService } from '../../services/grant.service';
import { useNotification } from '../../hooks/useNotification';
import { ANIMATION } from '../../constants/ui.constants';

// Types
interface ValidationError {
  section: string;
  message: string;
}

interface ApplicationState {
  grant: IGrant | null;
  activeStep: number;
  loading: boolean;
  progress: Record<string, number>;
  lastSaved: Date | null;
  validationErrors: ValidationError[];
}

/**
 * Grant Application Page Component
 * Implements a comprehensive grant application interface with AI assistance
 */
const Application: React.FC = () => {
  // Hooks
  const { grantId } = useParams<{ grantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showWarning } = useNotification();

  // State
  const [state, setState] = useState<ApplicationState>({
    grant: null,
    activeStep: 0,
    loading: true,
    progress: {},
    lastSaved: null,
    validationErrors: [],
  });

  // Load grant data
  useEffect(() => {
    const loadGrant = async () => {
      try {
        if (!grantId) {
          throw new Error('Grant ID is required');
        }
        const grant = await grantService.getGrantById(grantId);
        setState(prev => ({ ...prev, grant, loading: false }));
      } catch (error) {
        showError('Failed to load grant details');
        navigate('/grants', { replace: true });
      }
    };

    loadGrant();
  }, [grantId, navigate, showError]);

  /**
   * Handles application submission with validation
   */
  const handleApplicationSubmit = useCallback(async (applicationData: any) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // Validate all sections
      const validationErrors = await Promise.all(
        Object.entries(applicationData.sections).map(async ([sectionId, content]) => {
          const isValid = await grantService.validateSection(sectionId, content);
          return isValid ? null : {
            section: sectionId,
            message: 'Section validation failed'
          };
        })
      );

      const errors = validationErrors.filter(Boolean) as ValidationError[];
      if (errors.length > 0) {
        setState(prev => ({ ...prev, validationErrors: errors, loading: false }));
        showWarning('Please correct validation errors before submitting');
        return;
      }

      // Submit application
      await grantService.submitApplication(grantId!, applicationData);
      showSuccess('Application submitted successfully');
      navigate(`/grants/${grantId}/status`);
    } catch (error) {
      showError('Failed to submit application');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [grantId, navigate, showSuccess, showError, showWarning]);

  /**
   * Handles draft saving with auto-save functionality
   */
  const handleDraftSave = useCallback(async (draftData: any) => {
    try {
      await grantService.saveDraft(grantId!, draftData);
      setState(prev => ({ ...prev, lastSaved: new Date() }));
      showSuccess('Draft saved successfully');
    } catch (error) {
      showError('Failed to save draft');
    }
  }, [grantId, showSuccess, showError]);

  /**
   * Handles step navigation with validation
   */
  const handleStepChange = useCallback((newStep: number) => {
    // Validate current step before proceeding
    if (state.validationErrors.length > 0) {
      showWarning('Please correct validation errors before proceeding');
      return;
    }

    setState(prev => ({ ...prev, activeStep: newStep }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.validationErrors, showWarning]);

  // Memoized progress calculation
  const totalProgress = useMemo(() => {
    if (!state.progress || Object.keys(state.progress).length === 0) return 0;
    const values = Object.values(state.progress);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [state.progress]);

  if (state.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!state.grant) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load grant details
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Grant Application
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {state.grant.title}
        </Typography>
      </Box>

      <Box mb={4}>
        <Stepper activeStep={state.activeStep} alternativeLabel>
          {state.grant.requirements.sections.map((section, index) => (
            <Step key={section.id}>
              <StepLabel>{section.title}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box display="flex" gap={4}>
        <Box flex={1}>
          <GrantApplicationForm
            grantId={grantId!}
            onSuccess={handleApplicationSubmit}
            onError={(error) => showError(error.message)}
            onAutoSave={handleDraftSave}
          />
        </Box>

        <Box width={400}>
          <GrantWritingAssistant
            grant={state.grant}
            onSave={handleDraftSave}
            onSubmit={handleApplicationSubmit}
          />
        </Box>
      </Box>

      {state.lastSaved && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: 'block' }}
        >
          Last saved: {state.lastSaved.toLocaleTimeString()}
        </Typography>
      )}
    </Container>
  );
};

export default Application;