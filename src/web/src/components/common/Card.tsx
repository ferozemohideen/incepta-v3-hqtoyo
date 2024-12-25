// @mui/material v5.14.0
import { Card, CardProps } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { lightTheme } from '../../styles/theme';

/**
 * Extended props interface for enhanced card customization
 * Implements Material Design 3.0 principles with TTO-specific features
 */
export interface CustomCardProps extends CardProps {
  /** Controls card shadow depth using Material Design elevation system */
  elevation?: number;
  /** Removes default padding for custom content layouts */
  noPadding?: boolean;
  /** Customizes card corner radius in theme spacing units */
  borderRadius?: number;
  /** Enables interactive behaviors with hover and focus states */
  clickable?: boolean;
  /** Forces card to fill parent height for grid layouts */
  fullHeight?: boolean;
}

/**
 * Styled card component with theme-aware customization
 * Implements WCAG 2.1 Level AA compliance for interactive elements
 */
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => 
    !['noPadding', 'borderRadius', 'clickable', 'fullHeight'].includes(prop as string),
})<CustomCardProps>(({ theme, elevation = 1, noPadding, borderRadius = 1, clickable, fullHeight }) => ({
  // Base styles
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  transition: theme.transitions.create(
    ['box-shadow', 'transform'],
    { duration: theme.transitions.duration.short }
  ),

  // Elevation and shadow
  boxShadow: theme.shadows[elevation],

  // Padding configuration
  padding: noPadding ? 0 : theme.spacing(2),

  // Border radius with theme spacing
  borderRadius: theme.spacing(borderRadius),

  // Interactive states for clickable cards
  ...(clickable && {
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[elevation + 1],
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  }),

  // Full height configuration
  ...(fullHeight && {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  }),

  // Responsive styles
  [theme.breakpoints.down('sm')]: {
    padding: noPadding ? 0 : theme.spacing(1.5),
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
    '&:focus-visible': {
      outline: '2px solid ButtonText',
    },
  },
}));

/**
 * CustomCard component with enhanced functionality and accessibility
 * Provides flexible container for content with Material Design principles
 * 
 * @example
 * ```tsx
 * <CustomCard elevation={2} clickable>
 *   <CardContent>
 *     <Typography>Card Content</Typography>
 *   </CardContent>
 * </CustomCard>
 * ```
 */
export const CustomCard: React.FC<CustomCardProps> = ({
  children,
  elevation = 1,
  noPadding = false,
  borderRadius = 1,
  clickable = false,
  fullHeight = false,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...props
}) => {
  const theme = useTheme();

  // Handle keyboard interaction for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick?.(event as any);
    }
    onKeyDown?.(event);
  };

  return (
    <StyledCard
      elevation={elevation}
      noPadding={noPadding}
      borderRadius={borderRadius}
      clickable={clickable}
      fullHeight={fullHeight}
      onClick={clickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : role}
      tabIndex={clickable ? 0 : tabIndex}
      aria-disabled={props.disabled}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

// Default props
CustomCard.defaultProps = {
  elevation: 1,
  noPadding: false,
  borderRadius: 1,
  clickable: false,
  fullHeight: false,
};

export default CustomCard;