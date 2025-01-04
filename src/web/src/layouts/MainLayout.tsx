import React, { useState, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// Internal components
import AppBarComponent from '../components/common/AppBar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';

// Constants and hooks
import { LAYOUT } from '../constants/ui.constants';

/**
 * Props interface for MainLayout component
 */
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  disableSidebar?: boolean;
}

/**
 * Styled main container with flex layout and full height
 */
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  position: 'relative',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
}));

/**
 * Styled content container with responsive margins and transitions
 */
const ContentContainer = styled(Box)<{ $sidebarOpen: boolean; $isMobile: boolean }>(({ theme, $sidebarOpen, $isMobile }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: LAYOUT.APPBAR_HEIGHT,
  marginLeft: $isMobile ? 0 : ($sidebarOpen ? LAYOUT.SIDEBAR_WIDTH : 0),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  maxWidth: {
    sm: LAYOUT.CONTAINER_MAX_WIDTH.sm,
    md: LAYOUT.CONTAINER_MAX_WIDTH.md,
    lg: LAYOUT.CONTAINER_MAX_WIDTH.lg,
    xl: LAYOUT.CONTAINER_MAX_WIDTH.xl,
  },
}));

/**
 * MainLayout component implementing core layout structure with Material Design 3.0
 * Provides responsive layout with AppBar, Sidebar, and Footer
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  children,
  className,
  disableSidebar = false,
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile && !disableSidebar);

  /**
   * Handle sidebar toggle with proper state management
   */
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  /**
   * Handle sidebar close for mobile
   */
  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <MainContainer className={className}>
      {/* Skip to main content link for accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          '&:focus': {
            position: 'fixed',
            top: theme.spacing(2),
            left: theme.spacing(2),
            width: 'auto',
            height: 'auto',
            padding: theme.spacing(2),
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            zIndex: theme.zIndex.modal + 1,
            outline: `2px solid ${theme.palette.primary.main}`,
          },
        }}
      >
        Skip to main content
      </Box>

      {/* App Bar */}
      <AppBarComponent
        onMenuClick={handleSidebarToggle}
        elevation={sidebarOpen ? 0 : 4}
      />

      {/* Sidebar */}
      {!disableSidebar && (
        <Sidebar
          open={sidebarOpen}
          onClose={handleSidebarClose}
          variant={isMobile ? 'temporary' : 'permanent'}
          width={LAYOUT.SIDEBAR_WIDTH}
        />
      )}

      {/* Main Content */}
      <ContentContainer
        component="main"
        id="main-content"
        $sidebarOpen={sidebarOpen && !disableSidebar}
        $isMobile={isMobile}
        role="main"
        tabIndex={-1}
      >
        {children}
      </ContentContainer>

      {/* Footer */}
      <Footer />
    </MainContainer>
  );
});

// Display name for debugging
MainLayout.displayName = 'MainLayout';

export default MainLayout;