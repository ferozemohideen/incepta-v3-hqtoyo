// @mui/material v5.14.0
import { createTheme, ThemeOptions, Theme } from '@mui/material';
import { BREAKPOINTS, COLORS } from '../config/theme.config';

// Extend the Palette and PaletteOptions interfaces
declare module '@mui/material/styles' {
  interface Palette {
    tto: typeof COLORS['light']['tto']
  }
  interface PaletteOptions {
    tto?: typeof COLORS['light']['tto']
  }
}

// Extend the Components interface for custom variants
declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    'tto-status': true;
  }
}

/**
 * Creates base theme configuration with shared settings between light/dark modes
 * Implements WCAG 2.1 Level AA compliance and TTO-specific customizations
 */
const createBaseTheme = (): ThemeOptions => ({
  // Typography system with enhanced readability
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.0075em',
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.75,
      letterSpacing: '0.00938em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.02857em',
      textTransform: 'none', // Enhanced accessibility
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },

  // Responsive breakpoints
  breakpoints: {
    values: BREAKPOINTS,
  },

  // 8px-based spacing system
  spacing: (factor: number) => `${0.5 * factor}rem`,

  // Shape customization
  shape: {
    borderRadius: 4,
  },

  // Optimized transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // Component customizations
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '4px',
          fontWeight: 500,
          padding: '6px 16px',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          overflow: 'hidden',
        },
      },
    },
    // TTO-specific component customizations
    MuiChip: {
      variants: [
        {
          props: { variant: 'tto-status' },
          style: {
            borderRadius: '16px',
            height: '24px',
            fontSize: '0.75rem',
          },
        },
      ],
    },
  },
});

/**
 * Creates light mode theme with TTO-specific customizations
 * Ensures WCAG 2.1 Level AA compliance for contrast ratios
 */
const createLightTheme = (): Theme => {
  const baseTheme = createBaseTheme();
  return createTheme({
    ...baseTheme,
    palette: {
      mode: 'light',
      primary: COLORS.light.primary,
      secondary: COLORS.light.secondary,
      success: {
        main: COLORS.light.success.main,
        light: COLORS.light.success.light,
        dark: COLORS.light.success.dark,
        contrastText: COLORS.light.success.contrastText,
      },
      error: {
        main: COLORS.light.error.main,
        light: COLORS.light.error.light,
        dark: COLORS.light.error.dark,
        contrastText: COLORS.light.error.contrastText,
      },
      warning: {
        main: COLORS.light.warning.main,
        light: COLORS.light.warning.light,
        dark: COLORS.light.warning.dark,
        contrastText: COLORS.light.warning.contrastText,
      },
      info: {
        main: COLORS.light.info.main,
        light: COLORS.light.info.light,
        dark: COLORS.light.info.dark,
        contrastText: COLORS.light.info.contrastText,
      },
      background: {
        default: '#ffffff',
        paper: '#ffffff',
      },
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
        disabled: 'rgba(0, 0, 0, 0.38)',
      },
      // TTO-specific semantic colors
      tto: COLORS.light.tto,
    },
  });
};

/**
 * Creates dark mode theme with TTO-specific customizations
 * Ensures WCAG 2.1 Level AA compliance for contrast ratios
 */
const createDarkTheme = (): Theme => {
  const baseTheme = createBaseTheme();
  return createTheme({
    ...baseTheme,
    palette: {
      mode: 'dark',
      primary: COLORS.dark.primary,
      secondary: COLORS.dark.secondary,
      success: {
        main: COLORS.dark.success.main,
        light: COLORS.dark.success.light,
        dark: COLORS.dark.success.dark,
        contrastText: COLORS.dark.success.contrastText,
      },
      error: {
        main: COLORS.dark.error.main,
        light: COLORS.dark.error.light,
        dark: COLORS.dark.error.dark,
        contrastText: COLORS.dark.error.contrastText,
      },
      warning: {
        main: COLORS.dark.warning.main,
        light: COLORS.dark.warning.light,
        dark: COLORS.dark.warning.dark,
        contrastText: COLORS.dark.warning.contrastText,
      },
      info: {
        main: COLORS.dark.info.main,
        light: COLORS.dark.info.light,
        dark: COLORS.dark.info.dark,
        contrastText: COLORS.dark.info.contrastText,
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.5)',
      },
      // TTO-specific semantic colors
      tto: COLORS.dark.tto,
    },
  });
};

// Export theme instances
export const lightTheme = createLightTheme();
export const darkTheme = createDarkTheme();