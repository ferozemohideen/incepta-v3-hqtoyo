// @mui/material v5.14.0
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Skeleton, 
  Alert,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Internal imports
import TechnologyGrid from '../../components/technologies/TechnologyGrid';
import TechnologyFilters from '../../components/technologies/TechnologyFilters';
import { technologyService } from '../../services/technology.service';
import { 
  Technology,
  TechnologySearchParams,
  PatentStatus
} from '../../interfaces/technology.interface';

// Default search parameters
const DEFAULT_SEARCH_PARAMS: TechnologySearchParams = {
  query: '',
  universities: [],
  patentStatus: [],
  trlRange: { min: 1, max: 9 },
  domains: [],
  stage: [],
  dateRange: { start: null, end: null },
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 12
};

/**
 * TechnologyList component - Main page for technology discovery
 * Implements Material Design 3.0 principles with WCAG 2.1 Level AA compliance
 */
const TechnologyList: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Component state
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TechnologySearchParams>(() => {
    // Initialize filters from URL parameters
    const urlParams = Object.fromEntries(searchParams.entries());
    return {
      ...DEFAULT_SEARCH_PARAMS,
      query: urlParams['query'] || '',
      patentStatus: urlParams['patentStatus'] ? 
        (urlParams['patentStatus'] as string).split(',') as PatentStatus[] : [],
      page: parseInt(urlParams['page'] || '1', 10)
    };
  });

  // Refs for virtualization and scroll restoration
  const gridRef = useRef<HTMLDivElement>(null);
  const lastScrollPos = useRef(0);

  // Memoized search parameters for URL updates
  const searchParamsString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.patentStatus.length) {
      params.set('patentStatus', filters.patentStatus.join(','));
    }
    if (filters.page > 1) params.set('page', filters.page.toString());
    return params.toString();
  }, [filters]);

  // Update URL when filters change
  useEffect(() => {
    setSearchParams(searchParamsString, { replace: true });
  }, [searchParamsString, setSearchParams]);

  // Fetch technologies with debouncing and error handling
  const fetchTechnologies = useCallback(async () => {
    setLoading(true);
    setError(null);
    lastScrollPos.current = window.scrollY;

    try {
      const response = await technologyService.searchTechnologies(filters);
      setTechnologies(response.items);
      setTotalCount(response.total);

      // Announce results to screen readers
      const announcement = `Found ${response.total} technologies`;
      const liveRegion = document.getElementById('search-results-live');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    } catch (err) {
      setError('Failed to load technologies. Please try again.');
      console.error('Error fetching technologies:', err);
    } finally {
      setLoading(false);
      // Restore scroll position
      window.scrollTo(0, lastScrollPos.current);
    }
  }, [filters]);

  // Initial data fetch and filter changes
  useEffect(() => {
    fetchTechnologies();
  }, [fetchTechnologies]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: TechnologySearchParams) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset pagination on filter change
    }));
  }, []);

  // Handle technology selection
  const handleTechnologySelect = useCallback((technology: Technology) => {
    navigate(`/technologies/${technology.id}`);
  }, [navigate]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Accessibility live region */}
      <div
        id="search-results-live"
        className="sr-only"
        role="status"
        aria-live="polite"
      />

      {/* Page header */}
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ mb: 4, fontWeight: 500 }}
      >
        Technology Discovery
      </Typography>

      {/* Main content grid */}
      <Grid container spacing={3}>
        {/* Filters section */}
        <Grid item xs={12} md={3}>
          <TechnologyFilters
            initialFilters={filters}
            onFilterChange={handleFilterChange}
            isLoading={loading}
          />
        </Grid>

        {/* Results section */}
        <Grid item xs={12} md={9}>
          {/* Error alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Results count */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="text.secondary">
              {loading ? (
                <Skeleton width={200} />
              ) : (
                `Showing ${technologies.length} of ${totalCount} technologies`
              )}
            </Typography>
          </Box>

          {/* Technology grid with virtualization */}
          <Box ref={gridRef}>
            <TechnologyGrid
              technologies={technologies}
              totalCount={totalCount}
              onPageChange={handlePageChange}
              onTechnologySelect={handleTechnologySelect}
              loading={loading}
              error={error ? new Error(error) : null}
              aria-label="Technology listings"
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TechnologyList;