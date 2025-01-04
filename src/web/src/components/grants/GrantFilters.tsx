// @mui/material v5.14.0, @mui/x-date-pickers v6.10.0
import React, { useMemo, memo } from 'react';
import { 
  Grid, 
  TextField, 
  Button, 
  Box, 
  Tooltip,
  InputAdornment,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { CustomSelect } from '../common/Select';
import { 
  IGrantSearchParams, 
  GrantType, 
  GrantSortField, 
  SortOrder 
} from '../../interfaces/grant.interface';
import { useForm } from '../../hooks/useForm';
import { SPACING } from '../../constants/ui.constants';

// Constants for filter options
const GRANT_TYPE_OPTIONS = Object.values(GrantType).map(type => ({
  value: type,
  label: type.replace('_', ' ')
}));

const AGENCY_OPTIONS = [
  { value: 'NSF', label: 'National Science Foundation' },
  { value: 'NIH', label: 'National Institutes of Health' },
  { value: 'DOE', label: 'Department of Energy' },
  { value: 'DOD', label: 'Department of Defense' },
  { value: 'PRIVATE', label: 'Private Organizations' }
];

// Props interface with validation
interface GrantFiltersProps {
  onFilterChange: (filters: IGrantSearchParams) => void;
  initialFilters?: Partial<IGrantSearchParams>;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

// Validation schema for form fields
const validationSchema = {
  type: {
    required: false,
  },
  agency: {
    required: false,
  },
  minAmount: {
    required: false,
    validate: (value: number) => value >= 0 || 'Amount must be positive',
  },
  maxAmount: {
    required: false,
    validate: (value: number) => value >= 0 || 'Amount must be positive',
  },
  deadline: {
    required: false,
    validate: (value: Date) => value >= new Date() || 'Deadline must be in the future',
  },
  sortBy: {
    required: false,
  },
  sortOrder: {
    required: false,
  }
};

/**
 * GrantFilters Component
 * 
 * A comprehensive and accessible filter interface for grant searches with
 * enhanced security validation and real-time updates.
 */
const GrantFilters: React.FC<GrantFiltersProps> = memo(({
  onFilterChange,
  initialFilters = {},
  className,
  disabled = false,
  'aria-label': ariaLabel = 'Grant filter form'
}) => {
  // Initialize form with validation and security measures
  const { values, errors, touched, handleChange, handleSubmit, setFieldValue } = useForm({
    initialValues: {
      type: initialFilters.type || [],
      agency: initialFilters.agency || [],
      minAmount: initialFilters.minAmount || 0,
      maxAmount: initialFilters.maxAmount || 0,
      deadline: initialFilters.deadline?.start || null,
      sortBy: initialFilters.sortBy || GrantSortField.DEADLINE,
      sortOrder: initialFilters.sortOrder || SortOrder.ASC
    },
    validationSchema,
    onSubmit: handleFilterSubmit
  });

  // Memoized sort options
  const sortOptions = useMemo(() => Object.values(GrantSortField).map(field => ({
    value: field,
    label: field.replace('_', ' ').toLowerCase()
  })), []);

  // Handle filter submission with validation
  function handleFilterSubmit(formValues: typeof values) {
    // Validate amount range
    if (formValues.maxAmount > 0 && formValues.minAmount > formValues.maxAmount) {
      return;
    }

    // Construct filter params with proper validation
    const filters: IGrantSearchParams = {
      type: formValues.type,
      agency: formValues.agency,
      minAmount: formValues.minAmount || undefined,
      maxAmount: formValues.maxAmount || undefined,
      deadline: formValues.deadline ? {
        start: formValues.deadline,
        end: new Date(formValues.deadline.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days range
      } : undefined,
      sortBy: formValues.sortBy,
      sortOrder: formValues.sortOrder
    };

    onFilterChange(filters);
  }

  // Render filter form with accessibility support
  return (
    <Box
      component="form"
      onSubmit={(e) => handleSubmit(e)}
      className={className}
      aria-label={ariaLabel}
      sx={{
        p: SPACING.SCALE.md,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        '& .MuiGrid-item': {
          display: 'flex',
          alignItems: 'flex-start'
        }
      }}
    >
      <Grid container spacing={SPACING.SCALE.md}>
        {/* Grant Type Filter */}
        <Grid item xs={12} md={6}>
          <CustomSelect
            label="Grant Type"
            name="type"
            options={GRANT_TYPE_OPTIONS}
            value={values.type}
            onChange={(value) => setFieldValue('type', value)}
            error={touched.type && !!errors.type}
            helperText={touched.type ? errors.type : ''}
            multiple
            fullWidth
            disabled={disabled}
            aria-label="Filter by grant type"
          />
        </Grid>

        {/* Agency Filter */}
        <Grid item xs={12} md={6}>
          <CustomSelect
            label="Funding Agency"
            name="agency"
            options={AGENCY_OPTIONS}
            value={values.agency}
            onChange={(value) => setFieldValue('agency', value)}
            error={touched.agency && !!errors.agency}
            helperText={touched.agency ? errors.agency : ''}
            multiple
            fullWidth
            disabled={disabled}
            aria-label="Filter by funding agency"
          />
        </Grid>

        {/* Amount Range Filters */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Minimum Amount"
            name="minAmount"
            type="number"
            value={values.minAmount}
            onChange={handleChange}
            error={touched.minAmount && !!errors.minAmount}
            helperText={touched.minAmount ? errors.minAmount : ''}
            fullWidth
            disabled={disabled}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              inputProps: { min: 0, 'aria-label': 'Minimum grant amount' }
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Maximum Amount"
            name="maxAmount"
            type="number"
            value={values.maxAmount}
            onChange={handleChange}
            error={touched.maxAmount && !!errors.maxAmount}
            helperText={touched.maxAmount ? errors.maxAmount : ''}
            fullWidth
            disabled={disabled}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              inputProps: { min: 0, 'aria-label': 'Maximum grant amount' }
            }}
          />
        </Grid>

        {/* Deadline Filter */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Deadline After"
            value={values.deadline}
            onChange={(date) => setFieldValue('deadline', date)}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
                error: touched.deadline && !!errors.deadline,
                helperText: touched.deadline ? errors.deadline : '',
                inputProps: {
                  'aria-label': 'Filter by grant deadline'
                }
              }
            }}
          />
        </Grid>

        {/* Sort Controls */}
        <Grid item xs={12} sm={6}>
          <CustomSelect
            label="Sort By"
            name="sortBy"
            options={sortOptions}
            value={values.sortBy}
            onChange={(value) => setFieldValue('sortBy', value)}
            fullWidth
            disabled={disabled}
            aria-label="Sort grants by field"
          />
        </Grid>

        {/* Clear Filters Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Tooltip title="Clear all filters">
              <Button
                type="button"
                onClick={() => handleFilterSubmit(validationSchema)}
                disabled={disabled}
                aria-label="Clear filters"
              >
                Clear Filters
              </Button>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
});

// Display name for debugging
GrantFilters.displayName = 'GrantFilters';

export default GrantFilters;