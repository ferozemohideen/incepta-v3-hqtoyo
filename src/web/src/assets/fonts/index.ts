/**
 * @fileoverview Font configuration and typography constants following Material Design 3.0
 * @version 1.0.0
 * 
 * This file centralizes all font-related configurations used throughout the application,
 * implementing Material Design 3.0 typography guidelines with comprehensive cross-browser
 * support and performance optimizations.
 */

// @fontsource/roboto v5.0.0 - Primary font for Material Design
import '@fontsource/roboto/300.css'; // Light
import '@fontsource/roboto/400.css'; // Regular
import '@fontsource/roboto/500.css'; // Medium
import '@fontsource/roboto/700.css'; // Bold

// @fontsource/roboto-mono v5.0.0 - Monospace font for technical content
import '@fontsource/roboto-mono/400.css'; // Regular
import '@fontsource/roboto-mono/500.css'; // Medium

/**
 * Primary font stack using Roboto with system fallbacks
 * Ensures optimal cross-browser rendering and performance
 */
export const FONT_FAMILY_PRIMARY = 
  '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

/**
 * Monospace font stack for technical content and code display
 * Provides consistent rendering across platforms
 */
export const FONT_FAMILY_MONO = 
  '"Roboto Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Font weight constants following Material Design specifications
 * Extended with additional weights for enhanced typography control
 */
export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Comprehensive typography scale with additional variants
 * All sizes in rem for better accessibility and scaling
 */
export const FONT_SIZES = {
  h1: '2.5rem',     // 40px
  h2: '2rem',       // 32px
  h3: '1.75rem',    // 28px
  h4: '1.5rem',     // 24px
  h5: '1.25rem',    // 20px
  h6: '1.125rem',   // 18px
  subtitle1: '1rem', // 16px
  subtitle2: '0.875rem', // 14px
  body1: '1rem',    // 16px
  body2: '0.875rem', // 14px
  caption: '0.75rem', // 12px
  button: '0.875rem', // 14px
  overline: '0.625rem', // 10px
  code: '0.875rem',  // 14px
} as const;

/**
 * Line height configurations for optimal readability
 * Values represent multipliers of the font size
 */
export const LINE_HEIGHTS = {
  tight: 1.2,      // Compact spacing for headings
  normal: 1.5,     // Standard body text spacing
  relaxed: 1.75,   // Enhanced readability for longer content
  heading: 1.3,    // Optimized for headings
  code: 1.6,       // Improved readability for code blocks
} as const;