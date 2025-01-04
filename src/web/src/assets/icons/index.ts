/**
 * @fileoverview Central index file for exporting all icon assets used across the application.
 * Follows Material Design 3.0 principles and provides consistent icon usage throughout the UI.
 * @version 1.0.0
 */

// @mui/icons-material v5.14.0
import {
  // Navigation Icons
  Menu,
  Dashboard,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  
  // Action Icons
  Add,
  Edit,
  Delete,
  Save,
  Upload,
  Download,
  Share,
  Favorite,
  FavoriteBorder,
  
  // User Icons
  AccountCircle,
  Person,
  ExitToApp,
  
  // Feature Icons
  Search,
  Notifications,
  Settings,
  Chat,
  Description,
  Visibility,
  VisibilityOff,
  
  // Status Icons
  CheckCircle,
  Error,
  Warning,
  Info,
  
  // Data Icons
  TrendingUp,
  FilterList,
  Sort,
} from '@mui/icons-material';

/**
 * Navigation-related icon components for consistent navigation patterns
 */
const NavigationIcons = {
  Menu,
  Dashboard,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
} as const;

/**
 * Action-related icon components for user interactions and operations
 */
const ActionIcons = {
  Add,
  Edit,
  Delete,
  Save,
  Upload,
  Download,
  Share,
  Favorite,
  FavoriteBorder,
} as const;

/**
 * User-related icon components for profile and authentication features
 */
const UserIcons = {
  AccountCircle,
  Person,
  ExitToApp,
} as const;

/**
 * Feature-specific icon components for core application features
 */
const FeatureIcons = {
  Search,
  Notifications,
  Settings,
  Chat,
  Description,
  Visibility,
  VisibilityOff,
} as const;

/**
 * Status and feedback icon components for user notifications and system states
 */
const StatusIcons = {
  CheckCircle,
  Error,
  Warning,
  Info,
} as const;

/**
 * Data visualization and manipulation icon components for analytics and data presentation
 */
const DataIcons = {
  TrendingUp,
  FilterList,
  Sort,
} as const;

// Type definitions for better TypeScript support
export type NavigationIconType = keyof typeof NavigationIcons;
export type ActionIconType = keyof typeof ActionIcons;
export type UserIconType = keyof typeof UserIcons;
export type FeatureIconType = keyof typeof FeatureIcons;
export type StatusIconType = keyof typeof StatusIcons;
export type DataIconType = keyof typeof DataIcons;

// Export all icon groups
export {
  NavigationIcons,
  ActionIcons,
  UserIcons,
  FeatureIcons,
  StatusIcons,
  DataIcons,
};