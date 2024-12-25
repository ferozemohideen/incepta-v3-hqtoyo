import React, { useState, useCallback, useMemo } from 'react';
import { TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../styles/theme';

// Input validation types
type ValidationRule = {
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: string) => boolean;
};

type ErrorType = 'validation' | 'server' | 'format';

type ErrorState = {
  message: string;
  type: ErrorType;
};

// Props interface with comprehensive type safety
interface InputProps {
  name: string;
  value: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  label: string;
  placeholder?: string;
  error?: string | ErrorState;
  required?: boolean;
  disabled?: boolean;
  validation?: ValidationRule;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, isValid: boolean) => void;
  'aria-describedby'?: string;
  autoComplete?: string;
  maxLength?: number;
}

// Enhanced TextField with TTO-specific styling
const StyledTextField = styled(TextField)(({ theme, error }) => ({
  width: '100%',
  marginBottom: theme.spacing(2),

  // Label styling
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    fontSize: theme.typography.body2.fontSize,
    
    '&.Mui-focused': {
      color: error ? theme.palette.error.main : theme.palette.primary.main,
    },
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },

  // Input field styling
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['border-color', 'box-shadow']),

    // Normal state
    '& fieldset': {
      borderColor: theme.palette.mode === 'light' 
        ? 'rgba(0, 0, 0, 0.23)' 
        : 'rgba(255, 255, 255, 0.23)',
    },

    // Hover state
    '&:hover fieldset': {
      borderColor: theme.palette.mode === 'light'
        ? 'rgba(0, 0, 0, 0.87)'
        : 'rgba(255, 255, 255, 0.87)',
    },

    // Focused state
    '&.Mui-focused fieldset': {
      borderColor: error 
        ? theme.palette.error.main 
        : theme.palette.primary.main,
      borderWidth: 2,
    },

    // Error state
    '&.Mui-error fieldset': {
      borderColor: theme.palette.error.main,
    },

    // Disabled state
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      
      '& fieldset': {
        borderColor: theme.palette.action.disabled,
      },
    },
  },

  // Helper text styling
  '& .MuiFormHelperText-root': {
    fontSize: theme.typography.caption.fontSize,
    marginLeft: theme.spacing(1),
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}));

/**
 * Enhanced input component implementing Material Design 3.0 principles
 * with comprehensive validation and accessibility features
 */
export const Input: React.FC<InputProps> = ({
  name,
  value,
  type = 'text',
  label,
  placeholder,
  error,
  required = false,
  disabled = false,
  validation,
  onChange,
  'aria-describedby': ariaDescribedBy,
  autoComplete,
  maxLength,
}) => {
  // State for internal validation
  const [touched, setTouched] = useState(false);
  
  // Process error state
  const errorState = useMemo(() => {
    if (!error) return undefined;
    if (typeof error === 'string') {
      return { message: error, type: 'validation' as ErrorType };
    }
    return error;
  }, [error]);

  // Validate input value
  const validateInput = useCallback((inputValue: string): boolean => {
    if (!validation) return true;
    
    const { pattern, min, max, custom } = validation;
    
    // Check pattern
    if (pattern && !pattern.test(inputValue)) {
      return false;
    }
    
    // Check length constraints
    if (typeof min === 'number' && inputValue.length < min) {
      return false;
    }
    if (typeof max === 'number' && inputValue.length > max) {
      return false;
    }
    
    // Run custom validation
    if (custom && !custom(inputValue)) {
      return false;
    }
    
    return true;
  }, [validation]);

  // Handle input changes with validation
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const isValid = validateInput(newValue);
    onChange(event, isValid);
  }, [onChange, validateInput]);

  // Handle blur event
  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  // Generate unique IDs for accessibility
  const inputId = `input-${name}`;
  const helperId = `helper-${name}`;

  return (
    <StyledTextField
      id={inputId}
      name={name}
      type={type}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={!!errorState}
      helperText={touched && errorState?.message}
      required={required}
      disabled={disabled}
      fullWidth
      variant="outlined"
      autoComplete={autoComplete}
      inputProps={{
        'aria-describedby': ariaDescribedBy || helperId,
        maxLength,
      }}
      FormHelperTextProps={{
        id: helperId,
        'aria-live': 'polite',
      }}
      aria-invalid={!!errorState}
      aria-required={required}
    />
  );
};

// Default export for convenient importing
export default Input;