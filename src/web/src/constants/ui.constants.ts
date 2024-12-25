import { BREAKPOINTS } from '../config/theme.config';

/**
 * Core layout dimensions and constraints
 * Following Material Design 3.0 guidelines for consistent spacing and sizing
 */
export const LAYOUT = {
  /** Fixed height for top app bar in pixels */
  APPBAR_HEIGHT: 64,
  /** Fixed height for footer in pixels */
  FOOTER_HEIGHT: 200,
  /** Fixed width for navigation sidebar in pixels */
  SIDEBAR_WIDTH: 240,
  /** Standard content padding in pixels */
  CONTENT_PADDING: 24,
  /** Base grid spacing unit in pixels */
  GRID_SPACING: 8,
  /** Maximum container widths for each breakpoint */
  CONTAINER_MAX_WIDTH: {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
  /** Standard dialog dimensions */
  DIALOG_DIMENSIONS: {
    sm: { width: 400, height: 'auto' },
    md: { width: 600, height: 'auto' },
    lg: { width: 800, height: 'auto' },
  },
} as const;

/**
 * Animation timing constants
 * Following Material Design motion guidelines for natural and consistent animations
 */
export const ANIMATION = {
  /** Duration for simple animations (150ms) */
  DURATION_SHORT: 150,
  /** Duration for complex animations (250ms) */
  DURATION_MEDIUM: 250,
  /** Duration for transitions between views (350ms) */
  DURATION_LONG: 350,
  /** Standard easing curves for animations */
  EASING: {
    /** Standard easing for most animations */
    STANDARD: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    /** Easing for elements entering the screen */
    ACCELERATE: 'cubic-bezier(0.4, 0.0, 1, 1)',
    /** Easing for elements leaving the screen */
    DECELERATE: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
} as const;

/**
 * Z-index constants for proper layering of UI elements
 * Ensures consistent stacking order across the application
 */
export const Z_INDEX = {
  /** Top app bar layer */
  APPBAR: 1100,
  /** Modal dialog layer */
  MODAL: 1300,
  /** Navigation drawer layer */
  DRAWER: 1200,
  /** Tooltip layer */
  TOOLTIP: 1400,
  /** Modal overlay layer */
  OVERLAY: 1250,
  /** Snackbar/toast notification layer */
  SNACKBAR: 1500,
} as const;

/**
 * Responsive breakpoint constants
 * Defines consistent breakpoints for responsive design implementation
 */
export const RESPONSIVE = {
  /** Mobile breakpoint (600px) */
  MOBILE_BREAKPOINT: BREAKPOINTS.sm,
  /** Tablet breakpoint (900px) */
  TABLET_BREAKPOINT: BREAKPOINTS.md,
  /** Desktop breakpoint (1200px) */
  DESKTOP_BREAKPOINT: BREAKPOINTS.lg,
} as const;

/**
 * Spacing constants for consistent component spacing
 * Based on 8px grid system from Material Design
 */
export const SPACING = {
  /** Base spacing unit (8px) */
  UNIT: 8,
  /** Spacing scale multipliers */
  SCALE: {
    /** Extra small spacing (4px) */
    xs: 4,
    /** Small spacing (8px) */
    sm: 8,
    /** Medium spacing (16px) */
    md: 16,
    /** Large spacing (24px) */
    lg: 24,
    /** Extra large spacing (32px) */
    xl: 32,
    /** Double extra large spacing (40px) */
    xxl: 40,
  },
} as const;

/**
 * Elevation constants for consistent shadow depths
 * Following Material Design elevation system
 */
export const ELEVATION = {
  /** Shadow depth levels */
  LEVELS: {
    /** No elevation */
    '0': 'none',
    /** Cards, buttons */
    '1': '0 2px 1px -1px rgba(0,0,0,0.2)',
    /** Floating action buttons, quick entry/search */
    '2': '0 3px 3px -2px rgba(0,0,0,0.2)',
    /** Navigation drawer, right drawer */
    '3': '0 3px 4px -2px rgba(0,0,0,0.2)',
    /** Navigation drawer, right drawer */
    '4': '0 4px 5px -2px rgba(0,0,0,0.2)',
    /** Dialog */
    '8': '0 8px 10px -5px rgba(0,0,0,0.2)',
    /** Modal window */
    '16': '0 16px 24px -12px rgba(0,0,0,0.2)',
  },
} as const;

/**
 * Border radius constants for consistent component shapes
 * Following Material Design shape system
 */
export const BORDER_RADIUS = {
  /** Small components (buttons, chips) */
  SMALL: 4,
  /** Medium components (cards, dialogs) */
  MEDIUM: 8,
  /** Large components (modals, bottom sheets) */
  LARGE: 16,
} as const;