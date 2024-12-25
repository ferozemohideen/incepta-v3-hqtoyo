import React, { useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  useMediaQuery,
  useTheme,
  PaperProps
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { CustomButton, CustomButtonProps } from './Button';

// Interface for dialog props with comprehensive options
export interface CustomDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  transitionDuration?: number;
  keepMounted?: boolean;
  scroll?: 'paper' | 'body';
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  fullScreen?: boolean;
  PaperProps?: Partial<PaperProps>;
}

// Styled dialog component with enhanced animations and Material Design 3.0 styling
const StyledDialog = styled(Dialog)(({ theme }) => ({
  // Backdrop styling
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },

  // Dialog paper styling
  '& .MuiDialog-paper': {
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: theme.shadows[8],
    margin: theme.spacing(2),
    
    // Responsive padding
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(3),
    },
    
    // Animation
    transition: theme.transitions.create(['transform', 'opacity'], {
      duration: theme.transitions.duration.shorter,
    }),
    
    // Focus outline for accessibility
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
  },

  // Title styling
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2, 2, 1),
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  },

  // Content styling
  '& .MuiDialogContent-root': {
    padding: theme.spacing(1, 2),
    
    '&:first-of-type': {
      paddingTop: theme.spacing(2),
    },
    
    // Scrollbar styling
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.action.hover,
      borderRadius: '4px',
    },
  },

  // Actions styling
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1, 2, 2),
    gap: theme.spacing(1),
    
    // RTL support
    '& > :not(:first-of-type)': {
      marginLeft: theme.spacing(1),
    },
  },
}));

// Custom hook for dialog interaction handlers
const useDialogHandlers = (
  onClose: () => void,
  disableBackdropClick?: boolean,
  disableEscapeKeyDown?: boolean
) => {
  // Track touch/click events to prevent duplicate triggers
  const touchedRef = React.useRef(false);

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (disableBackdropClick || touchedRef.current) {
      touchedRef.current = false;
      return;
    }
    onClose();
  }, [disableBackdropClick, onClose]);

  const handleEscapeKeyDown = useCallback((event: KeyboardEvent) => {
    if (!disableEscapeKeyDown && event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }, [disableEscapeKeyDown, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKeyDown);
    return () => {
      document.removeEventListener('keydown', handleEscapeKeyDown);
    };
  }, [handleEscapeKeyDown]);

  return {
    handleBackdropClick,
    onTouchStart: () => { touchedRef.current = true; },
    onTouchEnd: () => { touchedRef.current = false; },
  };
};

// Main dialog component
export const CustomDialog: React.FC<CustomDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  transitionDuration = 225,
  keepMounted = false,
  scroll = 'paper',
  ariaDescribedBy,
  ariaLabelledBy,
  fullScreen: fullScreenProp,
  PaperProps,
  ...props
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm')) || fullScreenProp;
  
  const {
    handleBackdropClick,
    onTouchStart,
    onTouchEnd
  } = useDialogHandlers(onClose, disableBackdropClick, disableEscapeKeyDown);

  // Generate unique IDs for aria attributes if not provided
  const dialogTitleId = ariaLabelledBy || `dialog-title-${React.useId()}`;
  const dialogDescriptionId = ariaDescribedBy || `dialog-description-${React.useId()}`;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      keepMounted={keepMounted}
      scroll={scroll}
      onClick={handleBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      TransitionProps={{
        timeout: transitionDuration,
      }}
      PaperProps={{
        ...PaperProps,
        role: 'dialog',
        'aria-modal': true,
      }}
      {...props}
    >
      <DialogTitle id={dialogTitleId}>{title}</DialogTitle>
      
      <DialogContent dividers={scroll === 'paper'} id={dialogDescriptionId}>
        {children}
      </DialogContent>
      
      {actions && actions.length > 0 && (
        <DialogActions>
          {actions.map((action, index) => (
            <React.Fragment key={index}>
              {action}
            </React.Fragment>
          ))}
        </DialogActions>
      )}
    </StyledDialog>
  );
};

// Default export
export default CustomDialog;