import React from 'react';
import { Drawer, Box, IconButton } from '@mui/material'; // v5.14.0
import { ChevronLeft, ChevronRight } from '@mui/icons-material'; // v5.14.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0

/**
 * Props interface for the CustomDrawer component
 */
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchor?: 'left' | 'right';
  width?: number;
  persistent?: boolean;
  className?: string;
  sx?: object;
  variant?: 'temporary' | 'persistent' | 'permanent';
  disableBackdropTransition?: boolean;
}

/**
 * Styled drawer component with responsive width and enhanced transitions
 */
const StyledDrawer = styled(Drawer, {
  shouldComponentUpdate: (nextProps) => nextProps.open !== nextProps.open,
})(({ theme, width = 400 }) => ({
  width: {
    xs: '100%',
    sm: width,
    md: width,
  },
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: {
      xs: '100%',
      sm: width,
      md: width,
    },
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

/**
 * Styled drawer header with RTL-aware close button positioning
 */
const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: 56,
  borderBottom: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.up('sm')]: {
    minHeight: 64,
  },
}));

/**
 * A reusable Material UI drawer component that provides a sliding panel
 * for navigation, filters, or additional content following Material Design 3.0
 * principles with enhanced responsive behavior and RTL support.
 */
const CustomDrawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  children,
  anchor = 'left',
  width = 400,
  persistent = false,
  className,
  sx,
  variant = 'temporary',
  disableBackdropTransition = false,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  // Determine proper chevron icon based on anchor and RTL
  const ChevronIcon = (anchor === 'left') !== isRTL ? ChevronLeft : ChevronRight;

  return (
    <StyledDrawer
      variant={variant}
      anchor={anchor}
      open={open}
      onClose={onClose}
      width={width}
      className={className}
      sx={sx}
      ModalProps={{
        keepMounted: true,
        disableScrollLock: persistent,
        disableBackdropTransition,
      }}
      PaperProps={{
        elevation: persistent ? 0 : 1,
        sx: {
          height: '100%',
          overflowY: 'auto',
        },
      }}
      aria-label={`${anchor} drawer`}
    >
      <DrawerHeader>
        <IconButton
          onClick={onClose}
          aria-label="close drawer"
          size="large"
          edge="end"
          sx={{
            marginRight: anchor === 'right' ? 'auto' : undefined,
            marginLeft: anchor === 'left' ? 'auto' : undefined,
          }}
        >
          <ChevronIcon />
        </IconButton>
      </DrawerHeader>
      <Box
        sx={{
          padding: theme.spacing(2),
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {children}
      </Box>
    </StyledDrawer>
  );
};

export default CustomDrawer;