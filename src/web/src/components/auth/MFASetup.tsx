/**
 * MFA Setup Component
 * Version: 1.0.0
 * 
 * Implements secure Multi-Factor Authentication (MFA) setup using Google Authenticator
 * with WCAG 2.1 Level AA compliance and comprehensive error handling.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import QRCode from 'qrcode.react'; // ^3.1.0
import { styled } from '@mui/material/styles';
import { Box, Typography, Paper, Alert, AlertTitle } from '@mui/material';

import { useAuth } from '../../hooks/useAuth';
import { MFACredentials } from '../../interfaces/auth.interface';
import Button from '../common/Button';
import Input from '../common/Input';

// Props interface with required security parameters
interface MFASetupProps {
  qrCodeUrl: string;
  tempToken: string;
  onSuccess: () => void;
  maxAttempts: number;
}

// Styled components for enhanced accessibility and visual hierarchy
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: '480px',
  margin: '0 auto',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const QRCodeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
  backgroundColor: '#ffffff',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
}));

const InstructionText = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

/**
 * MFA Setup component implementing secure token verification with rate limiting
 */
const MFASetup: React.FC<MFASetupProps> = ({
  qrCodeUrl,
  tempToken,
  onSuccess,
  maxAttempts = 5,
}) => {
  // State management
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Hooks
  const navigate = useNavigate();
  const { handleMFAVerification } = useAuth();

  // Reset error when token changes
  useEffect(() => {
    if (token) {
      setError(null);
    }
  }, [token]);

  // Validate token format
  const validateToken = useCallback((value: string): boolean => {
    // Check length
    if (value.length !== 6) {
      setError('Token must be 6 digits');
      return false;
    }

    // Check if only contains numbers
    if (!/^\d+$/.test(value)) {
      setError('Token must contain only numbers');
      return false;
    }

    // Check for sequential or repeated digits (security measure)
    if (/(\d)\1{5}/.test(value) || /012345|123456|234567|345678|456789/.test(value)) {
      setError('Invalid token format');
      return false;
    }

    return true;
  }, []);

  // Handle token verification with rate limiting
  const handleVerification = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    // Check if locked out
    if (isLocked) {
      return;
    }

    // Validate token format
    if (!validateToken(token)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare MFA credentials
      const mfaData: MFACredentials = {
        token: token.trim(),
        tempToken,
        method: 'totp',
        verificationId: Date.now().toString()
      };

      // Attempt verification
      await handleMFAVerification(mfaData);

      // Handle success
      setLoading(false);
      onSuccess();
      navigate('/dashboard');

    } catch (err) {
      // Handle verification failure
      setLoading(false);
      setAttempts(prev => prev + 1);

      // Check if max attempts reached
      if (attempts + 1 >= maxAttempts) {
        setIsLocked(true);
        setError('Too many attempts. Please try again in 5 minutes.');
        
        // Reset lockout after 5 minutes
        setTimeout(() => {
          setIsLocked(false);
          setAttempts(0);
        }, 5 * 60 * 1000);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    }
  }, [token, tempToken, attempts, isLocked, maxAttempts, handleMFAVerification, onSuccess, navigate, validateToken]);

  return (
    <Box component="form" onSubmit={handleVerification}>
      <StyledPaper>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Set Up Two-Factor Authentication
        </Typography>

        <InstructionText variant="body1">
          1. Install Google Authenticator on your mobile device
        </InstructionText>

        <InstructionText variant="body1">
          2. Scan the QR code below with Google Authenticator
        </InstructionText>

        <QRCodeContainer>
          <QRCode
            value={qrCodeUrl}
            size={200}
            level="H"
            includeMargin
            aria-label="QR Code for Google Authenticator setup"
          />
        </QRCodeContainer>

        <InstructionText variant="body1">
          3. Enter the 6-digit code from Google Authenticator
        </InstructionText>

        <Input
          name="token"
          label="Verification Code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="text"
          required
          disabled={isLocked || loading}
          maxLength={6}
          autoComplete="one-time-code"
          validation={{
            pattern: /^\d{6}$/,
            custom: validateToken
          }}
          aria-describedby="mfa-error-text"
        />

        {error && (
          <Alert 
            severity="error" 
            id="mfa-error-text"
            sx={{ mb: 2 }}
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          loading={loading}
          disabled={isLocked || !token || loading}
          aria-label="Verify MFA code"
        >
          Verify Code
        </Button>

        {attempts > 0 && (
          <Typography 
            variant="caption" 
            color="textSecondary"
            align="center"
            sx={{ mt: 2, display: 'block' }}
          >
            Attempts remaining: {maxAttempts - attempts}
          </Typography>
        )}
      </StyledPaper>
    </Box>
  );
};

export default MFASetup;