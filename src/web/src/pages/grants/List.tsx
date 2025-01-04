import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Skeleton } from '@mui/material';

// Internal components and services
import MainLayout from '../../layouts/MainLayout';
import GrantList from '../../components/grants/GrantList';
import { useNotification } from '../../hooks/useNotification';
import { grantService } from '../../services/grant.service';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { IGrant, IGrantSearchParams, GrantSortField, SortOrder } from '../../interfaces/grant.interface';

/**
 * Interface for grant search state with URL synchronization
 */
interface IGrantSearchState {
  filters: IGrantSearchParams;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
}

/**
 * GrantListPage Component
 * Displays a searchable, filterable list of grant opportunities with match scores
 * and real-time status updates. Implements Material Design 3.0 principles.
 */
const GrantListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize search state
  const [searchState, setSearchState] = useState<IGrantSearchState>({
    filters: {
      page: 1,
      limit: 10,
      sortBy: GrantSortField.DEADLINE,
      sortOrder: SortOrder.ASC
    },
    sortBy: 'deadline',
    sortOrder: 'asc',
    page: 1
  });

  // Subscribe to real-time grant updates
  useEffect(() => {
    const subscription = grantService.subscribeToGrantUpdates((update: IGrant) => {
      showSuccess(`Grant "${update.title}" has been updated`);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [showSuccess]);

  /**
   * Handle grant selection and navigation
   */
  const handleGrantSelect = useCallback((grant: IGrant) => {
    navigate(`/grants/${grant.id}`);
  }, [navigate]);

  /**
   * Handle search filter changes
   */
  const handleFilterChange = useCallback((newFilters: IGrantSearchParams) => {
    setSearchState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...newFilters
      },
      page: 1 // Reset to first page on filter change
    }));
  }, []);

  /**
   * Handle errors from child components
   */
  const handleError = useCallback((error: Error) => {
    showError('Failed to load grants. Please try again later.');
    console.error('Grant list error:', error);
  }, [showError]);

  return (
    <ErrorBoundary
      onError={handleError}
      fallbackComponent={
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Failed to load grants. Please try again later.
          </Typography>
        </Box>
      }
    >
      <MainLayout>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: '100%',
            maxWidth: 'lg',
            mx: 'auto'
          }}
        >
          {/* Page Header */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ mb: 4 }}
          >
            Grant Opportunities
          </Typography>

          {/* Loading State */}
          {isLoading ? (
            <Box sx={{ width: '100%' }}>
              {[...Array(3)].map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={200}
                  sx={{ mb: 2, borderRadius: 1 }}
                />
              ))}
            </Box>
          ) : (
            /* Grant List Component */
            <GrantList
              initialFilters={searchState.filters}
              onGrantSelect={handleGrantSelect}
              onError={handleError}
            />
          )}
        </Box>
      </MainLayout>
    </ErrorBoundary>
  );
};

export default GrantListPage;