import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import { useFormik, FormikHelpers } from 'formik';
import { debounce } from 'lodash';
import * as Yup from 'yup';

import Form from '../common/Form';
import FileUpload from '../common/FileUpload';
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

interface IGrantApplication {
  projectDetails: ProjectDetails;
  budgetTimeline: BudgetTimeline;
  teamInformation: TeamInformation;
  documentAttachments: DocumentAttachments;
}

interface GrantApplicationFormProps {
  grantId: string;
  onSuccess: (application: IGrantApplication) => void;
  onError: (error: Error) => void;
  initialData?: Partial<IGrantApplication>;
}

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
};

const formSteps = [
  { label: 'Project Details', key: 'projectDetails' },
  { label: 'Budget & Timeline', key: 'budgetTimeline' },
  { label: 'Team Information', key: 'teamInformation' },
  { label: 'Documents', key: 'documentAttachments' }
];

export const GrantApplicationForm: React.FC<GrantApplicationFormProps> = ({
  grantId,
  onSuccess,
  onError,
  initialData
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { showSuccess, showError } = useNotification();
  const formRef = useRef<HTMLFormElement>(null);

  const formik = useFormik({
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

  useEffect(() => {
    if (formik.dirty) {
      autoSave(formik.values);
    }
  }, [formik.values, autoSave]);

  async function handleSubmit(
    values: IGrantApplication,
    helpers: FormikHelpers<IGrantApplication>
  ) {
    setIsSubmitting(true);
    try {
      for (const step of formSteps) {
        const isValid = await validationSchemas[step.key].isValid(
          values[step.key as keyof IGrantApplication]
        );
        if (!isValid) {
          throw new Error(`Validation failed for ${step.label}`);
        }
      }

      const processedFiles = await Promise.all(
        values.documentAttachments.files.map(async (file) => {
          return file;
        })
      );

      await onSuccess({
        ...values,
        documentAttachments: {
          files: processedFiles
        }
      });

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

  const handleNext = async () => {
    const currentSchema = validationSchemas[formSteps[activeStep].key];
    try {
      await currentSchema.validate(
        formik.values[formSteps[activeStep].key as keyof IGrantApplication]
      );
      setActiveStep((prev) => Math.min(prev + 1, formSteps.length - 1));
    } catch (error) {
      formik.validateForm();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const renderStepContent = (step: number) => {
    const currentStep = formSteps[step];
    return (
      <Box role="region" aria-label={currentStep.label}>
        {/* Step-specific form fields rendered here */}
      </Box>
    );
  };

  const handleFormSubmit = (values: Record<string, any>, formActions: any) => {
    formik.handleSubmit(values as any);
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
        {formSteps.map((step, index) => (
          <Step key={step.key}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Form
        ref={formRef}
        onSubmit={handleFormSubmit}
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