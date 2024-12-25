/**
 * @fileoverview Route constants for the Incepta platform
 * Defines all application routes including public, authenticated, and admin routes
 * Version: 1.0.0
 */

/**
 * Public routes accessible without authentication
 */
export const PUBLIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
} as const;

/**
 * Protected routes requiring user authentication
 * Includes main application features like dashboard, technologies, grants, etc.
 */
export const PROTECTED_ROUTES = {
  // Core dashboard and profile
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  SAVED_ITEMS: '/saved-items',
  ANALYTICS: '/analytics',

  // Technology-related routes
  TECHNOLOGIES: '/technologies',
  TECHNOLOGY_SEARCH: '/technologies/search',
  TECHNOLOGY_DETAILS: '/technologies/:technologyId',

  // Grant-related routes
  GRANTS: '/grants',
  GRANT_DETAILS: '/grants/:grantId',
  GRANT_APPLICATION: '/grants/:grantId/apply',
  GRANT_WRITER: '/grants/:grantId/writer',

  // Messaging system routes
  MESSAGES: '/messages',
  MESSAGE_THREAD: '/messages/:threadId',
} as const;

/**
 * Admin-only routes for platform management
 * Accessible only to users with administrative privileges
 */
export const ADMIN_ROUTES = {
  ADMIN_DASHBOARD: '/admin',
  USER_MANAGEMENT: '/admin/users',
  SYSTEM_SETTINGS: '/admin/settings',
  ANALYTICS_DASHBOARD: '/admin/analytics',
  AUDIT_LOGS: '/admin/audit-logs',
} as const;

/**
 * URL parameter patterns for dynamic route segments
 * Used for route matching and parameter extraction
 */
export const ROUTE_PARAMS = {
  TECHNOLOGY_ID: ':technologyId',
  GRANT_ID: ':grantId',
  THREAD_ID: ':threadId',
  USER_ID: ':userId',
  APPLICATION_ID: ':applicationId',
} as const;

/**
 * Type definitions for route constants to ensure type safety
 */
export type PublicRoutes = typeof PUBLIC_ROUTES;
export type ProtectedRoutes = typeof PROTECTED_ROUTES;
export type AdminRoutes = typeof ADMIN_ROUTES;
export type RouteParams = typeof ROUTE_PARAMS;

/**
 * Combined type for all routes
 */
export type AppRoutes = PublicRoutes & ProtectedRoutes & AdminRoutes;

/**
 * Helper function to check if a route is public
 */
export const isPublicRoute = (route: string): boolean => {
  return Object.values(PUBLIC_ROUTES).includes(route as any);
};

/**
 * Helper function to check if a route is admin-only
 */
export const isAdminRoute = (route: string): boolean => {
  return Object.values(ADMIN_ROUTES).includes(route as any);
};

/**
 * Helper function to build dynamic routes with parameters
 */
export const buildRoute = (route: string, params: Record<string, string>): string => {
  let result = route;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
};