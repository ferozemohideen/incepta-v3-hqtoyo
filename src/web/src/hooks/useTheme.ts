// @mui/material v5.14.0
import { useEffect, useState, useCallback, useRef } from 'react';
import { useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { COLORS } from 'config/theme.config';
import { getLocalStorageItem, setLocalStorageItem, StorageError } from 'utils/storage.utils';

// Theme mode enumeration for type safety
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

// Theme error interface for structured error handling
export interface ThemeError {
  code: string;
  message: string;
}

// Constants
const THEME_STORAGE_KEY = 'theme-mode' as const;
const STORAGE_ERROR_RETRY_LIMIT = 3;
const THEME_SWITCH_DEBOUNCE_MS = 150;

/**
 * Advanced hook for theme management with error handling, performance optimization,
 * and system preference synchronization
 * @returns Theme management object with mode, toggle function, and status indicators
 */
export const useTheme = () => {
  // State management
  const [mode, setMode] = useState<ThemeMode>(ThemeMode.SYSTEM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ThemeError | null>(null);
  
  // Refs for performance optimization
  const retryCount = useRef(0);
  const debounceTimer = useRef<number>();
  
  // MUI theme context
  const muiTheme = useMuiTheme();
  
  // System preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true
  });

  /**
   * Safely retrieves stored theme preference
   */
  const getStoredTheme = useCallback(async (): Promise<ThemeMode | null> => {
    try {
      const stored = await getLocalStorageItem<ThemeMode>(THEME_STORAGE_KEY);
      return stored && Object.values(ThemeMode).includes(stored) ? stored : null;
    } catch (err) {
      if (retryCount.current < STORAGE_ERROR_RETRY_LIMIT) {
        retryCount.current++;
        return getStoredTheme();
      }
      const storageError = err as StorageError;
      setError({
        code: storageError.code,
        message: 'Failed to retrieve theme preference'
      });
      return null;
    }
  }, []);

  /**
   * Safely stores theme preference with error handling
   */
  const storeTheme = useCallback(async (newMode: ThemeMode): Promise<void> => {
    try {
      await setLocalStorageItem(THEME_STORAGE_KEY, newMode);
      setError(null);
    } catch (err) {
      const storageError = err as StorageError;
      setError({
        code: storageError.code,
        message: 'Failed to save theme preference'
      });
    }
  }, []);

  /**
   * Determines effective theme mode based on current settings
   */
  const getEffectiveTheme = useCallback((): ThemeMode => {
    return mode === ThemeMode.SYSTEM 
      ? prefersDarkMode ? ThemeMode.DARK : ThemeMode.LIGHT
      : mode;
  }, [mode, prefersDarkMode]);

  /**
   * Memoized theme toggle function
   */
  const toggleTheme = useCallback(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      const currentMode = getEffectiveTheme();
      const newMode = currentMode === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT;
      setMode(newMode);
      void storeTheme(newMode);
    }, THEME_SWITCH_DEBOUNCE_MS);
  }, [getEffectiveTheme, storeTheme]);

  // Initialize theme preference
  useEffect(() => {
    const initTheme = async () => {
      const stored = await getStoredTheme();
      if (stored) {
        setMode(stored);
      }
      setIsLoading(false);
    };

    void initTheme();
  }, [getStoredTheme]);

  // Sync with system preference changes
  useEffect(() => {
    if (mode === ThemeMode.SYSTEM) {
      // Use requestAnimationFrame for performance
      const frameId = requestAnimationFrame(() => {
        const root = document.documentElement;
        root.style.setProperty(
          '--primary-color',
          prefersDarkMode ? COLORS.dark.primary.main : COLORS.light.primary.main
        );
        root.style.setProperty(
          '--secondary-color',
          prefersDarkMode ? COLORS.dark.secondary.main : COLORS.light.secondary.main
        );
      });

      return () => cancelAnimationFrame(frameId);
    }
  }, [mode, prefersDarkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    mode: getEffectiveTheme(),
    toggleTheme,
    isDarkMode: getEffectiveTheme() === ThemeMode.DARK,
    isLoading,
    error
  };
};
```

This implementation provides:

1. Type-safe theme mode management with TypeScript enums
2. Robust error handling with structured error reporting
3. Performance optimizations:
   - Debounced theme switching
   - RAF for system preference sync
   - Memoized callbacks
4. System preference detection and synchronization
5. Persistent storage with retry mechanism
6. Clean integration with MUI v5 theme system
7. Proper cleanup of timers and listeners
8. Loading state for initial theme detection
9. CSS variable updates for performance
10. Comprehensive JSDoc documentation

The hook can be used in components like:

```typescript
const { mode, toggleTheme, isDarkMode, isLoading, error } = useTheme();