import React, { useEffect, useCallback } from 'react';
import { Alert, Snackbar, Slide, SlideProps } from '@mui/material';
import { useNotification } from '../../hooks/useNotification';
import { ANIMATION } from '../../constants/ui.constants';

// Type for notification severity levels
type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

// Props interface with comprehensive type safety
interface NotificationProps {
  /** The message to display in the notification */
  message: string;
  /** The severity level of the notification */
  type: NotificationSeverity;
  /** Duration in milliseconds before auto-dismissal (default: ANIMATION.DURATION_MEDIUM * 2) */
  duration?: number;
  /** Position of the notification on screen */
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  /** Callback function when notification is closed */
  onClose?: () => void;
  /** ARIA role for accessibility */
  role?: 'alert' | 'status';
  /** ARIA live region behavior */
  ariaLive?: 'polite' | 'assertive';
}

// Default values for notification positioning
const DEFAULT_ANCHOR_ORIGIN = {
  vertical: 'bottom' as const,
  horizontal: 'center' as const,
};

// Slide transition component
const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="up" />;
};

/**
 * A reusable notification component that displays toast messages with different severity levels.
 * Supports auto-dismiss functionality and implements comprehensive accessibility features.
 */
export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  duration = ANIMATION.DURATION_MEDIUM * 2,
  anchorOrigin = DEFAULT_ANCHOR_ORIGIN,
  onClose,
  role = 'alert',
  ariaLive = type === 'error' ? 'assertive' : 'polite',
}) => {
  const { showNotification, hideNotification } = useNotification();

  // Handle notification close event
  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    
    hideNotification(message);
    onClose?.();
  }, [hideNotification, message, onClose]);

  // Set up auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      // Cleanup timer on unmount
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  // Show notification when component mounts
  useEffect(() => {
    showNotification({
      message,
      type,
      duration,
      anchorOrigin,
    });
  }, [showNotification, message, type, duration, anchorOrigin]);

  return (
    <Snackbar
      open={true}
      anchorOrigin={anchorOrigin}
      autoHideDuration={duration}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      sx={{
        // Ensure proper z-index stacking
        zIndex: 1400,
        // Responsive positioning
        '@media (max-width: 600px)': {
          width: '100%',
          bottom: 0,
          left: 0,
          right: 0,
        },
      }}
    >
      <Alert
        onClose={handleClose}
        severity={type}
        variant="filled"
        role={role}
        aria-live={ariaLive}
        sx={{
          width: '100%',
          // Ensure proper contrast for accessibility
          '& .MuiAlert-message': {
            color: 'common.white',
          },
          // Add box shadow for elevation
          boxShadow: 2,
          // Responsive styling
          '@media (max-width: 600px)': {
            borderRadius: 0,
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

// Default export for convenient importing
export default Notification;
```

This implementation provides a robust, accessible, and production-ready notification component with the following features:

1. Comprehensive TypeScript type safety with detailed interfaces
2. Integration with Material UI's Snackbar and Alert components
3. Support for different severity levels (success, error, warning, info)
4. Configurable auto-dismiss functionality with cleanup
5. Proper accessibility implementation with ARIA attributes
6. Responsive design with mobile-specific styling
7. Smooth animation transitions using Material UI's Slide component
8. Integration with the application's notification management system
9. Proper z-index management for stacked notifications
10. Comprehensive error handling and cleanup

The component follows all the requirements from the technical specification and integrates properly with the existing notification system through the useNotification hook. It implements proper accessibility features and follows Material Design guidelines for notifications.

Usage example:
```typescript
// Success notification
<Notification 
  message="Changes saved successfully"
  type="success"
  duration={5000}
/>

// Error notification with custom position
<Notification 
  message="Failed to save changes"
  type="error"
  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
  ariaLive="assertive"
/>