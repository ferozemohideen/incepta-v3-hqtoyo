/**
 * Encryption Utility Module
 * Provides cryptographic functions for secure password handling and data encryption
 * @module utils/encryption
 * @version 1.0.0
 */

import bcrypt from 'bcryptjs'; // v2.4.3
import crypto from 'crypto';
import { authConfig } from '../config/auth.config';

/**
 * Constants for encryption configuration
 */
const SALT_ROUNDS = 12;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Custom error types for encryption operations
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Validates that the JWT secret meets minimum security requirements
 * @throws {EncryptionError} If JWT secret is invalid
 */
function validateJwtSecret(): void {
  if (!authConfig.jwtSecret || authConfig.jwtSecret.length < 32) {
    throw new EncryptionError('Invalid JWT secret: Must be at least 32 characters');
  }
}

/**
 * Securely hashes a password using bcrypt with configurable salt rounds
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password with embedded salt
 * @throws {EncryptionError} If password is invalid or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (!password || password.length < 8) {
      throw new EncryptionError('Password must be at least 8 characters long');
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Password hashing failed');
  }
}

/**
 * Securely compares a plain text password with a hashed password
 * @param {string} password - Plain text password to compare
 * @param {string} hashedPassword - Bcrypt hashed password
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 * @throws {EncryptionError} If comparison fails
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    if (!password || !hashedPassword) {
      throw new EncryptionError('Password and hash must be provided');
    }
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Password comparison failed');
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM with secure IV generation
 * @param {string} data - Data to encrypt
 * @returns {Promise<{encryptedData: string; iv: string; authTag: string}>} Encrypted data bundle
 * @throws {EncryptionError} If encryption fails
 */
export async function encryptData(
  data: string
): Promise<{ encryptedData: string; iv: string; authTag: string }> {
  try {
    validateJwtSecret();

    if (!data) {
      throw new EncryptionError('Data must be provided for encryption');
    }

    // Generate a cryptographically secure IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(authConfig.jwtSecret.slice(0, 32)), // Use first 32 bytes of JWT secret as key
      iv
    );

    // Encrypt the data
    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedData,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Data encryption failed');
  }
}

/**
 * Decrypts AES-256-GCM encrypted data with authentication verification
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} iv - Base64 encoded initialization vector
 * @param {string} authTag - Base64 encoded authentication tag
 * @returns {Promise<string>} Decrypted data
 * @throws {EncryptionError} If decryption or authentication fails
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  authTag: string
): Promise<string> {
  try {
    validateJwtSecret();

    if (!encryptedData || !iv || !authTag) {
      throw new EncryptionError('Encrypted data, IV, and auth tag must be provided');
    }

    // Convert base64 strings back to buffers
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(authConfig.jwtSecret.slice(0, 32)),
      ivBuffer
    );

    // Set auth tag for verification
    decipher.setAuthTag(authTagBuffer);

    // Decrypt the data
    let decryptedData = decipher.update(encryptedData, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Data decryption failed: Invalid data or tampering detected');
  }
}

// Validate JWT secret on module load
validateJwtSecret();