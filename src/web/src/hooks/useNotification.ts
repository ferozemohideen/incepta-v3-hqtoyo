import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { addNotification, removeNotification } from 'store/ui.slice';
import { ANIMATION } from 'constants/ui.constants';

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
  sx?: Record<string, unknown>;
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

const notificationTimers: Record<string, NodeJS.Timeout> = {};

export const useNotification = (): UseNotificationReturn => {
  const dispatch = useDispatch();

  const showNotification = useCallback((options: NotificationOptions): string => {
    const id = uuidv4();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    if (notificationTimers[id]) {
      clearTimeout(notificationTimers[id]);
      delete notificationTimers[id];
    }

    dispatch(addNotification({
      id,
      message: mergedOptions.message,
      type: mergedOptions.type!,
      duration: mergedOptions.duration!,
      anchorOrigin: mergedOptions.anchorOrigin!,
      sx: {
        ...mergedOptions.sx,
        '& .MuiAlert-message': {
          color: 'text.primary',
        },
        '@media (max-width: 600px)': {
          width: '100%',
          margin: 0,
          borderRadius: 0,
        },
      },
      'aria-label': mergedOptions.ariaLabel || `${mergedOptions.type} notification: ${mergedOptions.message}`,
    }));

    if (mergedOptions.autoHideDuration && mergedOptions.autoHideDuration > 0) {
      const timer = setTimeout(() => {
        hideNotification(id);
      }, mergedOptions.autoHideDuration);

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

  const hideNotification = useCallback((id: string): void => {
    if (notificationTimers[id]) {
      clearTimeout(notificationTimers[id]);
      delete notificationTimers[id];
    }

    setTimeout(() => {
      dispatch(removeNotification(id));
    }, ANIMATION.DURATION_MEDIUM);
  }, [dispatch]);

  const showSuccess = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'success' });
  }, [showNotification]);

  const showError = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'error' });
  }, [showNotification]);

  const showWarning = useCallback((
    message: string,
    options?: Omit<NotificationOptions, 'message' | 'type'>
  ): string => {
    return showNotification({ ...options, message, type: 'warning' });
  }, [showNotification]);

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