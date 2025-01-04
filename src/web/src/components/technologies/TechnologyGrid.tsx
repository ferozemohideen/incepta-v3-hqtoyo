// @mui/material v5.14.0
import { Grid, Box, Pagination, Skeleton } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { memo, useRef, useEffect } from 'react';

// Internal imports
import TechnologyCard from './TechnologyCard';
import { Technology } from '../../interfaces/technology.interface';
import { usePagination, PaginationConfig } from '../../hooks/usePagination';

/**
 * Props interface for TechnologyGrid component
 */
export interface TechnologyGridProps {
  technologies: Technology[];
  totalCount: number;
  onPageChange: (page: number) => void;
  onTechnologySelect: (technology: Technology) => void;
  loading?: boolean;
  'aria-label'?: string;
}

/**
 * Styled Grid container with responsive spacing and accessibility enhancements
 */
const StyledGrid = styled(Grid)(({ theme }) => ({
  width: '100%',
  margin: 0,
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
  // Enhanced focus visibility for keyboard navigation
  '& .MuiGrid-item:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  // High contrast mode support
  '@media (forced-colors: active)': {
    '& .MuiGrid-item:focus-within': {
      outline: '2px solid ButtonText',
    },
  },
}));

/**
 * Error Fallback component for error boundary
 */
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <Box
    role="alert"
    sx={{
      p: 3,
      textAlign: 'center',
      color: 'error.main',
    }}
  >
    <h2>Error Loading Technologies</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try Again</button>
  </Box>
);

/**
 * Calculate responsive grid columns based on breakpoint
 */
const getGridColumns = (theme: any) => ({
  xs: 12, // 1 column
  sm: 6,  // 2 columns
  md: 4,  // 3 columns
  lg: 3,  // 4 columns
  xl: 3,  // 4 columns
});

/**
 * TechnologyGrid component with virtualization and accessibility
 */
const TechnologyGrid = memo(({
  technologies,
  totalCount,
  onPageChange,
  onTechnologySelect,
  loading = false,
  'aria-label': ariaLabel = 'Technology listings grid',
}: TechnologyGridProps) => {
  const theme = useTheme();
  const parentRef = useRef<HTMLDivElement>(null);

  // Configure pagination
  const paginationConfig: Required<Pick<PaginationConfig, 'totalItems' | 'initialPageSize' | 'showFirstLast' | 'onPageChange' | 'ariaLabels'>> = {
    totalItems: totalCount,
    initialPageSize: 12,
    showFirstLast: true,
    onPageChange,
    ariaLabels: {
      nextPage: 'Next page of technologies',
      previousPage: 'Previous page of technologies',
      firstPage: 'First page of technologies',
      lastPage: 'Last page of technologies',
    },
  };

  const { state: paginationState, actions: paginationActions } = usePagination(paginationConfig);

  // Configure virtualization
  const virtualizer = useVirtualizer({
    count: technologies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimated card height
    overscan: 5,
  });

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, technology: Technology) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTechnologySelect(technology);
    }
  };

  // Update ARIA live region for screen readers
  useEffect(() => {
    const announcement = loading
      ? 'Loading technologies'
      : `Showing ${technologies.length} of ${totalCount} technologies`;
    
    const liveRegion = document.getElementById('technology-grid-live-region');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [loading, technologies.length, totalCount]);

  // Render loading skeletons
  if (loading) {
    return (
      <StyledGrid container spacing={3} role="grid" aria-busy="true" aria-label={ariaLabel}>
        {Array.from({ length: 12 }).map((_, index) => (
          <Grid item key={index} {...getGridColumns(theme)}>
            <Skeleton
              variant="rectangular"
              height={350}
              sx={{ borderRadius: 2 }}
              animation="wave"
            />
          </Grid>
        ))}
      </StyledGrid>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Box>
        {/* ARIA live region for announcements */}
        <div
          id="technology-grid-live-region"
          aria-live="polite"
          className="sr-only"
          role="status"
        />

        {/* Virtualized grid */}
        <Box ref={parentRef} sx={{ height: '100%', overflowY: 'auto' }}>
          <StyledGrid
            container
            spacing={3}
            role="grid"
            aria-label={ariaLabel}
            aria-rowcount={technologies.length}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const technology = technologies[virtualRow.index];
              return (
                <Grid
                  item
                  key={technology.id.toString()}
                  {...getGridColumns(theme)}
                  role="gridcell"
                  aria-rowindex={virtualRow.index + 1}
                >
                  <TechnologyCard
                    technology={technology}
                    onView={() => onTechnologySelect(technology)}
                    onKeyDown={(e) => handleKeyDown(e, technology)}
                    tabIndex={0}
                    showActions
                  />
                </Grid>
              );
            })}
          </StyledGrid>
        </Box>

        {/* Pagination controls */}
        {totalCount > paginationConfig.initialPageSize && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 3,
            }}
          >
            <Pagination
              count={paginationState.totalPages}
              page={paginationState.currentPage}
              onChange={(_, page) => paginationActions.changePage(page)}
              color="primary"
              showFirstButton={paginationConfig.showFirstLast}
              showLastButton={paginationConfig.showFirstLast}
              disabled={loading}
              aria-label="Technology pagination"
              getItemAriaLabel={(type, page) => paginationConfig.ariaLabels[type] || `Go to page ${page}`}
            />
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
});

TechnologyGrid.displayName = 'TechnologyGrid';

export default TechnologyGrid;