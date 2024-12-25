import React, { memo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  Science,
  AccountTree,
  Description,
  Message,
  Person,
  Settings,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { PROTECTED_ROUTES, ADMIN_ROUTES } from '../../constants/routes.constants';
import useAuth from '../../hooks/useAuth';

// Version: 1.0.0
// MUI Version: ^5.0.0
// React Router Version: ^6.0.0

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  variant?: 'temporary' | 'permanent' | 'persistent';
}

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  children?: NavigationItem[];
  requiresAuth: boolean;
  disabled?: boolean;
}

const Sidebar: React.FC<SidebarProps> = memo(({ 
  open, 
  onClose, 
  width = 280,
  variant = 'permanent'
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Define navigation items with role-based access
  const navigationItems: NavigationItem[] = [
    {
      title: 'Dashboard',
      path: PROTECTED_ROUTES.DASHBOARD,
      icon: <Dashboard />,
      roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
      requiresAuth: true
    },
    {
      title: 'Technologies',
      path: PROTECTED_ROUTES.TECHNOLOGIES,
      icon: <Science />,
      roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
      requiresAuth: true,
      children: [
        {
          title: 'Search',
          path: PROTECTED_ROUTES.TECHNOLOGY_SEARCH,
          icon: <AccountTree />,
          roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
          requiresAuth: true
        }
      ]
    },
    {
      title: 'Grants',
      path: PROTECTED_ROUTES.GRANTS,
      icon: <Description />,
      roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
      requiresAuth: true
    },
    {
      title: 'Messages',
      path: PROTECTED_ROUTES.MESSAGES,
      icon: <Message />,
      roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
      requiresAuth: true
    },
    {
      title: 'Profile',
      path: PROTECTED_ROUTES.PROFILE,
      icon: <Person />,
      roles: ['admin', 'tto', 'entrepreneur', 'researcher'],
      requiresAuth: true
    },
    {
      title: 'Admin Dashboard',
      path: ADMIN_ROUTES.ADMIN_DASHBOARD,
      icon: <Settings />,
      roles: ['admin'],
      requiresAuth: true
    }
  ];

  // Handle navigation with drawer state management
  const handleNavigate = useCallback((path: string, isNested: boolean = false) => {
    if (!isAuthenticated) return;
    
    navigate(path);
    if (isMobile && !isNested) {
      onClose();
    }
  }, [navigate, isMobile, isAuthenticated, onClose]);

  // Toggle nested items
  const handleExpandClick = useCallback((path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(item => item !== path)
        : [...prev, path]
    );
  }, []);

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter(item => 
    (!item.requiresAuth || isAuthenticated) &&
    (user?.role ? item.roles.includes(user.role) : !item.requiresAuth)
  );

  // Determine drawer variant based on screen size
  const effectiveVariant = isMobile ? 'temporary' : variant;

  // Render navigation item
  const renderNavItem = (item: NavigationItem, isNested: boolean = false) => {
    const isSelected = location.pathname === item.path;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.path);

    return (
      <React.Fragment key={item.path}>
        <ListItem
          button
          disabled={item.disabled}
          onClick={() => hasChildren 
            ? handleExpandClick(item.path)
            : handleNavigate(item.path, isNested)
          }
          sx={(theme) => ({
            ...theme.mixins.toolbar,
            ...(!isNested && {
              pl: 2.5,
              pr: 2.5,
            }),
            ...(isNested && {
              pl: 4,
              pr: 2.5,
            }),
            minHeight: 48,
            borderRadius: '8px',
            margin: '4px 8px',
            ...(isSelected && {
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.light,
              },
            }),
          })}
        >
          <Tooltip title={item.title} placement="right">
            <ListItemIcon
              sx={{
                minWidth: 56,
                color: 'inherit',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
          </Tooltip>
          <ListItemText 
            primary={item.title}
            sx={{
              opacity: open ? 1 : 0,
              transition: theme.transitions.create('opacity', {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          />
          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant={effectiveVariant}
      open={open}
      onClose={onClose}
      sx={{
        width: width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: theme => theme.palette.divider,
          overflowX: 'hidden',
          transition: theme.transitions.create(['width', 'box-shadow'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <List
        sx={{
          pt: 2,
          pb: 2,
        }}
      >
        {filteredItems.map(item => renderNavItem(item))}
      </List>
      <Divider />
    </Drawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;