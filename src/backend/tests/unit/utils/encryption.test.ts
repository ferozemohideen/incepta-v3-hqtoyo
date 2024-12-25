/**
 * Unit Tests for Encryption Utility Functions
 * Verifies security and functionality of cryptographic operations
 * @module tests/unit/utils/encryption
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals'; // v29.x
import {
  hashPassword,
  comparePassword,
  encryptData,
  decryptData
} from '../../../src/utils/encryption';

// Test constants
const TEST_PASSWORD = 'TestPassword123!@#';
const TEST_DATA = 'Sensitive test data for encryption';
const MIN_PASSWORD_LENGTH = 8;
const MAX_ENCRYPTION_SIZE = 5242880; // 5MB

describe('hashPassword', () => {
  test('should successfully hash password meeting complexity requirements', async () => {
    const hashedPassword = await hashPassword(TEST_PASSWORD);
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(TEST_PASSWORD);
    expect(hashedPassword.startsWith('$2a$')).toBe(true); // Verify bcrypt format
  });

  test('should enforce minimum password length', async () => {
    const shortPassword = 'Short1!';
    await expect(hashPassword(shortPassword)).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });

  test('should generate unique salts for same password', async () => {
    const hash1 = await hashPassword(TEST_PASSWORD);
    const hash2 = await hashPassword(TEST_PASSWORD);
    expect(hash1).not.toBe(hash2);
  });

  test('should reject empty or null passwords', async () => {
    await expect(hashPassword('')).rejects.toThrow();
    await expect(hashPassword(null as any)).rejects.toThrow();
  });

  test('should handle passwords with special characters', async () => {
    const complexPassword = '!@#$%^&*()_+{}:"<>?~`';
    const hashedPassword = await hashPassword(complexPassword);
    expect(hashedPassword).toBeDefined();
  });

  test('should handle maximum password length', async () => {
    const longPassword = 'A'.repeat(72) + 'b1!'; // bcrypt max is 72 bytes
    const hashedPassword = await hashPassword(longPassword);
    expect(hashedPassword).toBeDefined();
  });
});

describe('comparePassword', () => {
  let hashedTestPassword: string;

  beforeAll(async () => {
    hashedTestPassword = await hashPassword(TEST_PASSWORD);
  });

  test('should successfully verify correct password', async () => {
    const isMatch = await comparePassword(TEST_PASSWORD, hashedTestPassword);
    expect(isMatch).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const wrongPassword = 'WrongPassword123!@#';
    const isMatch = await comparePassword(wrongPassword, hashedTestPassword);
    expect(isMatch).toBe(false);
  });

  test('should be timing safe for different length passwords', async () => {
    const startTime = process.hrtime.bigint();
    await comparePassword('short', hashedTestPassword);
    const shortTime = process.hrtime.bigint() - startTime;

    const startTime2 = process.hrtime.bigint();
    await comparePassword('verylongpassword', hashedTestPassword);
    const longTime = process.hrtime.bigint() - startTime2;

    // Timing difference should be minimal (within 10ms)
    expect(Number(longTime - shortTime) / 1e6).toBeLessThan(10);
  });

  test('should reject invalid hash format', async () => {
    const invalidHash = 'invalid_hash_format';
    await expect(comparePassword(TEST_PASSWORD, invalidHash)).rejects.toThrow();
  });

  test('should handle empty or null inputs', async () => {
    await expect(comparePassword('', hashedTestPassword)).rejects.toThrow();
    await expect(comparePassword(TEST_PASSWORD, '')).rejects.toThrow();
    await expect(comparePassword(null as any, hashedTestPassword)).rejects.toThrow();
    await expect(comparePassword(TEST_PASSWORD, null as any)).rejects.toThrow();
  });
});

describe('encryptData', () => {
  test('should successfully encrypt data with authentication tag', async () => {
    const { encryptedData, iv, authTag } = await encryptData(TEST_DATA);
    expect(encryptedData).toBeDefined();
    expect(iv).toBeDefined();
    expect(authTag).toBeDefined();
    expect(encryptedData).not.toBe(TEST_DATA);
  });

  test('should generate unique IVs for same data', async () => {
    const encryption1 = await encryptData(TEST_DATA);
    const encryption2 = await encryptData(TEST_DATA);
    expect(encryption1.iv).not.toBe(encryption2.iv);
    expect(encryption1.encryptedData).not.toBe(encryption2.encryptedData);
  });

  test('should handle large data encryption', async () => {
    const largeData = 'A'.repeat(1024 * 1024); // 1MB
    const result = await encryptData(largeData);
    expect(result.encryptedData).toBeDefined();
  });

  test('should reject empty or null data', async () => {
    await expect(encryptData('')).rejects.toThrow();
    await expect(encryptData(null as any)).rejects.toThrow();
  });

  test('should handle special characters and Unicode', async () => {
    const specialData = '🚀 Special チャラクターs !@#$%^&*()';
    const result = await encryptData(specialData);
    expect(result.encryptedData).toBeDefined();
  });

  test('should reject data exceeding size limit', async () => {
    const hugeData = 'A'.repeat(MAX_ENCRYPTION_SIZE + 1);
    await expect(encryptData(hugeData)).rejects.toThrow();
  });
});

describe('decryptData', () => {
  let encryptedBundle: { encryptedData: string; iv: string; authTag: string };

  beforeAll(async () => {
    encryptedBundle = await encryptData(TEST_DATA);
  });

  test('should successfully decrypt data with valid inputs', async () => {
    const decrypted = await decryptData(
      encryptedBundle.encryptedData,
      encryptedBundle.iv,
      encryptedBundle.authTag
    );
    expect(decrypted).toBe(TEST_DATA);
  });

  test('should detect tampering with encrypted data', async () => {
    const tamperedData = encryptedBundle.encryptedData.replace(/A/g, 'B');
    await expect(
      decryptData(tamperedData, encryptedBundle.iv, encryptedBundle.authTag)
    ).rejects.toThrow();
  });

  test('should detect invalid IV', async () => {
    const invalidIv = Buffer.from('invalid_iv').toString('base64');
    await expect(
      decryptData(encryptedBundle.encryptedData, invalidIv, encryptedBundle.authTag)
    ).rejects.toThrow();
  });

  test('should detect invalid auth tag', async () => {
    const invalidAuthTag = Buffer.from('invalid_auth_tag').toString('base64');
    await expect(
      decryptData(encryptedBundle.encryptedData, encryptedBundle.iv, invalidAuthTag)
    ).rejects.toThrow();
  });

  test('should handle empty or null inputs', async () => {
    await expect(
      decryptData('', encryptedBundle.iv, encryptedBundle.authTag)
    ).rejects.toThrow();
    await expect(
      decryptData(encryptedBundle.encryptedData, '', encryptedBundle.authTag)
    ).rejects.toThrow();
    await expect(
      decryptData(encryptedBundle.encryptedData, encryptedBundle.iv, '')
    ).rejects.toThrow();
  });

  test('should handle decryption of various data types', async () => {
    const testCases = [
      JSON.stringify({ test: 'object' }),
      'null',
      'undefined',
      '🚀 Unicode Data',
      Buffer.from('binary data').toString()
    ];

    for (const testCase of testCases) {
      const encrypted = await encryptData(testCase);
      const decrypted = await decryptData(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(testCase);
    }
  });
});