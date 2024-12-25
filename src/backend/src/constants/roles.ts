/**
 * @fileoverview Role-based access control (RBAC) constants for the Incepta platform.
 * Defines user roles and their associated permissions with strict type safety and immutability.
 * @version 1.0.0
 */

/**
 * Enum representing available user roles in the system.
 * Used for type-safe role assignments and permission checks.
 */
export enum UserRole {
  ADMIN = 'admin',
  TTO = 'tto',
  ENTREPRENEUR = 'entrepreneur',
  RESEARCHER = 'researcher',
  GUEST = 'guest'
}

/**
 * Type representing all possible permissions in the system.
 * Used to ensure type safety when defining role permissions.
 */
export type Permission = 
  // Admin permissions
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'MANAGE_SYSTEM'
  | 'VIEW_ALL_ANALYTICS'
  | 'MANAGE_ALL_TECHNOLOGIES'
  | 'MANAGE_ALL_GRANTS'
  | 'MANAGE_ALL_MESSAGES'
  | 'ACCESS_ADMIN_DASHBOARD'
  | 'CONFIGURE_SYSTEM_SETTINGS'
  | 'AUDIT_SYSTEM_LOGS'
  
  // TTO permissions
  | 'VIEW_TTO_DASHBOARD'
  | 'MANAGE_OWN_TECHNOLOGIES'
  | 'MANAGE_LICENSING_AGREEMENTS'
  | 'VIEW_TTO_ANALYTICS'
  | 'MANAGE_TTO_MESSAGES'
  | 'EXPORT_TTO_REPORTS'
  | 'UPDATE_TECHNOLOGY_STATUS'
  | 'REVIEW_LICENSING_REQUESTS'
  | 'MANAGE_DOCUMENT_TEMPLATES'
  | 'VIEW_ENTREPRENEUR_PROFILES'
  
  // Entrepreneur permissions
  | 'VIEW_ENTREPRENEUR_DASHBOARD'
  | 'SEARCH_TECHNOLOGIES'
  | 'SUBMIT_GRANT_APPLICATIONS'
  | 'MANAGE_OWN_MESSAGES'
  | 'UPDATE_OWN_PROFILE'
  | 'SAVE_TECHNOLOGIES'
  | 'REQUEST_TECHNOLOGY_INFO'
  | 'ACCESS_GRANT_TOOLS'
  | 'VIEW_PUBLIC_ANALYTICS'
  | 'SCHEDULE_TTO_MEETINGS'
  
  // Researcher permissions
  | 'VIEW_RESEARCHER_DASHBOARD'
  | 'UPDATE_RESEARCH_DATA'
  | 'MANAGE_RESEARCH_PROFILE'
  | 'VIEW_RESEARCH_ANALYTICS'
  | 'SUBMIT_TECHNOLOGY_UPDATES'
  | 'MANAGE_RESEARCH_DOCUMENTS'
  | 'VIEW_COLLABORATION_OPPORTUNITIES'
  | 'ACCESS_RESEARCH_TOOLS'
  | 'MANAGE_RESEARCH_TEAM'
  | 'VIEW_GRANT_OPPORTUNITIES'
  
  // Guest permissions
  | 'VIEW_PUBLIC_TECHNOLOGIES'
  | 'VIEW_PUBLIC_GRANTS'
  | 'CREATE_ACCOUNT'
  | 'VIEW_PUBLIC_PROFILES'
  | 'ACCESS_PUBLIC_DOCUMENTS'
  | 'SEARCH_PUBLIC_LISTINGS'
  | 'VIEW_SUCCESS_STORIES'
  | 'ACCESS_HELP_CENTER'
  | 'VIEW_PLATFORM_STATISTICS'
  | 'CONTACT_SUPPORT';

/**
 * Immutable mapping of roles to their associated permissions.
 * Each role has a strictly typed array of permissions that cannot be modified at runtime.
 */
export const RolePermissions: Readonly<Record<UserRole, readonly Permission[]>> = {
  [UserRole.ADMIN]: [
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'MANAGE_SYSTEM',
    'VIEW_ALL_ANALYTICS',
    'MANAGE_ALL_TECHNOLOGIES',
    'MANAGE_ALL_GRANTS',
    'MANAGE_ALL_MESSAGES',
    'ACCESS_ADMIN_DASHBOARD',
    'CONFIGURE_SYSTEM_SETTINGS',
    'AUDIT_SYSTEM_LOGS'
  ],

  [UserRole.TTO]: [
    'VIEW_TTO_DASHBOARD',
    'MANAGE_OWN_TECHNOLOGIES',
    'MANAGE_LICENSING_AGREEMENTS',
    'VIEW_TTO_ANALYTICS',
    'MANAGE_TTO_MESSAGES',
    'EXPORT_TTO_REPORTS',
    'UPDATE_TECHNOLOGY_STATUS',
    'REVIEW_LICENSING_REQUESTS',
    'MANAGE_DOCUMENT_TEMPLATES',
    'VIEW_ENTREPRENEUR_PROFILES'
  ],

  [UserRole.ENTREPRENEUR]: [
    'VIEW_ENTREPRENEUR_DASHBOARD',
    'SEARCH_TECHNOLOGIES',
    'SUBMIT_GRANT_APPLICATIONS',
    'MANAGE_OWN_MESSAGES',
    'UPDATE_OWN_PROFILE',
    'SAVE_TECHNOLOGIES',
    'REQUEST_TECHNOLOGY_INFO',
    'ACCESS_GRANT_TOOLS',
    'VIEW_PUBLIC_ANALYTICS',
    'SCHEDULE_TTO_MEETINGS'
  ],

  [UserRole.RESEARCHER]: [
    'VIEW_RESEARCHER_DASHBOARD',
    'UPDATE_RESEARCH_DATA',
    'MANAGE_RESEARCH_PROFILE',
    'VIEW_RESEARCH_ANALYTICS',
    'SUBMIT_TECHNOLOGY_UPDATES',
    'MANAGE_RESEARCH_DOCUMENTS',
    'VIEW_COLLABORATION_OPPORTUNITIES',
    'ACCESS_RESEARCH_TOOLS',
    'MANAGE_RESEARCH_TEAM',
    'VIEW_GRANT_OPPORTUNITIES'
  ],

  [UserRole.GUEST]: [
    'VIEW_PUBLIC_TECHNOLOGIES',
    'VIEW_PUBLIC_GRANTS',
    'CREATE_ACCOUNT',
    'VIEW_PUBLIC_PROFILES',
    'ACCESS_PUBLIC_DOCUMENTS',
    'SEARCH_PUBLIC_LISTINGS',
    'VIEW_SUCCESS_STORIES',
    'ACCESS_HELP_CENTER',
    'VIEW_PLATFORM_STATISTICS',
    'CONTACT_SUPPORT'
  ]
} as const;

/**
 * Helper type to extract all possible permissions from the RolePermissions constant.
 * Used for type checking when working with permissions.
 */
export type AvailablePermissions = typeof RolePermissions[UserRole][number];

/**
 * Helper function to check if a role has a specific permission.
 * @param role The user role to check
 * @param permission The permission to verify
 * @returns boolean indicating if the role has the permission
 */
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return RolePermissions[role].includes(permission);
};

/**
 * Helper function to get all permissions for a given role.
 * @param role The user role to get permissions for
 * @returns An immutable array of permissions for the role
 */
export const getPermissionsForRole = (role: UserRole): readonly Permission[] => {
  return RolePermissions[role];
};