import React, { useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  styled
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { CustomButtonProps } from './Button';

// Enhanced styled Dialog component with Material Design 3.0 principles
const StyledDialog = styled(Dialog)(({ theme }) => ({
  // Paper styles
  '& .MuiDialog-paper': {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[8],
    margin: theme.spacing(2),
    maxHeight: `calc(100% - ${theme.spacing(4)})`,
    
    // Responsive padding
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(3),
    },
    
    // Animation
    transition: theme.transitions.create(['transform', 'opacity'], {
      duration: theme.transitions.duration.shortest,
    }),
  },

  // Backdrop styles
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    transition: theme.transitions.create('opacity'),
  },

  // Title styles
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2),
    paddingRight: theme.spacing(6), // Space for close button
    '& .MuiTypography-root': {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
  },

  // Content styles
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
    overflowY: 'auto',
    '&:first-of-type': {
      paddingTop: theme.spacing(2),
    },
  },

  // Actions styles
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2),
    '& > :not(:first-of-type)': {
      marginLeft: theme.spacing(2),
    },
  },

  // Close button styles
  '& .modal-close-button': {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
}));

// Interface for Modal props
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  actions?: React.ReactNode;
  disableBackdropClick?: boolean;
  showCloseButton?: boolean;
  ariaDescribedBy?: string;
  focusFirst?: string;
}

/**
 * A reusable modal component that follows Material Design 3.0 principles
 * and meets WCAG 2.1 Level AA accessibility standards.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  actions,
  disableBackdropClick = false,
  showCloseButton = true,
  ariaDescribedBy,
  focusFirst,
}) => {
  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (disableBackdropClick) {
      event.stopPropagation();
      return;
    }
    onClose();
  }, [disableBackdropClick, onClose]);

  // Handle escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !disableBackdropClick) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!open) {
      return () => {};
    }
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open, handleEscapeKey]);

  // Focus management
  useEffect(() => {
    if (open && focusFirst) {
      const elementToFocus = document.getElementById(focusFirst);
      if (elementToFocus) {
        elementToFocus.focus();
      }
    }
    return () => {};
  }, [open, focusFirst]);

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      aria-describedby={ariaDescribedBy}
      // Enhanced accessibility props
      role="dialog"
      aria-modal="true"
    >
      <DialogTitle id="modal-title">
        {title}
        {showCloseButton && (
          <IconButton
            aria-label="Close modal"
            className="modal-close-button"
            onClick={onClose}
            size="large"
            // Enhanced touch target for accessibility
            sx={{ padding: 1 }}
          >
            <Close />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </StyledDialog>
  );
};

// Default action button props for consistent styling
export const modalActionProps: CustomButtonProps = {
  size: 'medium',
  variant: 'contained',
};

export default Modal;