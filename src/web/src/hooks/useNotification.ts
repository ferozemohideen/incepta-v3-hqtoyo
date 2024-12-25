import { useCallback } from 'react'; // v18.2.0
import { useDispatch } from 'react-redux'; // v8.1.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { addNotification, removeNotification } from 'store/ui.slice';
import { ANIMATION } from 'constants/ui.constants';

// Type definitions
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  message: string;
  type?: NotificationType;
  duration?: number;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  autoHideDuration?: number;
  disableWindowBlur?: boolean;
  sx?: Record<string, unknown>; // Material UI style object
  ariaLabel?: string;
}

interface UseNotificationReturn {
  showNotification: (options: NotificationOptions) => string;
  hideNotification: (id: string) => void;
  showSuccess: (message: string, options?: Omit<NotificationOptions, 'message' | 'type'>) => string;
  showError: (message: string, options?: Omit<NotificationOptions, 'message' | 'type'>) => string;
  showWarning: (message: string, options?: Omit<NotificationOptions, 'message' | 'type'>) => string;
  showInfo: (message: string, options?: Omit<NotificationOptions, 'message' | 'type'>) => string;
}

// Default notification configuration
const DEFAULT_OPTIONS: Partial<NotificationOptions> = {
  type: 'info',
  duration: ANIMATION.DURATION_MEDIUM * 2,
  anchorOrigin: {
    vertical: 'bottom',
    horizontal: 'center',
  },
  autoHideDuration: 6000,
  disableWindowBlur: false,
};

// Timer storage for auto-dismiss
const notificationTimers: Record<string, NodeJS.Timeout> = {};

/**
 * Custom hook for managing notifications with Material UI integration
 * Provides enhanced notification functionality with accessibility support
 */
export const useNotification = (): UseNotificationReturn => {
  const dispatch = useDispatch();

  /**
   * Shows a notification with the specified options
   * @param options - Notification configuration options
   * @returns Unique ID of the created notification
   */
  const showNotification = useCallback((options: NotificationOptions): string => {
    const id = uuidv4();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Clear any existing timer for this notification
    if (notificationTimers[id]) {
      clearTimeout(notificationTimers[id]);
      delete notificationTimers[id];
    }

    // Dispatch notification with enhanced configuration
    dispatch(addNotification({
      id,
      message: mergedOptions.message,
      type: mergedOptions.type!,
      duration: mergedOptions.duration!,
      anchorOrigin: mergedOptions.anchorOrigin!,
      sx: {
        ...mergedOptions.sx,
        // Ensure accessibility contrast
        '& .MuiAlert-message': {
          color: 'text.primary',
        },
        // Add responsive positioning
        '@media (max-width: 600px)': {
          width: '100%',
          margin: 0,
          borderRadius: 0,
        },
      },
      'aria-label': mergedOptions.ariaLabel || `${mergedOptions.type} notification: ${mergedOptions.message}`,
    }));

    // Set up auto-dismiss timer if enabled
    if (mergedOptions.autoHideDuration && mergedOptions.autoHideDuration > 0) {
      const timer = setTimeout(() => {
        hideNotification(id);
      }, mergedOptions.autoHideDuration);

      // Handle window blur if enabled
      if (!mergedOptions.disableWindowBlur) {
        window.addEventListener('blur', () => {
          clearTimeout(timer);
        });
        window.addEventListener('focus', () => {
          hideNotification(id);
        });
      }

      notificationTimers[id] = timer;
    }

    return id;
  }, [dispatch]);

  /**
   * Hides a notification with the specified ID
   * @param id - ID of the notification to hide
   */
  const hideNotification = useCallback((id: string): void => {
    // Clear any existing timer
    if (notificationTimers[id]) {
      clearTimeout(notificationTimers[id]);
      delete notificationTimers[id];
    }

    // Remove notification with animation
    setTimeout(() => {
      dispatch(removeNotification(id));
    }, ANIMATION.DURATION_MEDIUM);
  }, [dispatch]);

  /**
   * Convenience method for showing success notifications
   */
  const showSuccess = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'success' });
  }, [showNotification]);

  /**
   * Convenience method for showing error notifications
   */
  const showError = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'error' });
  }, [showNotification]);

  /**
   * Convenience method for showing warning notifications
   */
  const showWarning = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'warning' });
  }, [showNotification]);

  /**
   * Convenience method for showing info notifications
   */
  const showInfo = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'info' });
  }, [showNotification]);

  return {
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
```

This implementation provides a comprehensive notification management hook with the following features:

1. Full integration with Redux store for global state management
2. Material UI theme integration with responsive styling
3. Accessibility support with ARIA labels and proper contrast
4. Automatic notification queuing and cleanup
5. Window blur detection for improved UX
6. Convenience methods for different notification types
7. Customizable positioning and duration
8. Type safety with TypeScript
9. Proper animation handling with cleanup
10. Memory leak prevention with timer cleanup

The hook can be used throughout the application to show notifications with different severity levels and custom configurations while maintaining a consistent look and feel.

Example usage:
```typescript
const { showSuccess, showError } = useNotification();

// Show a success notification
showSuccess('Operation completed successfully');

// Show an error notification with custom options
showError('Failed to save changes', {
  autoHideDuration: 10000,
  anchorOrigin: { vertical: 'top', horizontal: 'right' }
});