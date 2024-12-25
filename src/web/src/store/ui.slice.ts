import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { LAYOUT, ANIMATION, Z_INDEX, RESPONSIVE } from '../constants/ui.constants';

// Type definitions
type ThemeMode = 'light' | 'dark';
type NotificationType = 'success' | 'error' | 'warning' | 'info';
type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop';

interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
}

interface ThemeModePayload {
  mode: ThemeMode;
  systemPreference: boolean;
}

interface NotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number;
}

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: ResponsiveBreakpoint;
  lastViewportWidth: number;
}

// Main UI state interface
interface UIState {
  theme: {
    mode: ThemeMode;
    systemPreference: boolean;
    transitionDuration: number;
  };
  layout: {
    sidebarOpen: boolean;
    sidebarWidth: number;
    contentPadding: number;
    lastViewportWidth: number;
  };
  notification: {
    show: boolean;
    message: string;
    type: NotificationType;
    duration: number;
    queue: NotificationItem[];
  };
  responsive: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    breakpoint: ResponsiveBreakpoint;
  };
}

// Initial state
const initialState: UIState = {
  theme: {
    mode: 'light',
    systemPreference: true,
    transitionDuration: ANIMATION.DURATION_MEDIUM,
  },
  layout: {
    sidebarOpen: true,
    sidebarWidth: LAYOUT.SIDEBAR_WIDTH,
    contentPadding: LAYOUT.CONTENT_PADDING,
    lastViewportWidth: 0,
  },
  notification: {
    show: false,
    message: '',
    type: 'info',
    duration: ANIMATION.DURATION_MEDIUM,
    queue: [],
  },
  responsive: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'desktop',
  },
};

// Create the slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeModePayload>) {
      const { mode, systemPreference } = action.payload;
      state.theme.mode = mode;
      state.theme.systemPreference = systemPreference;
      state.theme.transitionDuration = ANIMATION.DURATION_MEDIUM;
    },

    toggleSidebar(state) {
      state.layout.sidebarOpen = !state.layout.sidebarOpen;
    },

    updateResponsiveState(state, action: PayloadAction<number>) {
      const width = action.payload;
      
      // Only update if viewport width has changed significantly
      if (Math.abs(width - state.layout.lastViewportWidth) > 10) {
        state.layout.lastViewportWidth = width;
        
        // Update responsive flags based on breakpoints
        state.responsive.isMobile = width < RESPONSIVE.MOBILE_BREAKPOINT;
        state.responsive.isTablet = width >= RESPONSIVE.MOBILE_BREAKPOINT && width < RESPONSIVE.DESKTOP_BREAKPOINT;
        state.responsive.isDesktop = width >= RESPONSIVE.DESKTOP_BREAKPOINT;
        
        // Set current breakpoint
        state.responsive.breakpoint = state.responsive.isMobile 
          ? 'mobile' 
          : state.responsive.isTablet 
            ? 'tablet' 
            : 'desktop';

        // Adjust layout for mobile
        if (state.responsive.isMobile) {
          state.layout.sidebarOpen = false;
          state.layout.contentPadding = LAYOUT.GRID_SPACING;
        } else {
          state.layout.contentPadding = LAYOUT.CONTENT_PADDING;
        }
      }
    },

    showNotification(state, action: PayloadAction<NotificationConfig>) {
      const { message, type, duration = ANIMATION.DURATION_MEDIUM * 2 } = action.payload;
      const newNotification: NotificationItem = {
        id: Date.now().toString(),
        message,
        type,
        duration,
      };

      // If already showing a notification, queue it
      if (state.notification.show) {
        state.notification.queue.push(newNotification);
      } else {
        state.notification.show = true;
        state.notification.message = message;
        state.notification.type = type;
        state.notification.duration = duration;
      }
    },

    hideNotification(state) {
      state.notification.show = false;
      state.notification.message = '';
      
      // Show next notification in queue if exists
      if (state.notification.queue.length > 0) {
        const nextNotification = state.notification.queue.shift()!;
        state.notification.show = true;
        state.notification.message = nextNotification.message;
        state.notification.type = nextNotification.type;
        state.notification.duration = nextNotification.duration;
      }
    },

    clearNotifications(state) {
      state.notification.show = false;
      state.notification.message = '';
      state.notification.queue = [];
    },
  },
});

// Export actions and reducer
export const {
  setThemeMode,
  toggleSidebar,
  updateResponsiveState,
  showNotification,
  hideNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;