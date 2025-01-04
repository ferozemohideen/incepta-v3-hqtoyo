// @mui/material v5.14.0
import React from 'react';
import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import CustomCard, { CustomCardProps } from '../components/common/Card';

/**
 * Props interface for the AuthLayout component
 */
export interface AuthLayoutProps {
  /** Content to be rendered inside the layout */
  children: React.ReactNode;
  /** Title displayed above the auth card */
  title: string;
  /** Optional card elevation override */
  elevation?: number;
  /** Optional maximum width for the container */
  maxWidth?: 'xs' | 'sm' | 'md';
}

/**
 * Styled container component with responsive behavior and theme integration
 */
const AuthContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  backgroundImage: theme.palette.mode === 'light'
    ? 'linear-gradient(180deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0) 100%)'
    : 'linear-gradient(180deg, rgba(144, 202, 249, 0.05) 0%, rgba(144, 202, 249, 0) 100%)',
}));

/**
 * AuthLayout component provides a standardized layout for authentication pages
 * with Material Design 3.0 principles and responsive behavior
 * 
 * @example
 * ```tsx
 * <AuthLayout title="Sign In">
 *   <LoginForm />
 * </AuthLayout>
 * ```
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  elevation,
  maxWidth = 'sm'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive values
  const computedElevation = elevation ?? (isMobile ? 1 : isTablet ? 2 : 3);
  const logoSize = {
    width: isMobile ? 140 : isTablet ? 160 : 180,
    height: 'auto'
  };

  return (
    <AuthContainer maxWidth={false}>
      <Container
        maxWidth={maxWidth}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: { xs: 2, sm: 3, md: 4 }
        }}
      >
        {/* Logo */}
        <Box
          component="img"
          src="/assets/logo.svg"
          alt="Incepta Logo"
          sx={{
            ...logoSize,
            mb: 3,
            objectFit: 'contain'
          }}
        />

        {/* Title */}
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{
            mb: 4,
            color: theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightBold,
            fontSize: {
              xs: '1.5rem',
              sm: '1.75rem',
              md: '2rem'
            }
          }}
        >
          {title}
        </Typography>

        {/* Content Card */}
        <CustomCard
          elevation={computedElevation}
          sx={{
            width: '100%',
            maxWidth: {
              xs: '100%',
              sm: '450px',
              md: '500px'
            },
            p: {
              xs: 2,
              sm: 3,
              md: 4
            },
            borderRadius: {
              xs: 1,
              sm: 2
            }
          }}
        >
          {children}
        </CustomCard>

        {/* Footer */}
        <Typography
          variant="caption"
          color="textSecondary"
          align="center"
          sx={{ mt: 3 }}
        >
          © {new Date().getFullYear()} Incepta. All rights reserved.
        </Typography>
      </Container>
    </AuthContainer>
  );
};

export default AuthLayout;