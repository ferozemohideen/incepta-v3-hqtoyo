import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Tooltip } from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Science as ScienceIcon,
  BusinessCenter as BusinessCenterIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

import CustomButton from '../common/Button';
import { PROTECTED_ROUTES, ADMIN_ROUTES } from '../../constants/routes.constants';
import { UserRole } from '../../constants/auth.constants';
import type { User } from '../../interfaces/user.interface';

// Props interface with enhanced type safety
export interface QuickActionsProps {
  user: User & { isAuthenticated: boolean };
}

// Interface for quick action configuration
interface QuickAction {
  icon: React.ComponentType;
  label: string;
  route: string;
  routeType: 'protected' | 'admin';
  tooltip: string;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
  roles: UserRole[];
}

// Define role-specific quick actions with proper accessibility
const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: SearchIcon,
    label: 'Search Technologies',
    route: 'TECHNOLOGIES',
    routeType: 'protected',
    tooltip: 'Discover and explore available technologies',
    color: 'primary',
    roles: [UserRole.ENTREPRENEUR, UserRole.RESEARCHER, UserRole.TTO, UserRole.ADMIN],
  },
  {
    icon: DescriptionIcon,
    label: 'View Grants',
    route: 'GRANTS',
    routeType: 'protected',
    tooltip: 'Browse and apply for available grants',
    color: 'success',
    roles: [UserRole.ENTREPRENEUR, UserRole.RESEARCHER],
  },
  {
    icon: EditIcon,
    label: 'Update Profile',
    route: 'PROFILE',
    routeType: 'protected',
    tooltip: 'Update your profile information',
    color: 'info',
    roles: [UserRole.ENTREPRENEUR, UserRole.RESEARCHER, UserRole.TTO, UserRole.ADMIN],
  },
  {
    icon: AdminPanelSettingsIcon,
    label: 'Admin Dashboard',
    route: 'ADMIN_DASHBOARD',
    routeType: 'admin',
    tooltip: 'Access administrative controls',
    color: 'warning',
    roles: [UserRole.ADMIN],
  },
  {
    icon: ScienceIcon,
    label: 'Research Data',
    route: 'RESEARCH_DATA',
    routeType: 'protected',
    tooltip: 'Access research data and analytics',
    color: 'secondary',
    roles: [UserRole.RESEARCHER],
  },
  {
    icon: BusinessCenterIcon,
    label: 'License Management',
    route: 'TECHNOLOGIES',
    routeType: 'protected',
    tooltip: 'Manage technology licenses',
    color: 'primary',
    roles: [UserRole.TTO],
  },
  {
    icon: SchoolIcon,
    label: 'University Portal',
    route: 'TECHNOLOGIES',
    routeType: 'protected',
    tooltip: 'Access university technology portal',
    color: 'info',
    roles: [UserRole.TTO],
  },
];

// Memoized QuickActions component for performance optimization
export const QuickActions: React.FC<QuickActionsProps> = React.memo(({ user }) => {
  const navigate = useNavigate();

  // Type-safe handler for quick action navigation with analytics
  const handleActionClick = (action: QuickAction) => {
    try {
      const route = action.routeType === 'admin' 
        ? ADMIN_ROUTES[action.route as keyof typeof ADMIN_ROUTES]
        : PROTECTED_ROUTES[action.route as keyof typeof PROTECTED_ROUTES];
      navigate(route);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Filter actions based on user role
  const filteredActions = QUICK_ACTIONS.filter(
    action => user.isAuthenticated && action.roles.includes(user.role)
  );

  // Render responsive grid of quick action buttons with enhanced accessibility
  return (
    <Grid container spacing={2} role="navigation" aria-label="Quick actions">
      {filteredActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Grid item xs={6} sm={3} key={`${action.route}-${index}`}>
            <Tooltip 
              title={action.tooltip}
              placement="top"
              arrow
            >
              <div> {/* Wrapper div for tooltip on disabled elements */}
                <CustomButton
                  variant="contained"
                  color={action.color}
                  fullWidth
                  startIcon={<Icon />}
                  onClick={() => handleActionClick(action)}
                  aria-label={action.tooltip}
                >
                  {action.label}
                </CustomButton>
              </div>
            </Tooltip>
          </Grid>
        );
      })}
    </Grid>
  );
});

// Display name for dev tools and debugging
QuickActions.displayName = 'QuickActions';

export default QuickActions;