import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../../../config/theme.config';
import LoginForm from '../../../components/auth/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { PASSWORD_POLICY } from '../../../constants/auth.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.Mock;

// Test data
const validCredentials = {
  email: 'test@example.com',
  password: 'StrongP@ssw0rd123!',
  deviceInfo: {
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    version: window.navigator.appVersion,
    fingerprint: 'mock-device-fingerprint'
  }
};

describe('LoginForm Component', () => {
  // Mock handlers
  const mockOnSuccess = jest.fn();
  const mockOnMFARequired = jest.fn();
  const mockOnError = jest.fn();
  const mockHandleLogin = jest.fn();
  const mockVerifyMFA = jest.fn();
  const mockValidateDeviceFingerprint = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup useAuth mock implementation
    mockUseAuth.mockImplementation(() => ({
      handleLogin: mockHandleLogin,
      verifyMFA: mockVerifyMFA,
      validateDeviceFingerprint: mockValidateDeviceFingerprint,
      loading: false,
      error: null,
      mfaRequired: false,
      deviceTrusted: false
    }));
  });

  const renderLoginForm = () => {
    return render(
      <ThemeProvider theme={createAppTheme('light')}>
        <LoginForm
          onSuccess={mockOnSuccess}
          onMFARequired={mockOnMFARequired}
          onError={mockOnError}
          maxAttempts={5}
        />
      </ThemeProvider>
    );
  };

  it('meets accessibility standards', async () => {
    const { container } = renderLoginForm();
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA attributes
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Login form');

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('aria-required', 'true');

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });

  it('implements Material Design styling', () => {
    renderLoginForm();

    // Verify Material UI components
    const form = screen.getByRole('form');
    expect(form).toHaveStyle({
      width: '100%',
      maxWidth: '400px',
      padding: '24px' // MUI spacing(3)
    });

    // Verify text fields styling
    const emailField = screen.getByLabelText(/email address/i).closest('.MuiTextField-root');
    expect(emailField).toHaveClass('MuiTextField-root');

    const passwordField = screen.getByLabelText(/password/i).closest('.MuiTextField-root');
    expect(passwordField).toHaveClass('MuiTextField-root');

    // Verify button styling
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toHaveClass('MuiButton-contained');
    expect(submitButton).toHaveClass('MuiButton-containedPrimary');
  });

  it('validates email format correctly', async () => {
    renderLoginForm();
    const emailInput = screen.getByLabelText(/email address/i);

    // Test invalid email
    await userEvent.type(emailInput, 'invalid-email');
    fireEvent.blur(emailInput);
    expect(await screen.findByText(/invalid format/i)).toBeInTheDocument();

    // Test valid email
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, validCredentials.email);
    fireEvent.blur(emailInput);
    expect(screen.queryByText(/invalid format/i)).not.toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    renderLoginForm();
    const passwordInput = screen.getByLabelText(/password/i);

    // Test weak password
    await userEvent.type(passwordInput, 'weak');
    fireEvent.blur(passwordInput);
    expect(await screen.findByText(new RegExp(`minimum length is ${PASSWORD_POLICY.MIN_LENGTH}`, 'i'))).toBeInTheDocument();

    // Test valid password
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, validCredentials.password);
    fireEvent.blur(passwordInput);
    expect(screen.queryByText(/minimum length/i)).not.toBeInTheDocument();
  });

  it('implements secure authentication flow', async () => {
    renderLoginForm();
    mockHandleLogin.mockResolvedValueOnce({ tokens: { accessToken: 'mock-token' } });

    // Fill form with valid credentials
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);

    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify login attempt
    await waitFor(() => {
      expect(mockHandleLogin).toHaveBeenCalledWith(expect.objectContaining({
        email: validCredentials.email,
        password: validCredentials.password,
        deviceInfo: expect.any(Object)
      }));
    });

    // Verify success callback
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles MFA flow correctly', async () => {
    // Setup MFA required scenario
    mockUseAuth.mockImplementation(() => ({
      ...mockUseAuth(),
      mfaRequired: true
    }));

    renderLoginForm();
    mockHandleLogin.mockResolvedValueOnce({ requiresMFA: true });

    // Submit login form
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify MFA callback
    await waitFor(() => {
      expect(mockOnMFARequired).toHaveBeenCalled();
    });
  });

  it('implements rate limiting', async () => {
    renderLoginForm();
    mockHandleLogin.mockRejectedValue(new Error('Invalid credentials'));

    // Attempt multiple logins
    for (let i = 0; i < 6; i++) {
      await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Clear inputs for next attempt
      await userEvent.clear(screen.getByLabelText(/email address/i));
      await userEvent.clear(screen.getByLabelText(/password/i));
    }

    // Verify rate limit message
    expect(screen.getByText(/maximum login attempts exceeded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('handles error states appropriately', async () => {
    renderLoginForm();
    const error = new Error('Invalid credentials');
    mockHandleLogin.mockRejectedValueOnce(error);

    // Submit form
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify error handling
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  it('supports keyboard navigation', async () => {
    renderLoginForm();
    
    // Test tab navigation
    await userEvent.tab();
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    
    await userEvent.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();
    
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();

    // Test enter key submission
    await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
    await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
    await userEvent.keyboard('{Enter}');

    expect(mockHandleLogin).toHaveBeenCalled();
  });
});