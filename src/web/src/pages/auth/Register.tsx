import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import RegisterForm from '../../components/auth/RegisterForm';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { AuthTokens } from '../../interfaces/auth.interface';
import { UserRole } from '../../constants/auth.constants';

/**
 * Enhanced registration page component implementing Material Design 3.0 principles
 * with comprehensive security features and accessibility support.
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const { mfaRequired } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Track registration performance metrics
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      // Log registration flow duration for monitoring
      console.debug(`Registration flow duration: ${duration}ms`);
    };
  }, []);

  /**
   * Handles successful registration with enhanced security checks
   * and proper navigation flow including MFA setup if required
   */
  const handleRegistrationSuccess = useCallback(async (
    tokens: AuthTokens,
    deviceId: string
  ) => {
    try {
      setIsLoading(true);

      // Store registration completion status
      localStorage.setItem('registration_complete', 'true');

      // Navigate based on MFA requirement
      if (mfaRequired) {
        navigate('/auth/mfa-setup', {
          state: { 
            deviceId,
            registrationComplete: true 
          }
        });
      } else {
        // Navigate to role-specific onboarding
        const userRole = tokens.scope.find(scope => 
          Object.values(UserRole).includes(scope as UserRole)
        );
        
        switch (userRole) {
          case UserRole.TTO:
            navigate('/onboarding/tto');
            break;
          case UserRole.ENTREPRENEUR:
            navigate('/onboarding/entrepreneur');
            break;
          case UserRole.RESEARCHER:
            navigate('/onboarding/researcher');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Registration completion failed:', error);
      // Handle navigation errors gracefully
      navigate('/auth/error', {
        state: { 
          error: 'Failed to complete registration',
          retry: true
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, mfaRequired]);

  /**
   * Handles device fingerprinting for enhanced security
   */
  const handleDeviceFingerprint = useCallback((deviceId: string) => {
    // Log device fingerprint for security monitoring
    console.debug('Device fingerprint generated:', deviceId);
  }, []);

  /**
   * Error boundary fallback component
   */
  const ErrorFallback = useCallback(({ 
    error,
    resetErrorBoundary 
  }: { 
    error: Error; 
    resetErrorBoundary: () => void;
  }) => (
    <AuthLayout title="Registration Error">
      <div role="alert">
        <h2>Something went wrong</h2>
        <pre>{error.message}</pre>
        <button onClick={resetErrorBoundary}>Try again</button>
      </div>
    </AuthLayout>
  ), []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset any state that might have caused the error
        setIsLoading(false);
      }}
    >
      <AuthLayout 
        title="Create Account"
        maxWidth="sm"
      >
        <RegisterForm
          onSuccess={handleRegistrationSuccess}
          onDeviceFingerprint={handleDeviceFingerprint}
          allowedRoles={[
            UserRole.ENTREPRENEUR,
            UserRole.RESEARCHER,
            UserRole.TTO
          ]}
          organizationTypes={[
            'University',
            'Research Institution',
            'Technology Transfer Office',
            'Company',
            'Startup',
            'Accelerator/Incubator'
          ]}
        />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default Register;