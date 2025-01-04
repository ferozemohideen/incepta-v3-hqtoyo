// @mui/material v5.14.0
import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';
import { useDebounce } from 'use-debounce';

// Internal imports
import GrantCard from './GrantCard';
import GrantFilters from './GrantFilters';
import Pagination from '../common/Pagination';
import { grantService } from '../../services/grant.service';
import { IGrant, IGrantSearchParams } from '../../interfaces/grant.interface';
import { SPACING } from '../../constants/ui.constants';

// Styled components wrapper for consistent spacing and layout
const ListContainer = Box;
const LoadingContainer = Box;

// Interface for component props
interface GrantListProps {
  initialFilters?: Partial<IGrantSearchParams>;
  onGrantSelect?: (grant: IGrant) => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * GrantList Component
 * 
 * Displays a paginated list of grants with filtering capabilities and match scores.
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance.
 */
const GrantList: React.FC<GrantListProps> = React.memo(({
  initialFilters = {},
  onGrantSelect,
  onError,
  className
}) => {
  // Component state
  const [grants, setGrants] = useState<IGrant[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<IGrantSearchParams>({
    page: 1,
    limit: 10,
    ...initialFilters
  });

  // Debounce filter changes to prevent excessive API calls
  const [debouncedFilters] = useDebounce(filters, 300);

  // Fetch grants with current filters
  const fetchGrants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await grantService.searchGrants(debouncedFilters);
      setGrants(response.data);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Error fetching grants:', error);
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, onError]);

  // Fetch grants when filters change
  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: IGrantSearchParams) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page on filter change
    }));
  }, []);

  // Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  }, []);

  // Handle grant selection
  const handleGrantClick = useCallback((grant: IGrant) => {
    onGrantSelect?.(grant);
  }, [onGrantSelect]);

  // Render loading state
  if (loading && !grants.length) {
    return (
      <LoadingContainer
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
          width: '100%'
        }}
      >
        <CircularProgress
          size={40}
          aria-label="Loading grants"
        />
      </LoadingContainer>
    );
  }

  return (
    <ListContainer
      className={className}
      sx={{
        position: 'relative',
        minHeight: 400,
        width: '100%'
      }}
    >
      {/* Filters Section */}
      <Box mb={SPACING.SCALE.md}>
        <GrantFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
          disabled={loading}
        />
      </Box>

      {/* Results Count */}
      <Typography
        variant="body2"
        color="text.secondary"
        mb={SPACING.SCALE.sm}
        role="status"
        aria-live="polite"
      >
        {totalItems} grants found
      </Typography>

      {/* Loading Overlay */}
      {loading && (
        <LoadingContainer
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1
          }}
        >
          <CircularProgress size={40} />
        </LoadingContainer>
      )}

      {/* Grants Grid */}
      <Grid
        container
        spacing={SPACING.SCALE.md}
        aria-live="polite"
        aria-busy={loading}
      >
        {grants.map((grant) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            key={grant.id}
          >
            <GrantCard
              grant={grant}
              matchScore={75} // TODO: Implement actual match score calculation
              onClick={() => handleGrantClick(grant)}
              onSave={() => {}} // TODO: Implement save functionality
              onApply={() => {}} // TODO: Implement apply functionality
            />
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!loading && !grants.length && (
        <Box
          sx={{
            textAlign: 'center',
            py: SPACING.SCALE.xl
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No grants found matching your criteria
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters to see more results
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <Box
          sx={{
            mt: SPACING.SCALE.lg,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Pagination
            totalItems={totalItems}
            initialPage={filters.page}
            initialPageSize={filters.limit}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </Box>
      )}
    </ListContainer>
  );
});

// Display name for debugging
GrantList.displayName = 'GrantList';

export default GrantList;
export type { GrantListProps };