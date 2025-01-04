/**
 * Enhanced Form Management Hook
 * Version: 1.0.0
 * 
 * Provides secure form state management with integrated validation,
 * device fingerprinting, and rate limiting for the Incepta platform.
 */

import { useState, useCallback, useRef, ChangeEvent, FormEvent } from 'react'; // v18.2.0
import { sanitize } from 'dompurify'; // v3.0.5
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.4.0
import { useNotification } from './useNotification';

// Initialize fingerprint generator
const fpPromise = FingerprintJS.load();

// Types and Interfaces
interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    validate?: (value: any) => boolean | string;
  };
}

interface ValidationErrors {
  [key: string]: string;
}

interface SecurityOptions {
  enableFingerprinting?: boolean;
  rateLimitAttempts?: number;
  rateLimitWindow?: number; // in milliseconds
  validationLevel?: 'strict' | 'moderate' | 'relaxed';
}

interface SecurityContext {
  deviceFingerprint: string | null;
  rateLimitStatus: {
    attempts: number;
    lastAttempt: number;
  };
  validationLevel: 'strict' | 'moderate' | 'relaxed';
}

interface UseFormProps<T> {
  initialValues: T;
  validationSchema: ValidationSchema;
  onSubmit: (values: T, securityContext: SecurityContext) => Promise<void>;
  securityOptions?: SecurityOptions;
}

interface UseFormReturn<T> {
  values: T;
  errors: ValidationErrors;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleBlur: (e: ChangeEvent<HTMLInputElement>) => void;
  resetForm: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, isTouched: boolean) => void;
  securityStatus: SecurityContext;
}

// Rate limiting configuration
const DEFAULT_RATE_LIMIT = {
  attempts: 5,
  window: 300000, // 5 minutes
};

/**
 * Enhanced form management hook with security features
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  securityOptions = {}
}: UseFormProps<T>): UseFormReturn<T> {
  // Sanitize values utility function
  const sanitizeValues = useCallback((values: Record<string, any>): T => {
    return Object.entries(values).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: typeof value === 'string' ? sanitize(value) : value,
    }), {} as T);
  }, []);

  // Initialize state
  const [values, setValues] = useState<T>(sanitizeValues(initialValues));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(
    Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: false }), {}) as Record<keyof T, boolean>
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    deviceFingerprint: null,
    rateLimitStatus: {
      attempts: 0,
      lastAttempt: 0,
    },
    validationLevel: securityOptions.validationLevel || 'strict',
  });

  // Initialize notification hook
  const { showError, showWarning } = useNotification();

  // Initialize security tracking
  const rateLimitRef = useRef({
    attempts: 0,
    lastAttempt: 0,
  });

  /**
   * Validates a single field
   */
  const validateField = useCallback((name: string, value: any): string => {
    const fieldSchema = validationSchema[name];
    if (!fieldSchema) return '';

    if (fieldSchema.required && !value) {
      return 'This field is required';
    }

    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      return 'Invalid format';
    }

    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      return `Minimum length is ${fieldSchema.minLength}`;
    }

    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      return `Maximum length is ${fieldSchema.maxLength}`;
    }

    if (fieldSchema.validate) {
      const result = fieldSchema.validate(value);
      if (typeof result === 'string') return result;
      if (!result) return 'Invalid value';
    }

    return '';
  }, [validationSchema]);

  /**
   * Handles secure form field changes
   */
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitize(value);

    setValues(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, sanitizedValue),
    }));

    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, [validateField]);

  /**
   * Handles field blur events
   */
  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  /**
   * Validates all form fields
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(values).forEach(key => {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  /**
   * Checks rate limiting
   */
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const window = securityOptions.rateLimitWindow || DEFAULT_RATE_LIMIT.window;
    const maxAttempts = securityOptions.rateLimitAttempts || DEFAULT_RATE_LIMIT.attempts;

    if (now - rateLimitRef.current.lastAttempt > window) {
      rateLimitRef.current = {
        attempts: 1,
        lastAttempt: now,
      };
      return true;
    }

    if (rateLimitRef.current.attempts >= maxAttempts) {
      showError('Too many attempts. Please try again later.');
      return false;
    }

    rateLimitRef.current.attempts++;
    return true;
  }, [securityOptions, showError]);

  /**
   * Handles secure form submission
   */
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    // Validate form
    if (!validateForm()) {
      showWarning('Please correct the errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get device fingerprint if enabled
      if (securityOptions.enableFingerprinting) {
        const fp = await fpPromise;
        const result = await fp.get();
        setSecurityContext(prev => ({
          ...prev,
          deviceFingerprint: result.visitorId,
        }));
      }

      // Submit form with security context
      await onSubmit(values, securityContext);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [values, securityContext, validateForm, checkRateLimit, onSubmit, showError, showWarning, securityOptions]);

  /**
   * Resets form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(sanitizeValues(initialValues));
    setErrors({});
    setTouched(Object.keys(initialValues).reduce((acc, key) => ({ ...acc, [key]: false }), {}) as Record<keyof T, boolean>);
    setIsSubmitting(false);
  }, [initialValues, sanitizeValues]);

  /**
   * Sets a field value programmatically
   */
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    const sanitizedValue = typeof value === 'string' ? sanitize(value) : value;
    setValues(prev => ({
      ...prev,
      [field]: sanitizedValue,
    }));
  }, []);

  /**
   * Sets a field's touched state programmatically
   */
  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleBlur,
    resetForm,
    setFieldValue,
    setFieldTouched,
    securityStatus: securityContext,
  };
}