import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Select, MenuItem } from '@mui/material';
import { usePagination, PaginationConfig, PaginationState } from '../../hooks/usePagination';
import CustomButton from './Button';

// Constants for pagination configuration
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const ARIA_LABELS = {
  firstPage: 'Go to first page',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  lastPage: 'Go to last page',
  pageSize: 'Select number of items per page',
  currentPage: 'Current page, page {0}',
  pageButton: 'Go to page {0}',
  ellipsis: 'More pages available'
} as const;

const KEYBOARD_KEYS = {
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  ENTER: 'Enter',
  SPACE: ' '
} as const;

// Interface for component props
export interface PaginationProps {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: number;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPageSize?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  ariaLabel?: string;
}

// Helper function to render page numbers with proper accessibility
const renderPageNumbers = (
  visiblePages: number[],
  currentPage: number,
  changePage: (page: number) => void,
  disabled: boolean
): JSX.Element[] => {
  return visiblePages.map((pageNum) => (
    <CustomButton
      key={pageNum}
      variant={pageNum === currentPage ? 'contained' : 'outlined'}
      size="small"
      disabled={disabled || pageNum === currentPage}
      onClick={() => changePage(pageNum)}
      aria-label={pageNum === currentPage 
        ? ARIA_LABELS.currentPage.replace('{0}', pageNum.toString())
        : ARIA_LABELS.pageButton.replace('{0}', pageNum.toString())}
      aria-current={pageNum === currentPage ? 'page' : undefined}
    >
      {pageNum}
    </CustomButton>
  ));
};

// Main Pagination component
export const Pagination = memo<PaginationProps>(({
  totalItems,
  initialPage = 1,
  initialPageSize = 10,
  maxVisiblePages = 5,
  showFirstLast = true,
  showPageSize = true,
  disabled = false,
  onPageChange,
  onPageSizeChange,
  className,
  ariaLabel = 'Pagination navigation'
}) => {
  // Initialize pagination hook with configuration
  const paginationConfig: PaginationConfig = {
    totalItems,
    initialPage,
    initialPageSize,
    maxVisiblePages,
    showFirstLast,
    showPageSize,
    disabled,
    onPageChange,
    onPageSizeChange
  };

  const { state, actions } = usePagination(paginationConfig);
  const announcer = useRef<HTMLDivElement>(null);

  // Update screen reader announcements
  useEffect(() => {
    if (announcer.current && state.announcement) {
      announcer.current.textContent = state.announcement;
    }
  }, [state.announcement]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_LEFT:
        if (!state.isFirstPage) {
          event.preventDefault();
          actions.goToPreviousPage();
        }
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (!state.isLastPage) {
          event.preventDefault();
          actions.goToNextPage();
        }
        break;
      case KEYBOARD_KEYS.HOME:
        if (showFirstLast && !state.isFirstPage) {
          event.preventDefault();
          actions.goToFirstPage();
        }
        break;
      case KEYBOARD_KEYS.END:
        if (showFirstLast && !state.isLastPage) {
          event.preventDefault();
          actions.goToLastPage();
        }
        break;
    }
  }, [state, actions, disabled, showFirstLast]);

  return (
    <nav
      className={className}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      role="navigation"
    >
      {/* Hidden live region for screen reader announcements */}
      <div
        ref={announcer}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <div className="pagination-controls">
        {/* First page button */}
        {showFirstLast && (
          <CustomButton
            disabled={disabled || state.isFirstPage}
            onClick={actions.goToFirstPage}
            aria-label={ARIA_LABELS.firstPage}
            size="small"
          >
            «
          </CustomButton>
        )}

        {/* Previous page button */}
        <CustomButton
          disabled={disabled || state.isFirstPage}
          onClick={actions.goToPreviousPage}
          aria-label={ARIA_LABELS.previousPage}
          size="small"
        >
          ‹
        </CustomButton>

        {/* Page number buttons */}
        {renderPageNumbers(
          state.visiblePages,
          state.currentPage,
          actions.changePage,
          disabled
        )}

        {/* Next page button */}
        <CustomButton
          disabled={disabled || state.isLastPage}
          onClick={actions.goToNextPage}
          aria-label={ARIA_LABELS.nextPage}
          size="small"
        >
          ›
        </CustomButton>

        {/* Last page button */}
        {showFirstLast && (
          <CustomButton
            disabled={disabled || state.isLastPage}
            onClick={actions.goToLastPage}
            aria-label={ARIA_LABELS.lastPage}
            size="small"
          >
            »
          </CustomButton>
        )}

        {/* Page size selector */}
        {showPageSize && (
          <Select
            value={state.pageSize}
            onChange={(e) => actions.changePageSize(e.target.value as number)}
            disabled={disabled}
            size="small"
            aria-label={ARIA_LABELS.pageSize}
            className="page-size-select"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <MenuItem key={size} value={size}>
                {size} per page
              </MenuItem>
            ))}
          </Select>
        )}
      </div>
    </nav>
  );
});

// Set display name for debugging
Pagination.displayName = 'Pagination';

export default Pagination;