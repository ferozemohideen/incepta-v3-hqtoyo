error TS2724: '"./Notification"' has no exported member named 'clearNotifications'. Did you mean 'Notification'?
```

2. Three errors about missing 'override' modifiers for component lifecycle methods:
```
error TS4114: This member must have an 'override' modifier because it overrides a member in the base class
```

3. One error about accessing a non-existent state property:
```
error TS2339: Property 'maxRetryAttempts' does not exist on type 'Readonly<ErrorBoundaryState>'
```

Here's the regenerated file with all fixes:

# src/web/src/components/common/ErrorBoundary.tsx
```typescript
import React, { Component, ErrorInfo } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { ErrorOutline, RefreshRounded } from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification';
import { ANIMATION } from '../../constants/ui.constants';

// Props interface with comprehensive error handling options
interface ErrorBoundaryProps {
  children: React.ReactNode;
  showNotification?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableAutoRetry?: boolean;
  maxRetryAttempts?: number;
  onErrorMetrics?: (errorId: string, error: Error) => void;
  fallbackComponent?: React.ReactNode;
}

// State interface for detailed error tracking
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
  retryCount: number;
  isRecovering: boolean;
  errorId: string;
  showFallback: boolean;
}

/**
 * Enhanced error boundary component that provides graceful error handling
 * with accessibility support and automatic recovery options.
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private recoveryTimeout: NodeJS.Timeout | null = null;

  static defaultProps = {
    showNotification: true,
    enableAutoRetry: true,
    maxRetryAttempts: 3,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: '',
      retryCount: 0,
      isRecovering: false,
      errorId: '',
      showFallback: false,
    };
  }

  /**
   * Static lifecycle method to derive error state
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      showFallback: true,
    };
  }

  /**
   * Lifecycle method for handling caught errors
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
    });

    // Update state with error details
    this.setState({
      errorInfo: errorInfo.componentStack || '',
    });

    // Track error metrics if callback provided
    if (this.props.onErrorMetrics) {
      this.props.onErrorMetrics(this.state.errorId, error);
    }

    // Call error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show notification if enabled
    if (this.props.showNotification) {
      const { showError } = useNotification();
      showError('An unexpected error occurred. We\'re working to fix it.');
    }

    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRetry && this.state.retryCount < (this.props.maxRetryAttempts || 3)) {
      this.handleReset();
    }
  }

  /**
   * Cleanup on component unmount
   */
  override componentWillUnmount(): void {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
  }

  /**
   * Handles error recovery and retry attempts
   */
  handleReset = (): void => {
    const { maxRetryAttempts = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetryAttempts) {
      this.setState({ showFallback: true });
      return;
    }

    this.setState(prevState => ({
      isRecovering: true,
      retryCount: prevState.retryCount + 1,
    }));

    // Attempt recovery after a delay
    this.recoveryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: '',
        isRecovering: false,
        showFallback: false,
      });
    }, ANIMATION.DURATION_MEDIUM);
  };

  /**
   * Render method
   */
  override render(): React.ReactNode {
    const { children, fallbackComponent, maxRetryAttempts = 3 } = this.props;
    const { hasError, isRecovering, showFallback, retryCount } = this.state;

    if (!hasError) {
      return children;
    }

    if (isRecovering) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            p: 3,
            textAlign: 'center',
          }}
          role="alert"
          aria-live="polite"
        >
          <CircularProgress
            size={40}
            aria-label="Attempting to recover"
            sx={{ mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            Attempting to recover...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Retry attempt {retryCount} of {maxRetryAttempts}
          </Typography>
        </Box>
      );
    }

    if (showFallback) {
      if (fallbackComponent) {
        return fallbackComponent;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
          }}
          role="alert"
          aria-live="assertive"
        >
          <ErrorOutline
            color="error"
            sx={{ fontSize: 48, mb: 2 }}
            aria-hidden="true"
          />
          <Typography variant="h5" gutterBottom component="h2">
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We apologize for the inconvenience. Please try again or contact support if the problem persists.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshRounded />}
            onClick={this.handleReset}
            disabled={retryCount >= maxRetryAttempts}
            aria-label="Try again"
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
          {retryCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              Retry attempt {retryCount} of {maxRetryAttempts}
            </Typography>
          )}
        </Box>
      );
    }

    return children;
  }
}

export default ErrorBoundary;