import React, { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { inject } from '@vercel/analytics';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Store and hooks
import { store } from './store';
import useAuth from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

// Constants
import { PUBLIC_ROUTES, PROTECTED_ROUTES, ADMIN_ROUTES } from './constants/routes.constants';
import { UserRole } from './constants/auth.constants';

/**
 * Protected route wrapper component with role-based access control
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={PUBLIC_ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={PROTECTED_ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

/**
 * Root application component implementing routing and global providers
 */
const App: React.FC = () => {
  // Theme management
  const { mode: themeMode, isDarkMode } = useTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Initialize analytics
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') {
      inject({
        debug: false,
        trackPageViews: true
      });
    }
  }, []);

  // Memoize current theme to prevent unnecessary re-renders
  const currentTheme = useMemo(() => {
    return isDarkMode || (themeMode === 'system' && prefersDarkMode)
      ? darkTheme
      : lightTheme;
  }, [isDarkMode, themeMode, prefersDarkMode]);

  return (
    <Provider store={store}>
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path={PUBLIC_ROUTES.HOME} element={
              <MainLayout>
                <Navigate to={PROTECTED_ROUTES.DASHBOARD} replace />
              </MainLayout>
            } />
            
            <Route path={PUBLIC_ROUTES.LOGIN} element={
              <AuthLayout title="Sign In">
                {/* Login component will be rendered here */}
                <div />
              </AuthLayout>
            } />

            <Route path={PUBLIC_ROUTES.REGISTER} element={
              <AuthLayout title="Create Account">
                {/* Register component will be rendered here */}
                <div />
              </AuthLayout>
            } />

            {/* Protected Routes */}
            <Route path={PROTECTED_ROUTES.DASHBOARD} element={
              <ProtectedRoute>
                <DashboardLayout>
                  {/* Dashboard component will be rendered here */}
                  <div />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path={PROTECTED_ROUTES.TECHNOLOGIES} element={
              <ProtectedRoute>
                <DashboardLayout>
                  {/* Technologies component will be rendered here */}
                  <div />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path={PROTECTED_ROUTES.GRANTS} element={
              <ProtectedRoute>
                <DashboardLayout>
                  {/* Grants component will be rendered here */}
                  <div />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path={ADMIN_ROUTES.ADMIN_DASHBOARD} element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <DashboardLayout>
                  {/* Admin Dashboard component will be rendered here */}
                  <div />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={
              <MainLayout>
                {/* 404 component will be rendered here */}
                <div />
              </MainLayout>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;