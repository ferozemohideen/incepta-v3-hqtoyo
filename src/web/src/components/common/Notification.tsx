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
  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
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
    return undefined;
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