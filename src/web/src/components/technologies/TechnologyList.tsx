import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Grid, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { debounce } from 'lodash';

// Internal imports
import TechnologyCard, { TechnologyCardProps } from './TechnologyCard';
import Pagination from '../common/Pagination';
import { Technology } from '../../interfaces/technology.interface';
import ErrorBoundary from '../common/ErrorBoundary';
import { ANIMATION, SPACING } from '../../constants/ui.constants';

// Constants
const DEFAULT_PAGE_SIZE = 12;
const GRID_SPACING = 3;
const GRID_BREAKPOINTS = {
  xs: 12,
  sm: 6,
  md: 4,
  lg: 3,
} as const;

const VIRTUALIZATION_CONFIG = {
  overscan: 5,
  itemSize: 300,
} as const;

const DEBOUNCE_DELAY = 150;

const ARIA_LABELS = {
  viewModeToggle: 'Toggle view mode between grid and list',
  paginationNav: 'Page navigation',
  loadingMessage: 'Loading technologies',
  errorMessage: 'Error loading technologies',
  gridContainer: 'Technology listings grid',
  listContainer: 'Technology listings list',
} as const;

// Props interface
export interface TechnologyListProps {
  technologies: Technology[];
  totalCount: number;
  onPageChange: (page: number) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onSaveTechnology?: (id: string) => void;
  onShareTechnology?: (id: string) => void;
  onViewTechnology?: (id: string) => void;
  initialViewMode?: 'grid' | 'list';
  showMatchScores?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * TechnologyList component for displaying paginated technology listings
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
export const TechnologyList: React.FC<TechnologyListProps> = ({
  technologies,
  totalCount,
  onPageChange,
  onViewModeChange,
  onSaveTechnology,
  onShareTechnology,
  onViewTechnology,
  initialViewMode = 'grid',
  showMatchScores = false,
  isLoading = false,
  error = null,
}) => {
  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Virtual list configuration
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: technologies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => VIRTUALIZATION_CONFIG.itemSize,
    overscan: VIRTUALIZATION_CONFIG.overscan,
  });

  // Debounced handlers
  const debouncedViewModeChange = useCallback(
    debounce((mode: 'grid' | 'list') => {
      onViewModeChange?.(mode);
    }, DEBOUNCE_DELAY),
    [onViewModeChange]
  );

  // Handle view mode changes
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'grid' | 'list' | null) => {
      if (newMode) {
        setViewMode(newMode);
        debouncedViewModeChange(newMode);
      }
    },
    [debouncedViewModeChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        setFocusedIndex(Math.min(index + 1, technologies.length - 1));
        break;
      case 'ArrowLeft':
        setFocusedIndex(Math.max(index - 1, 0));
        break;
      case 'ArrowUp':
        setFocusedIndex(Math.max(index - (viewMode === 'grid' ? 4 : 1), 0));
        break;
      case 'ArrowDown':
        setFocusedIndex(Math.min(index + (viewMode === 'grid' ? 4 : 1), technologies.length - 1));
        break;
    }
  }, [technologies.length, viewMode]);

  // Memoized card renderer
  const renderTechnologyCard = useCallback((technology: Technology, index: number) => {
    const cardProps: TechnologyCardProps = {
      technology,
      onSave: onSaveTechnology,
      onShare: onShareTechnology,
      onView: onViewTechnology,
      showActions: true,
      matchScore: showMatchScores ? technology.metadata?.matchScore : undefined,
    };

    return (
      <Grid 
        item 
        {...(viewMode === 'grid' ? GRID_BREAKPOINTS : { xs: 12 })}
        key={technology.id}
      >
        <div
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, index)}
          aria-selected={focusedIndex === index}
          style={{ height: '100%' }}
        >
          <TechnologyCard {...cardProps} />
        </div>
      </Grid>
    );
  }, [
    onSaveTechnology,
    onShareTechnology,
    onViewTechnology,
    showMatchScores,
    viewMode,
    focusedIndex,
    handleKeyDown,
  ]);

  // Error handling
  if (error) {
    return (
      <ErrorBoundary>
        <Box role="alert" aria-label={ARIA_LABELS.errorMessage}>
          {error.message}
        </Box>
      </ErrorBoundary>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* View mode toggle */}
      <Box sx={{ mb: SPACING.SCALE.md }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label={ARIA_LABELS.viewModeToggle}
          size="small"
        >
          <ToggleButton value="grid" aria-label="Grid view">
            Grid
          </ToggleButton>
          <ToggleButton value="list" aria-label="List view">
            List
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Technology grid/list */}
      <Box
        ref={parentRef}
        sx={{
          height: '100%',
          overflowY: 'auto',
          transition: `opacity ${ANIMATION.DURATION_MEDIUM}ms ${ANIMATION.EASING.STANDARD}`,
          opacity: isLoading ? 0.5 : 1,
        }}
        role="region"
        aria-label={viewMode === 'grid' ? ARIA_LABELS.gridContainer : ARIA_LABELS.listContainer}
        aria-busy={isLoading}
      >
        <Grid container spacing={GRID_SPACING}>
          {virtualizer.getVirtualItems().map((virtualRow) => (
            renderTechnologyCard(technologies[virtualRow.index], virtualRow.index)
          ))}
        </Grid>
      </Box>

      {/* Pagination */}
      <Box sx={{ mt: SPACING.SCALE.md }}>
        <Pagination
          totalItems={totalCount}
          initialPageSize={DEFAULT_PAGE_SIZE}
          onPageChange={onPageChange}
          ariaLabel={ARIA_LABELS.paginationNav}
        />
      </Box>
    </Box>
  );
};

export default TechnologyList;