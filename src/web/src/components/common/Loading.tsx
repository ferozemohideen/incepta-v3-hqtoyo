// @mui/material v5.14.0
import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { lightTheme } from '../../styles/theme';

/**
 * Props interface for the Loading component
 */
interface LoadingProps {
  /**
   * Size of the loading spinner
   * - small: 24px
   * - medium: 40px (default)
   * - large: 56px
   * - or custom number in pixels
   */
  size?: number | 'small' | 'medium' | 'large';
  
  /**
   * Color of the loading spinner
   * Defaults to primary.main from theme
   */
  color?: string;
  
  /**
   * Whether to display the loader in fullscreen mode
   * Centers the spinner vertically and horizontally
   */
  fullscreen?: boolean;
}

/**
 * Styled container component for centering the loading spinner
 * Handles both fullscreen and inline positioning
 */
const LoadingContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullscreen',
})<{ fullscreen?: boolean }>(({ fullscreen }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  height: fullscreen ? '100vh' : '100%',
  position: 'relative',
  overflow: 'hidden',
}));

/**
 * Maps string size values to pixel dimensions
 */
const sizeMap = {
  small: 24,
  medium: 40,
  large: 56,
};

/**
 * A reusable loading component that displays a Material Design circular progress indicator
 * Implements WCAG 2.1 Level AA compliant animations and follows Material Design 3.0 principles
 */
const Loading = React.memo(({ 
  size = 'medium',
  color = lightTheme.palette.primary.main,
  fullscreen = false,
}: LoadingProps) => {
  // Convert string size to number if needed
  const spinnerSize = typeof size === 'string' ? sizeMap[size] : size;

  return (
    <LoadingContainer 
      fullscreen={fullscreen}
      role="progressbar"
      aria-label="Loading content"
      aria-busy="true"
    >
      <CircularProgress
        size={spinnerSize}
        sx={{
          color: color,
          // Ensure animation timing follows Material Design guidelines
          animation: 'circular-rotate 1.4s linear infinite',
          // Improve animation performance
          willChange: 'transform',
        }}
        // Disable thickness animation for better performance
        disableShrink
      />
    </LoadingContainer>
  );
});

// Display name for debugging
Loading.displayName = 'Loading';

export default Loading;