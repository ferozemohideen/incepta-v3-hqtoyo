// @mui/material v5.14.0
import { 
  Select as MuiSelect, 
  SelectProps, 
  FormControl, 
  InputLabel, 
  FormHelperText 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { forwardRef, ForwardedRef, memo } from 'react';

// Interfaces
interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps extends Omit<SelectProps, 'onChange'> {
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  multiple?: boolean;
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Styled components with accessibility and theme integration
const StyledFormControl = styled(FormControl)(({ theme, fullWidth }) => ({
  margin: theme.spacing(1),
  minWidth: 120,
  width: fullWidth ? '100%' : 'auto',
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.23)' 
      : 'rgba(255, 255, 255, 0.23)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
}));

const StyledSelect = styled(MuiSelect)(({ theme }) => ({
  borderRadius: 4,
  backgroundColor: theme.palette.background.paper,
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&:focus': {
    borderRadius: 4,
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
  },
  '&.Mui-error': {
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.error.main,
    },
  },
  // Enhanced keyboard focus styles for accessibility
  '&.Mui-focused': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  // High contrast ratio for accessibility
  '& .MuiSelect-select': {
    color: theme.palette.text.primary,
  },
  '& .MuiSelect-icon': {
    color: theme.palette.text.secondary,
  },
}));

/**
 * A reusable select component with enhanced accessibility and Material Design compliance
 * Implements WCAG 2.1 Level AA standards for keyboard navigation and visual feedback
 */
const CustomSelect = forwardRef((
  props: CustomSelectProps,
  ref: ForwardedRef<HTMLSelectElement>
) => {
  const {
    label,
    error = false,
    helperText,
    required = false,
    fullWidth = false,
    multiple = false,
    options,
    value,
    onChange,
    name,
    disabled = false,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...selectProps
  } = props;

  // Generate unique IDs for accessibility
  const labelId = `${name}-label`;
  const helperId = `${name}-helper`;

  // Handle change events
  const handleChange = (event: any) => {
    const newValue = multiple 
      ? event.target.value 
      : event.target.value;
    onChange(newValue);
  };

  return (
    <StyledFormControl
      fullWidth={fullWidth}
      error={error}
      required={required}
      variant="outlined"
    >
      {label && (
        <InputLabel
          id={labelId}
          error={error}
          required={required}
        >
          {label}
        </InputLabel>
      )}
      
      <StyledSelect
        labelId={labelId}
        id={name}
        value={value}
        onChange={handleChange}
        multiple={multiple}
        disabled={disabled}
        ref={ref}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy || (helperText ? helperId : undefined)}
        aria-invalid={error}
        aria-required={required}
        label={label}
        {...selectProps}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            aria-selected={
              multiple 
                ? Array.isArray(value) && value.includes(String(option.value))
                : value === option.value
            }
          >
            {option.label}
          </option>
        ))}
      </StyledSelect>

      {helperText && (
        <FormHelperText
          id={helperId}
          error={error}
        >
          {helperText}
        </FormHelperText>
      )}
    </StyledFormControl>
  );
});

// Display name for debugging
CustomSelect.displayName = 'CustomSelect';

// Memoize component for performance
const Select = memo(CustomSelect);

export default Select;

// Type exports for consumers
export type { SelectOption, CustomSelectProps };