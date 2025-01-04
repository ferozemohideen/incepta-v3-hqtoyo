import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, useTheme, useMediaQuery, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import AppBarComponent from './AppBar';
import Sidebar from './Sidebar';
import Footer from './Footer';

// Version: ^5.0.0 @mui/material
// Version: ^18.0.0 react

/**
 * Props interface for the Layout component with accessibility props
 */
interface LayoutProps {
  children: React.ReactNode;
  role?: string;
  'aria-label'?: string;
}

/**
 * Styled component for main content area with performance optimizations
 */
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  contain: 'layout style paint',
  transform: 'translate3d(0,0,0)',
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginTop: 64, // AppBar height
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

/**
 * Main layout component implementing Material Design 3.0 principles
 * with responsive behavior and accessibility support
 */
const Layout: React.FC<LayoutProps> = React.memo(({
  children,
  role = 'main',
  'aria-label': ariaLabel = 'Main content'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle responsive sidebar behavior
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  /**
   * Memoized handler for sidebar toggle with animation support
   */
  const handleSidebarToggle = useCallback(() => {
    setIsAnimating(true);
    setSidebarOpen(prev => !prev);
    
    // Reset animation flag after transition
    setTimeout(() => {
      setIsAnimating(false);
    }, theme.transitions.duration.leavingScreen);
  }, [theme.transitions.duration.leavingScreen]);

  /**
   * Calculate content margin based on sidebar state and screen size
   */
  const getContentMargin = useCallback(() => {
    if (isMobile) return 0;
    if (isTablet) return sidebarOpen ? 240 : 73; // Sidebar width or mini variant
    return sidebarOpen ? 240 : 0; // Full sidebar width or closed
  }, [isMobile, isTablet, sidebarOpen]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* App Bar */}
      <AppBarComponent
        onMenuClick={handleSidebarToggle}
      />

      {/* Sidebar with responsive behavior */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'permanent'}
        width={240}
      />

      {/* Main content area with smooth transitions */}
      <Fade in={!isAnimating} timeout={theme.transitions.duration.enteringScreen}>
        <MainContent
          component="main"
          role={role}
          aria-label={ariaLabel}
          sx={{
            marginLeft: getContentMargin(),
            width: `calc(100% - ${getContentMargin()}px)`,
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          {/* Content container with responsive padding */}
          <Container
            maxWidth="xl"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              py: { xs: 2, sm: 3 },
            }}
          >
            {children}
          </Container>

          {/* Footer */}
          <Footer />
        </MainContent>
      </Fade>
    </Box>
  );
});

// Display name for debugging
Layout.displayName = 'Layout';

export default Layout;