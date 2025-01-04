import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Container, Box, CircularProgress, Alert, LinearProgress } from '@mui/material';
import { debounce } from 'lodash';

import GrantWritingAssistant from '../../components/grants/GrantWritingAssistant';
import { useNotification } from '../../hooks/useNotification';
import { grantService } from '../../services/grant.service';
import { IGrant, IGrantApplication, GrantStatus } from '../../interfaces/grant.interface';

// Interface for component state management
interface WriterState {
  grant: IGrant | null;
  loading: boolean;
  error: string | null;
  progress: number;
  lastSaved: Date | null;
  isDirty: boolean;
}

/**
 * Grant Writer Page Component
 * Provides an AI-powered interface for grant writing with real-time assistance
 * and auto-save functionality.
 */
const Writer: React.FC = () => {
  // Router hooks
  const { grantId } = useParams<{ grantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [state, setState] = useState<WriterState>({
    grant: null,
    loading: true,
    error: null,
    progress: 0,
    lastSaved: null,
    isDirty: false
  });

  // Notification hooks
  const { showSuccess, showError, showWarning } = useNotification();

  // Refs for cleanup
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Fetch grant details on component mount
   */
  useEffect(() => {
    const fetchGrant = async () => {
      try {
        if (!grantId) {
          throw new Error('Grant ID is required');
        }
        const grant = await grantService.getGrantById(grantId);
        setState(prev => ({ ...prev, grant, loading: false }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load grant details'
        }));
        showError('Error loading grant details');
      }
    };

    fetchGrant();
  }, [grantId, showError]);

  /**
   * Handle draft saving with debounce
   */
  const handleSaveDraft = useCallback(
    debounce(async (applicationData: Partial<IGrantApplication>) => {
      try {
        if (!grantId) return;

        // Update progress before saving
        const progress = calculateProgress(applicationData);
        setState(prev => ({ ...prev, progress }));

        // Save draft
        await grantService.saveGrantDraft(grantId, {
          ...applicationData,
          status: GrantStatus.DRAFT,
          lastModifiedAt: new Date()
        });
        
        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false
        }));

        showSuccess('Draft saved successfully');
      } catch (error) {
        showError('Failed to save draft');
        setState(prev => ({ ...prev, isDirty: true }));
      }
    }, 1000),
    [grantId, showSuccess, showError]
  );

  /**
   * Handle application submission
   */
  const handleSubmitApplication = useCallback(async (applicationData: IGrantApplication) => {
    try {
      if (!grantId) return;

      // Validate application before submission
      const validationResult = await grantService.validateApplication(applicationData);
      if (!validationResult) {
        showWarning('Please complete all required sections');
        return;
      }

      // Check progress threshold
      if (state.progress < 100) {
        showWarning('Please complete all sections before submitting');
        return;
      }

      // Submit application
      await grantService.submitApplication(grantId, {
        ...applicationData,
        status: GrantStatus.SUBMITTED,
        submittedAt: new Date()
      });
      showSuccess('Application submitted successfully');

      // Navigate to status page
      navigate(`/grants/${grantId}/status`);
    } catch (error) {
      showError('Failed to submit application');
    }
  }, [grantId, state.progress, navigate, showSuccess, showError, showWarning]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Calculate application progress
   */
  const calculateProgress = (applicationData: Partial<IGrantApplication>): number => {
    if (!state.grant) return 0;

    const requiredDocs = [
      state.grant.requirements.technicalVolume,
      state.grant.requirements.businessPlan,
      state.grant.requirements.budget,
      ...state.grant.requirements.additionalDocuments
    ].filter(doc => doc.required);

    const completedDocs = applicationData.documents?.filter(doc => 
      doc.status === 'approved' || doc.status === 'pending'
    ) || [];

    return Math.round((completedDocs.length / requiredDocs.length) * 100);
  };

  // Loading state
  if (state.loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {state.error}
        </Alert>
      </Container>
    );
  }

  // Main render
  return (
    <Container maxWidth="xl">
      {state.isDirty && (
        <LinearProgress 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 9999 
          }} 
        />
      )}
      
      {state.grant && (
        <GrantWritingAssistant
          grant={{
            ...state.grant,
            deadline: state.grant.deadline.toISOString()
          }}
          onSave={handleSaveDraft}
          onSubmit={handleSubmitApplication}
          initialData={location.state?.draftData}
        />
      )}
    </Container>
  );
};

export default Writer;