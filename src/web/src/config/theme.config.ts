// @mui/material v5.14.0
import { 
  ThemeOptions, 
  createTheme, 
  responsiveFontSizes 
} from '@mui/material';

// Type definitions
type ThemeMode = 'light' | 'dark';

interface TTOStatusColors {
  grant: {
    pending: string;
    approved: string;
    rejected: string;
  };
  license: {
    available: string;
    pending: string;
    licensed: string;
  };
}

// Breakpoint constants
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

// Font family constant
const FONT_FAMILY = "'Roboto', 'Helvetica', 'Arial', sans-serif";

// Color palette definitions
export const COLORS = {
  light: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    tto: {
      grant: {
        pending: '#ffd700',
        approved: '#4caf50',
        rejected: '#f44336',
      },
      license: {
        available: '#4caf50',
        pending: '#ff9800',
        licensed: '#2196f3',
      },
    } as TTOStatusColors,
  },
  dark: {
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
      contrastText: '#000000',
    },
    success: {
      main: '#66bb6a',
      light: '#e8f5e9',
      dark: '#388e3c',
      contrastText: '#000000',
    },
    error: {
      main: '#f44336',
      light: '#ffebee',
      dark: '#d32f2f',
      contrastText: '#000000',
    },
    warning: {
      main: '#ffa726',
      light: '#fff3e0',
      dark: '#f57c00',
      contrastText: '#000000',
    },
    info: {
      main: '#29b6f6',
      light: '#e1f5fe',
      dark: '#0288d1',
      contrastText: '#000000',
    },
    tto: {
      grant: {
        pending: '#ffd700',
        approved: '#66bb6a',
        rejected: '#ef5350',
      },
      license: {
        available: '#66bb6a',
        pending: '#ffa726',
        licensed: '#29b6f6',
      },
    } as TTOStatusColors,
  },
} as const;

// Typography scale definitions
export const TYPOGRAPHY = {
  h1: {
    fontSize: '2.5rem',
    fontWeight: 500,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
} as const;

// Shadow definitions
const SHADOWS = {
  sm: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
  md: '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
  lg: '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
} as const;

// Z-index scale
const Z_INDEX = {
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
} as const;

/**
 * Creates a configured MUI theme instance with all custom settings
 * @param mode - Theme mode ('light' | 'dark')
 * @returns Configured MUI theme instance
 */
export const createAppTheme = (mode: ThemeMode) => {
  // Create base theme options
  const themeOptions: ThemeOptions = {
    // Configure breakpoints
    breakpoints: {
      values: BREAKPOINTS,
    },
    
    // Set color palette based on mode
    palette: {
      mode,
      ...COLORS[mode],
    },
    
    // Configure typography
    typography: {
      fontFamily: FONT_FAMILY,
      ...TYPOGRAPHY,
    },
    
    // Configure component defaults for accessibility
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
    },
    
    // Configure spacing
    spacing: (factor: number) => `${0.25 * factor}rem`,
    
    // Configure shadows with exactly 25 elements
    shadows: [
      'none',
      SHADOWS.sm,
      SHADOWS.md,
      SHADOWS.lg,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
      SHADOWS.md,
    ],
    
    // Configure z-index
    zIndex: Z_INDEX,
  };

  // Create theme instance with responsive typography
  return responsiveFontSizes(createTheme(themeOptions));
};