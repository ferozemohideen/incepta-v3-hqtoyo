import React from 'react';
import { Button, ButtonProps, CircularProgress, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { COLORS } from '../../config/theme.config';

// Extended button props interface with enhanced accessibility and customization options
export interface CustomButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained' | 'tto';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'tto';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  tooltipText?: string;
}

// Styled button component with Material Design 3.0 implementation
const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => 
    !['isLoading', 'hasStartIcon', 'hasEndIcon'].includes(prop as string),
})<{
  isLoading?: boolean;
  hasStartIcon?: boolean;
  hasEndIcon?: boolean;
}>(({ theme, variant: variantProp, size, isLoading, hasStartIcon, hasEndIcon }) => ({
  // Base styles following Material Design 3.0
  position: 'relative',
  minWidth: '64px',
  fontWeight: 500,
  textTransform: 'none',
  transition: theme.transitions.create(
    ['background-color', 'box-shadow', 'border-color', 'color'],
    { duration: theme.transitions.duration.short }
  ),

  // Size-specific styles with proper touch targets
  ...(size === 'small' && {
    padding: '6px 16px',
    fontSize: '0.8125rem',
    minHeight: '32px',
  }),
  ...(size === 'medium' && {
    padding: '8px 22px',
    fontSize: '0.875rem',
    minHeight: '40px',
  }),
  ...(size === 'large' && {
    padding: '10px 26px',
    fontSize: '0.9375rem',
    minHeight: '48px',
  }),

  // Variant-specific styles
  ...(variantProp === 'tto' && {
    backgroundColor: COLORS.light.tto.license.available,
    color: '#fff',
    '&:hover': {
      backgroundColor: COLORS.light.tto.license.pending,
    },
  }),

  // Loading state styles
  ...(isLoading && {
    color: 'transparent',
    pointerEvents: 'none',
    '& .MuiCircularProgress-root': {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginTop: '-12px',
      marginLeft: '-12px',
    },
  }),

  // Icon spacing
  ...(hasStartIcon && {
    '& .MuiButton-startIcon': {
      marginRight: theme.spacing(1),
    },
  }),
  ...(hasEndIcon && {
    '& .MuiButton-endIcon': {
      marginLeft: theme.spacing(1),
    },
  }),

  // Focus visible styles for accessibility
  '&.Mui-focusVisible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Disabled state styles
  '&.Mui-disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    '&:focus': {
      outline: '2px solid ButtonText',
    },
  },
}));

// Main button component with comprehensive functionality and accessibility
export const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  (
    {
      children,
      loading = false,
      disabled = false,
      size = 'medium',
      variant = 'contained',
      color = 'primary',
      startIcon,
      endIcon,
      fullWidth = false,
      ariaLabel,
      tooltipText,
      onClick,
      ...props
    },
    ref
  ) => {
    // Handle keyboard interaction
    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event as any);
      }
    };

    const buttonVariant = variant === 'tto' ? 'contained' : variant;
    const buttonColor = color === 'tto' ? 'primary' : color;

    // Render button with proper accessibility attributes
    const button = (
      <StyledButton
        ref={ref}
        disabled={disabled || loading}
        size={size}
        variant={buttonVariant}
        color={buttonColor}
        fullWidth={fullWidth}
        startIcon={!loading && startIcon}
        endIcon={!loading && endIcon}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-busy={loading}
        aria-disabled={disabled}
        isLoading={loading}
        hasStartIcon={!!startIcon}
        hasEndIcon={!!endIcon}
        {...props}
      >
        {children}
        {loading && (
          <CircularProgress
            size={24}
            color={color === 'tto' ? 'primary' : color}
            thickness={4}
          />
        )}
      </StyledButton>
    );

    // Wrap with tooltip if tooltipText is provided
    return tooltipText ? (
      <Tooltip title={tooltipText} arrow>
        {button}
      </Tooltip>
    ) : (
      button
    );
  }
);

// Display name for dev tools
CustomButton.displayName = 'CustomButton';

export default CustomButton;