/**
 * Validation Utilities Test Suite
 * Version: 1.0.0
 * 
 * Comprehensive test suite for validation utilities implementing enhanced security
 * features and form validation for the Incepta platform.
 */

import { describe, it, expect } from '@jest/globals'; // v29.6.0
import { validateLoginCredentials, validateRegistrationData } from '../../src/utils/validation.utils';
import { UserRole } from '../../src/constants/auth.constants';

// Test constants
const VALID_TEST_FINGERPRINT = 'valid-device-fingerprint-hash';
const VALID_TEST_IP = '192.168.1.1';
const VALID_TEST_ORG = 'test-university.edu';
const INVALID_TEST_FINGERPRINT = 'invalid-fingerprint';
const BLOCKED_TEST_IP = '10.0.0.1';
const RATE_LIMIT_THRESHOLD = 100;

describe('Login Validation Tests', () => {
  // Valid login credentials test cases
  it('should validate correct login credentials with device fingerprint', async () => {
    const validCredentials = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      ipAddress: VALID_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: VALID_TEST_FINGERPRINT
      }
    };

    await expect(validateLoginCredentials(validCredentials)).resolves.toBe(true);
  });

  // Invalid email format tests
  it('should reject invalid email formats', async () => {
    const invalidEmailCredentials = {
      email: 'invalid-email',
      password: 'SecurePass123!',
      ipAddress: VALID_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: VALID_TEST_FINGERPRINT
      }
    };

    await expect(validateLoginCredentials(invalidEmailCredentials))
      .rejects
      .toThrow('Invalid email format');
  });

  // Password policy tests
  it('should enforce password policy requirements', async () => {
    const weakPasswordCredentials = {
      email: 'user@test-university.edu',
      password: 'weak',
      ipAddress: VALID_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: VALID_TEST_FINGERPRINT
      }
    };

    await expect(validateLoginCredentials(weakPasswordCredentials))
      .rejects
      .toThrow('Password does not meet requirements');
  });

  // Device fingerprint validation tests
  it('should reject invalid device fingerprints', async () => {
    const invalidFingerprintCredentials = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      ipAddress: VALID_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: INVALID_TEST_FINGERPRINT
      }
    };

    await expect(validateLoginCredentials(invalidFingerprintCredentials))
      .rejects
      .toThrow('Invalid device fingerprint');
  });

  // IP validation tests
  it('should reject blocked IP addresses', async () => {
    const blockedIpCredentials = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      ipAddress: BLOCKED_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: VALID_TEST_FINGERPRINT
      }
    };

    await expect(validateLoginCredentials(blockedIpCredentials))
      .rejects
      .toThrow('IP address blocked');
  });

  // Rate limiting tests
  it('should enforce rate limiting thresholds', async () => {
    const credentials = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      ipAddress: VALID_TEST_IP,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'web',
        version: '1.0.0',
        fingerprint: VALID_TEST_FINGERPRINT
      }
    };

    // Simulate multiple login attempts
    const attempts = Array(RATE_LIMIT_THRESHOLD + 1)
      .fill(credentials)
      .map(validateLoginCredentials);

    await expect(Promise.all(attempts))
      .rejects
      .toThrow('Rate limit exceeded');
  });
});

describe('Registration Validation Tests', () => {
  // Valid registration data test
  it('should validate correct registration data with organization', async () => {
    const validRegistration = {
      email: 'researcher@test-university.edu',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: UserRole.RESEARCHER,
      organization: VALID_TEST_ORG,
      organizationType: 'university',
      acceptedTerms: true
    };

    await expect(validateRegistrationData(validRegistration)).resolves.toBe(true);
  });

  // Organization validation tests
  it('should reject invalid organization domains', async () => {
    const invalidOrgRegistration = {
      email: 'user@invalid-org.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: UserRole.RESEARCHER,
      organization: 'invalid-org.com',
      organizationType: 'university',
      acceptedTerms: true
    };

    await expect(validateRegistrationData(invalidOrgRegistration))
      .rejects
      .toThrow('Invalid organization domain');
  });

  // Role permission tests
  it('should validate role permissions matrix', async () => {
    const invalidRoleRegistration = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: UserRole.ADMIN, // Attempting to register as admin
      organization: VALID_TEST_ORG,
      organizationType: 'university',
      acceptedTerms: true
    };

    await expect(validateRegistrationData(invalidRoleRegistration))
      .rejects
      .toThrow('Invalid role assignment');
  });

  // Academic email requirements
  it('should enforce academic email requirements for researchers', async () => {
    const nonAcademicEmailRegistration = {
      email: 'researcher@gmail.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: UserRole.RESEARCHER,
      organization: VALID_TEST_ORG,
      organizationType: 'university',
      acceptedTerms: true
    };

    await expect(validateRegistrationData(nonAcademicEmailRegistration))
      .rejects
      .toThrow('Academic email required for researcher role');
  });

  // Duplicate prevention tests
  it('should prevent duplicate organization registrations', async () => {
    const duplicateOrgRegistration = {
      email: 'another@test-university.edu',
      password: 'SecurePass123!',
      name: 'Jane Doe',
      role: UserRole.TTO,
      organization: VALID_TEST_ORG, // Already registered
      organizationType: 'university',
      acceptedTerms: true
    };

    await expect(validateRegistrationData(duplicateOrgRegistration))
      .rejects
      .toThrow('Organization already registered');
  });

  // Terms acceptance test
  it('should require terms acceptance', async () => {
    const noTermsRegistration = {
      email: 'user@test-university.edu',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: UserRole.RESEARCHER,
      organization: VALID_TEST_ORG,
      organizationType: 'university',
      acceptedTerms: false
    };

    await expect(validateRegistrationData(noTermsRegistration))
      .rejects
      .toThrow('Terms must be accepted');
  });
});