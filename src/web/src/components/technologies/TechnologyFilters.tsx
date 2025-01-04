// @mui/material v5.14.0
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Slider,
  Typography,
  Paper,
  FormGroup,
  Tooltip,
  Chip,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { debounce } from 'lodash'; // v4.17.21
import Select from '../common/Select';
import Input from '../common/Input';
import {
  TechnologySearchParams,
  PatentStatus,
  DevelopmentStage,
} from '../../interfaces/technology.interface';

// Styled components with accessibility enhancements
const FilterContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  '&:focus-within': {
    boxShadow: theme.shadows[3],
  },
}));

const FilterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const FilterLabel = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));

const ActiveFiltersContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

// Props interface
interface TechnologyFiltersProps {
  initialFilters: TechnologySearchParams;
  onFilterChange: (filters: TechnologySearchParams) => void;
  isLoading?: boolean;
}

/**
 * TechnologyFilters component providing advanced filter controls for technology listings
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 */
export const TechnologyFilters: React.FC<TechnologyFiltersProps> = ({
  initialFilters,
  onFilterChange,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<TechnologySearchParams>(initialFilters);
  const isInitialMount = useRef(true);

  // Memoized patent status options
  const patentStatusOptions = useMemo(() => 
    Object.values(PatentStatus).map(status => ({
      value: status,
      label: status.replace('_', ' ').toLowerCase(),
    })),
    []
  );

  // Memoized development stage options
  const stageOptions = useMemo(() => 
    Object.values(DevelopmentStage).map(stage => ({
      value: stage,
      label: stage.replace('_', ' ').toLowerCase(),
    })),
    []
  );

  // Debounced filter change handler
  const debouncedFilterChange = useCallback(
    debounce((newFilters: TechnologySearchParams) => {
      onFilterChange(newFilters);
    }, 300),
    [onFilterChange]
  );

  // Effect to handle filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    debouncedFilterChange(filters);
  }, [filters, debouncedFilterChange]);

  // Handle search query changes
  const handleSearchChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    isValid: boolean
  ) => {
    if (!isValid) return;
    setFilters(prev => ({
      ...prev,
      query: event.target.value,
      page: 1, // Reset pagination on search
    }));
  }, []);

  // Handle TRL range changes
  const handleTRLChange = useCallback((_: Event, newValue: number | number[]) => {
    setFilters(prev => ({
      ...prev,
      trlRange: {
        min: Array.isArray(newValue) ? newValue[0] : prev.trlRange.min,
        max: Array.isArray(newValue) ? newValue[1] : prev.trlRange.max,
      },
    }));
  }, []);

  // Handle patent status changes
  const handlePatentStatusChange = useCallback((value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      patentStatus: (Array.isArray(value) ? value : [value]) as PatentStatus[],
    }));
  }, []);

  // Handle development stage changes
  const handleStageChange = useCallback((value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      stage: (Array.isArray(value) ? value : [value]) as DevelopmentStage[],
    }));
  }, []);

  // Handle filter reset
  const handleReset = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Render active filters
  const renderActiveFilters = useMemo(() => {
    const activeFilters = [];

    if (filters.query) {
      activeFilters.push(
        <Chip
          key="query"
          label={`Search: ${filters.query}`}
          onDelete={() => handleSearchChange({ target: { value: '' } } as any, true)}
          color="primary"
          variant="outlined"
        />
      );
    }

    if (filters.patentStatus.length > 0) {
      activeFilters.push(
        <Chip
          key="patent"
          label={`Patent Status: ${filters.patentStatus.length}`}
          onDelete={() => handlePatentStatusChange([])}
          color="primary"
          variant="outlined"
        />
      );
    }

    return activeFilters;
  }, [filters, handleSearchChange, handlePatentStatusChange]);

  return (
    <FilterContainer
      role="search"
      aria-label="Technology search filters"
    >
      {/* Search Input */}
      <FilterSection>
        <Input
          name="technology-search"
          label="Search Technologies"
          value={filters.query}
          onChange={handleSearchChange}
          placeholder="Search by title, description, or keywords..."
          type="search"
          disabled={isLoading}
          aria-label="Search technologies"
        />
      </FilterSection>

      <Divider sx={{ my: 2 }} />

      {/* TRL Range Slider */}
      <FilterSection>
        <FilterLabel variant="subtitle2">
          Technology Readiness Level (TRL)
        </FilterLabel>
        <Slider
          value={[filters.trlRange.min, filters.trlRange.max]}
          onChange={handleTRLChange}
          valueLabelDisplay="auto"
          min={1}
          max={9}
          marks
          disabled={isLoading}
          aria-label="TRL range"
          getAriaValueText={(value) => `TRL ${value}`}
        />
      </FilterSection>

      {/* Patent Status Select */}
      <FilterSection>
        <Select
          label="Patent Status"
          value={filters.patentStatus}
          onChange={handlePatentStatusChange}
          options={patentStatusOptions}
          multiple
          disabled={isLoading}
          aria-label="Select patent status"
        />
      </FilterSection>

      {/* Development Stage Select */}
      <FilterSection>
        <Select
          label="Development Stage"
          value={filters.stage}
          onChange={handleStageChange}
          options={stageOptions}
          multiple
          disabled={isLoading}
          aria-label="Select development stage"
        />
      </FilterSection>

      {/* Active Filters */}
      {renderActiveFilters.length > 0 && (
        <ActiveFiltersContainer>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Active Filters:
            </Typography>
            {renderActiveFilters}
            <Tooltip title="Reset all filters">
              <IconButton
                onClick={handleReset}
                size="small"
                aria-label="Reset filters"
              >
                ⨉
              </IconButton>
            </Tooltip>
          </Stack>
        </ActiveFiltersContainer>
      )}
    </FilterContainer>
  );
};

export default TechnologyFilters;