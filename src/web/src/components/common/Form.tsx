import React, { useCallback, useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material'; // Removed unused Paper import
import { styled } from '@mui/material/styles'; // Removed unused useTheme import
import { useForm } from '../../hooks/useForm';
import Input from './Input';

// Enhanced form container with accessibility and theme support
const StyledForm = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  position: 'relative',

  // Enhanced focus outline for keyboard navigation
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Responsive adjustments
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    gap: theme.spacing(2),
  },

  // Loading state overlay
  '& .loading-overlay': {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: theme.zIndex.modal - 1,
    borderRadius: 'inherit',
  },
}));

// Form security options interface
interface FormSecurityOptions {
  enableFingerprinting?: boolean;
  rateLimitAttempts?: number;
  rateLimitWindow?: number;
  validationLevel?: 'strict' | 'moderate' | 'relaxed';
}

// Form accessibility labels interface
interface FormAccessibilityLabels {
  form?: string;
  submit?: string;
  loading?: string;
  success?: string;
  error?: string;
}

// Enhanced form props interface
interface FormProps {
  initialValues: Record<string, any>;
  validationSchema: Record<string, any>;
  onSubmit: (values: Record<string, any>, formActions: FormActions) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  securityOptions?: FormSecurityOptions;
  accessibilityLabels?: FormAccessibilityLabels;
}

// Form actions interface
interface FormActions {
  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string) => void;
}

/**
 * Enhanced form component implementing Material Design 3.0 principles
 * with comprehensive security, accessibility, and validation features
 */
export const Form: React.FC<FormProps> = ({
  initialValues,
  validationSchema,
  onSubmit,
  children,
  className,
  securityOptions = {},
  accessibilityLabels = {},
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Initialize form state with enhanced security
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    resetForm,
  } = useForm({
    initialValues,
    validationSchema,
    onSubmit: async (formValues) => {
      try {
        await onSubmit(formValues, {
          setSubmitting: (isSubmitting) => setFieldValue('isSubmitting', isSubmitting),
          resetForm,
          setFieldValue,
          setFieldError: (field, error) => setFieldValue(`errors.${field}`, error),
        });
        
        // Announce success to screen readers
        if (announcerRef.current) {
          announcerRef.current.textContent = accessibilityLabels.success || 'Form submitted successfully';
        }
      } catch (error) {
        // Announce error to screen readers
        if (announcerRef.current) {
          announcerRef.current.textContent = accessibilityLabels.error || 'Form submission failed';
        }
        throw error;
      }
    },
    securityOptions,
  });

  // Handle keyboard navigation
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLElement) {
        if (e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
          const currentIndex = Array.from(inputs).indexOf(e.target as HTMLElement);
          const nextInput = inputs[currentIndex + 1] as HTMLElement;
          if (nextInput) {
            nextInput.focus();
          } else {
            form.requestSubmit();
          }
        }
      }
    };

    form.addEventListener('keydown', handleKeyDown);
    return () => form.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render form fields with enhanced accessibility
  const renderFormFields = useCallback((children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      if (child.type === Input) {
        const name = child.props.name;
        return React.cloneElement(child, {
          value: values[name] || '',
          onChange: handleChange,
          error: touched[name] ? errors[name] : undefined,
          onBlur: () => setFieldTouched(name, true),
          'aria-invalid': touched[name] && !!errors[name],
          'aria-describedby': `${name}-error`,
        });
      }

      if (child.props.children) {
        return React.cloneElement(child, {
          children: renderFormFields(child.props.children),
        });
      }

      return child;
    });
  }, [values, errors, touched, handleChange, setFieldTouched]);

  return (
    <StyledForm
      component="form"
      ref={formRef}
      onSubmit={handleSubmit}
      className={className}
      role="form"
      aria-label={accessibilityLabels.form || 'Form'}
      noValidate
    >
      {renderFormFields(children)}

      {/* Loading overlay */}
      {isSubmitting && (
        <div 
          className="loading-overlay"
          role="progressbar"
          aria-label={accessibilityLabels.loading || 'Loading'}
        >
          <CircularProgress />
        </div>
      )}

      {/* Screen reader announcer */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
      />
    </StyledForm>
  );
};

export default Form;