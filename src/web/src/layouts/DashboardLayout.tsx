import React, { useState, useCallback, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  useTheme, 
  useMediaQuery, 
  CircularProgress,
  styled 
} from '@mui/material';

import AppBarComponent from '../components/common/AppBar';
import Sidebar from '../components/common/Sidebar';
import useAuth from '../hooks/useAuth';
import { LAYOUT, ANIMATION } from '../constants/ui.constants';

// Interface for component props
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Styled component for main content area with responsive behavior
const DashboardContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: ANIMATION.DURATION_MEDIUM,
  }),
  marginLeft: {
    xs: 0,
    sm: `${LAYOUT.SIDEBAR_WIDTH}px`,
  },
  [theme.breakpoints.up('sm')]: {
    marginLeft: `${LAYOUT.SIDEBAR_WIDTH}px`,
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    padding: theme.spacing(2),
  },
}));

/**
 * Enhanced dashboard layout component with authentication protection and responsive optimization
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className }) => {
  const theme = useTheme();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Handle sidebar toggle with responsive behavior
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Update sidebar state on screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Box 
      sx={{ 
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme => theme.palette.background.default,
      }}
    >
      {/* Top Navigation Bar */}
      <AppBarComponent 
        onMenuClick={handleSidebarToggle}
      />

      {/* Side Navigation */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'permanent'}
        width={LAYOUT.SIDEBAR_WIDTH}
      />

      {/* Main Content Area */}
      <DashboardContent className={className}>
        <Container 
          maxWidth="xl"
          sx={{ 
            flexGrow: 1,
            py: { xs: 2, sm: 3 },
            px: { xs: 1, sm: 2, md: 3 },
          }}
        >
          {children}
        </Container>
      </DashboardContent>
    </Box>
  );
};

export default DashboardLayout;