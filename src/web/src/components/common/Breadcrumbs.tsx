/**
 * Enhanced Breadcrumb Navigation Component
 * Version: 1.0.0
 * 
 * Implements Material Design 3.0 breadcrumb navigation with:
 * - Role-based visibility
 * - Enhanced accessibility
 * - Performance optimizations
 * - Dynamic route handling
 */

import React, { useMemo } from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, styled } from '@mui/material'; // ^5.0.0
import { useLocation, Link as RouterLink } from 'react-router-dom'; // ^6.0.0
import { PROTECTED_ROUTES, ROUTE_PARAMS } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props interface for the Breadcrumbs component
 */
interface BreadcrumbsProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional custom labels for route segments */
  customLabels?: Record<string, string>;
  /** Optional flag to disable route caching */
  disableCache?: boolean;
}

/**
 * Interface for breadcrumb navigation items
 */
interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Navigation path */
  path: string;
  /** Flag indicating if this is the last item */
  isLast: boolean;
  /** Required roles for visibility */
  requiredRoles?: string[];
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * Styled MUI Breadcrumbs component with enhanced styling
 */
const StyledBreadcrumbs = styled(MuiBreadcrumbs)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  '& .MuiBreadcrumbs-separator': {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  '& .MuiBreadcrumbs-li': {
    display: 'flex',
    alignItems: 'center',
  }
}));

/**
 * Generates breadcrumb items from current path with role-based visibility
 * @param pathname - Current route path
 * @param customLabels - Optional custom labels for routes
 * @returns Array of breadcrumb items
 */
const generateBreadcrumbs = (
  pathname: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] => {
  // Handle root path
  if (pathname === '/') {
    return [{
      label: 'Home',
      path: '/',
      isLast: true,
      ariaLabel: 'Navigate to home page'
    }];
  }

  // Split path into segments and build breadcrumbs
  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  return segments.map((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Handle dynamic route parameters
    let label = segment;
    Object.entries(ROUTE_PARAMS).forEach(([key, param]) => {
      if (segment.includes(param)) {
        label = customLabels?.[segment] || key.toLowerCase().replace('_', ' ');
      }
    });

    // Convert path segment to readable label
    if (!label.includes(':')) {
      label = customLabels?.[segment] || 
        segment.charAt(0).toUpperCase() + 
        segment.slice(1).toLowerCase().replace(/-/g, ' ');
    }

    // Determine required roles based on route
    const requiredRoles = Object.entries(PROTECTED_ROUTES).find(
      ([_, path]) => path === currentPath
    )?.[0]?.split('_')[0]?.toLowerCase();

    return {
      label,
      path: currentPath,
      isLast,
      requiredRoles: requiredRoles ? [requiredRoles] : undefined,
      ariaLabel: `Navigate to ${label} page`
    };
  });
};

/**
 * Enhanced breadcrumb navigation component with role-based visibility
 * and accessibility features
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className,
  customLabels,
  disableCache = false
}) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  // Generate breadcrumbs with caching
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname, customLabels),
    [location.pathname, customLabels, disableCache]
  );

  // Filter breadcrumbs based on user roles and permissions
  const visibleBreadcrumbs = breadcrumbs.filter(item => {
    if (!item.requiredRoles) return true;
    return item.requiredRoles.some(role => hasPermission(role));
  });

  // Don't render if only home breadcrumb is visible
  if (visibleBreadcrumbs.length <= 1) return null;

  return (
    <StyledBreadcrumbs
      className={className}
      aria-label="Navigation breadcrumbs"
      component="nav"
    >
      {visibleBreadcrumbs.map((item, index) => {
        const isLast = index === visibleBreadcrumbs.length - 1;

        return isLast ? (
          <Typography
            key={item.path}
            color="text.primary"
            aria-current="page"
            variant="body2"
          >
            {item.label}
          </Typography>
        ) : (
          <Link
            key={item.path}
            component={RouterLink}
            to={item.path}
            color="inherit"
            variant="body2"
            aria-label={item.ariaLabel}
            underline="hover"
          >
            {item.label}
          </Link>
        );
      })}
    </StyledBreadcrumbs>
  );
};

export default Breadcrumbs;