import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  CircularProgress
} from '@mui/material'; // v5.14.0
import { useFormik, FormikHelpers } from 'formik'; // v2.4.2
import { debounce } from 'lodash'; // v4.17.21
import * as Yup from 'yup'; // v1.2.0

import Form from '../common/Form';
import { useNotification } from '../../hooks/useNotification';

// Form section interfaces
interface ProjectDetails {
  projectTitle: string;
  abstract: string;
  keywords: string[];
  researchArea: string;
}

interface BudgetTimeline {
  totalBudget: number;
  timeline: string;
  startDate: string;
  endDate: string;
  milestones: Array<{
    title: string;
    date: string;
    description: string;
  }>;
}

interface TeamInformation {
  teamMembers: Array<{
    name: string;
    role: string;
    experience: string;
    institution: string;
  }>;
}

interface DocumentAttachments {
  files: Array<{
    name: string;
    file: File;
    type: string;
    size: number;
  }>;
}

// Combined form data interface
interface IGrantApplication {
  projectDetails: ProjectDetails;
  budgetTimeline: BudgetTimeline;
  teamInformation: TeamInformation;
  documentAttachments: DocumentAttachments;
}

// Component props interface
interface GrantApplicationFormProps {
  grantId: string;
  onSuccess: (application: IGrantApplication) => void;
  onError: (error: Error) => void;
  initialData?: Partial<IGrantApplication>;
}

// Form validation schemas
const validationSchemas = {
  projectDetails: Yup.object({
    projectTitle: Yup.string()
      .required('Project title is required')
      .max(200, 'Title must be less than 200 characters'),
    abstract: Yup.string()
      .required('Abstract is required')
      .min(100, 'Abstract must be at least 100 characters')
      .max(5000, 'Abstract must be less than 5000 characters'),
    keywords: Yup.array()
      .of(Yup.string())
      .min(3, 'At least 3 keywords are required')
      .max(10, 'Maximum 10 keywords allowed'),
    researchArea: Yup.string()
      .required('Research area is required')
  }),
  budgetTimeline: Yup.object({
    totalBudget: Yup.number()
      .required('Budget is required')
      .min(0, 'Budget must be positive')
      .max(1000000, 'Budget exceeds maximum allowed'),
    timeline: Yup.string()
      .required('Timeline is required')
      .min(50, 'Timeline description too short'),
    startDate: Yup.date()
      .required('Start date is required'),
    endDate: Yup.date()
      .required('End date is required')
      .min(Yup.ref('startDate'), 'End date must be after start date'),
    milestones: Yup.array()
      .of(
        Yup.object({
          title: Yup.string().required('Milestone title is required'),
          date: Yup.date().required('Milestone date is required'),
          description: Yup.string().required('Milestone description is required')
        })
      )
      .min(1, 'At least one milestone is required')
  }),
  teamInformation: Yup.object({
    teamMembers: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().required('Team member name is required'),
          role: Yup.string().required('Team member role is required'),
          experience: Yup.string().required('Experience description is required'),
          institution: Yup.string().required('Institution is required')
        })
      )
      .min(1, 'At least one team member is required')
  }),
  documentAttachments: Yup.object({
    files: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().required(),
          file: Yup.mixed().required(),
          type: Yup.string().required(),
          size: Yup.number().max(10000000, 'File size must be less than 10MB')
        })
      )
      .max(5, 'Maximum 5 files allowed')
  })
} as const;

// Form steps configuration
const formSteps = [
  { label: 'Project Details', key: 'projectDetails' as const },
  { label: 'Budget & Timeline', key: 'budgetTimeline' as const },
  { label: 'Team Information', key: 'teamInformation' as const },
  { label: 'Documents', key: 'documentAttachments' as const }
];

/**
 * Grant Application Form Component
 * Implements a multi-step form with auto-save, validation, and accessibility features
 */
export const GrantApplicationForm: React.FC<GrantApplicationFormProps> = ({
  grantId,
  onSuccess,
  onError,
  initialData
}) => {
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Hooks
  const { showSuccess, showError } = useNotification();
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize form with Formik
  const formik = useFormik<IGrantApplication>({
    initialValues: initialData || {
      projectDetails: {
        projectTitle: '',
        abstract: '',
        keywords: [],
        researchArea: ''
      },
      budgetTimeline: {
        totalBudget: 0,
        timeline: '',
        startDate: '',
        endDate: '',
        milestones: []
      },
      teamInformation: {
        teamMembers: []
      },
      documentAttachments: {
        files: []
      }
    },
    validationSchema: validationSchemas[formSteps[activeStep].key],
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit
  });

  // Auto-save functionality
  const autoSave = useCallback(
    debounce(async (values: IGrantApplication) => {
      try {
        localStorage.setItem(
          `grant_application_${grantId}`,
          JSON.stringify(values)
        );
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000),
    [grantId]
  );

  // Effect for auto-save
  useEffect(() => {
    if (formik.dirty) {
      autoSave(formik.values);
    }
  }, [formik.values, autoSave]);

  // Handle form submission
  async function handleSubmit(
    values: IGrantApplication,
    helpers: FormikHelpers<IGrantApplication>
  ) {
    setIsSubmitting(true);
    try {
      // Validate all sections before final submission
      for (const step of formSteps) {
        const isValid = await validationSchemas[step.key].isValid(
          values[step.key]
        );
        if (!isValid) {
          throw new Error(`Validation failed for ${step.label}`);
        }
      }

      // Submit application
      await onSuccess(values);

      showSuccess('Grant application submitted successfully');
      helpers.resetForm();
      setActiveStep(0);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Submission failed');
      onError(error instanceof Error ? error : new Error('Submission failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Navigation handlers
  const handleNext = async () => {
    const currentSchema = validationSchemas[formSteps[activeStep].key];
    try {
      await currentSchema.validate(
        formik.values[formSteps[activeStep].key]
      );
      setActiveStep((prev) => Math.min(prev + 1, formSteps.length - 1));
    } catch (error) {
      formik.validateForm();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  // Render form content based on active step
  const renderStepContent = (step: number) => {
    const currentStep = formSteps[step];
    return (
      <Box role="region" aria-label={currentStep.label}>
        {/* Step-specific form fields rendered here */}
      </Box>
    );
  };

  return (
    <Box
      component="section"
      aria-label="Grant Application Form"
      sx={{ width: '100%', maxWidth: 'lg', mx: 'auto', p: 3 }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{ mb: 4 }}
        aria-label="Application Progress"
      >
        {formSteps.map((step) => (
          <Step key={step.key}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Form
        onSubmit={formik.handleSubmit}
        aria-label={`${formSteps[activeStep].label} Form`}
      >
        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting}
            aria-label="Previous Step"
          >
            Back
          </Button>
          
          {activeStep === formSteps.length - 1 ? (
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              aria-label="Submit Application"
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={isSubmitting}
              aria-label="Next Step"
            >
              Next
            </Button>
          )}
        </Box>
      </Form>

      {lastSaved && (
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ mt: 2, display: 'block' }}
        >
          Last saved: {lastSaved.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

export default GrantApplicationForm;