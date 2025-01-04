import { useState, useCallback, useMemo, useEffect, useRef } from 'react'; // ^18.0.0

// Constants
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_VISIBLE_PAGES = 5;
const MIN_PAGE = 1;
const DEBOUNCE_DELAY = 150;

const DEFAULT_ARIA_LABELS = {
  nextPage: 'Go to next page',
  previousPage: 'Go to previous page',
  firstPage: 'Go to first page',
  lastPage: 'Go to last page',
  pageSize: 'Select page size',
  pageNumber: 'Go to page',
  currentPage: 'Current page',
} as const;

const KEYBOARD_SHORTCUTS = {
  NEXT: 'ArrowRight',
  PREVIOUS: 'ArrowLeft',
  FIRST: 'Home',
  LAST: 'End',
} as const;

// Interfaces
export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPageSize?: boolean;
  disabled?: boolean;
  ariaLabels?: Record<string, string>;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  visiblePages: number[];
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  announcement: string;
}

// Helper function to calculate visible pages
const calculateVisiblePages = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number
): number[] => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let startPage = Math.max(
    currentPage - Math.floor(maxVisiblePages / 2),
    MIN_PAGE
  );
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(endPage - maxVisiblePages + 1, MIN_PAGE);
  }

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );
};

export const usePagination = (config: PaginationConfig) => {
  // Validate and normalize configuration
  const {
    initialPage = MIN_PAGE,
    initialPageSize = DEFAULT_PAGE_SIZE,
    totalItems,
    maxVisiblePages = DEFAULT_MAX_VISIBLE_PAGES,
    showFirstLast = true,
    disabled = false,
    onPageChange,
    onPageSizeChange,
  } = config;

  // State initialization
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const debouncedPageSizeTimer = useRef<NodeJS.Timeout>();

  // Calculate derived state
  const totalPages = useMemo(() => 
    Math.max(Math.ceil(totalItems / pageSize), 1),
    [totalItems, pageSize]
  );

  const visiblePages = useMemo(() => 
    calculateVisiblePages(currentPage, totalPages, maxVisiblePages),
    [currentPage, totalPages, maxVisiblePages]
  );

  const startIndex = useMemo(() => 
    (currentPage - 1) * pageSize,
    [currentPage, pageSize]
  );

  const endIndex = useMemo(() => 
    Math.min(startIndex + pageSize, totalItems),
    [startIndex, pageSize, totalItems]
  );

  const isFirstPage = currentPage === MIN_PAGE;
  const isLastPage = currentPage === totalPages;

  // Validate current page when total pages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Page navigation handlers
  const changePage = useCallback((page: number) => {
    if (disabled || page === currentPage) return;

    const validatedPage = Math.max(MIN_PAGE, Math.min(page, totalPages));
    setIsLoading(true);
    setCurrentPage(validatedPage);
    
    const newAnnouncement = `Page ${validatedPage} of ${totalPages}`;
    setAnnouncement(newAnnouncement);
    
    onPageChange?.(validatedPage);
    
    // Reset loading state after a brief delay
    setTimeout(() => setIsLoading(false), DEBOUNCE_DELAY);
  }, [currentPage, totalPages, disabled, onPageChange]);

  // Page size change handler with debouncing
  const changePageSize = useCallback((size: number) => {
    if (disabled) return;

    if (debouncedPageSizeTimer.current) {
      clearTimeout(debouncedPageSizeTimer.current);
    }

    debouncedPageSizeTimer.current = setTimeout(() => {
      setPageSize(size);
      setCurrentPage(MIN_PAGE);
      onPageSizeChange?.(size);
    }, DEBOUNCE_DELAY);
  }, [disabled, onPageSizeChange]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case KEYBOARD_SHORTCUTS.NEXT:
          if (!isLastPage) changePage(currentPage + 1);
          break;
        case KEYBOARD_SHORTCUTS.PREVIOUS:
          if (!isFirstPage) changePage(currentPage - 1);
          break;
        case KEYBOARD_SHORTCUTS.FIRST:
          if (showFirstLast && !isFirstPage) changePage(MIN_PAGE);
          break;
        case KEYBOARD_SHORTCUTS.LAST:
          if (showFirstLast && !isLastPage) changePage(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [disabled, currentPage, totalPages, showFirstLast, isFirstPage, isLastPage, changePage]);

  // Computed state
  const state: PaginationState = {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    visiblePages,
    isFirstPage,
    isLastPage,
    isLoading,
    announcement,
  };

  // Actions object
  const actions = {
    changePage,
    changePageSize,
    goToFirstPage: () => changePage(MIN_PAGE),
    goToLastPage: () => changePage(totalPages),
    goToNextPage: () => changePage(currentPage + 1),
    goToPreviousPage: () => changePage(currentPage - 1),
  };

  return {
    state,
    actions,
  };
};