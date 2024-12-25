// @ts-check
/**
 * Storage utilities for browser storage operations
 * Version: 1.0.0
 * TypeScript Version: 5.0+
 */

/**
 * Custom error class for storage-related errors
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Enumeration of storage error codes
 */
export enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  STORAGE_DISABLED = 'STORAGE_DISABLED',
  INVALID_KEY = 'INVALID_KEY',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  INVALID_DATA = 'INVALID_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Storage type enumeration
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage'
}

/**
 * Configuration for storage operations
 */
const STORAGE_CONFIG = {
  MAX_KEY_LENGTH: 128,
  MAX_RETRIES: 3,
  RETRY_DELAY: 100, // milliseconds
  QUOTA_WARNING_THRESHOLD: 0.9, // 90% of available space
  KEY_REGEX: /^[a-zA-Z0-9_.-]+$/
} as const;

/**
 * Validates a storage key
 * @param key - The key to validate
 * @throws {StorageError} If key is invalid
 */
const validateKey = (key: string): void => {
  if (!key || typeof key !== 'string') {
    throw new StorageError(
      'Storage key must be a non-empty string',
      StorageErrorCode.INVALID_KEY
    );
  }

  if (key.length > STORAGE_CONFIG.MAX_KEY_LENGTH) {
    throw new StorageError(
      `Storage key exceeds maximum length of ${STORAGE_CONFIG.MAX_KEY_LENGTH}`,
      StorageErrorCode.INVALID_KEY
    );
  }

  if (!STORAGE_CONFIG.KEY_REGEX.test(key)) {
    throw new StorageError(
      'Storage key contains invalid characters',
      StorageErrorCode.INVALID_KEY
    );
  }
};

/**
 * Checks if storage is available
 * @param type - The type of storage to check
 * @throws {StorageError} If storage is unavailable
 */
const checkStorageAvailability = (type: StorageType): void => {
  try {
    const storage = window[type];
    const testKey = `__storage_test__${Date.now()}`;
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
  } catch (error) {
    throw new StorageError(
      `${type} is not available`,
      StorageErrorCode.STORAGE_UNAVAILABLE,
      error as Error
    );
  }
};

/**
 * Sets an item in localStorage with enhanced type safety and error handling
 * @param key - The key to store the value under
 * @param value - The value to store
 * @throws {StorageError} If operation fails
 */
export const setLocalStorageItem = <T>(key: string, value: T): void => {
  validateKey(key);
  checkStorageAvailability(StorageType.LOCAL);

  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).name === 'QuotaExceededError') {
        throw new StorageError(
          'localStorage quota exceeded',
          StorageErrorCode.QUOTA_EXCEEDED,
          error
        );
      }
      throw new StorageError(
        'Failed to set localStorage item',
        StorageErrorCode.UNKNOWN_ERROR,
        error
      );
    }
  }
};

/**
 * Gets an item from localStorage with type safety and error handling
 * @param key - The key to retrieve
 * @returns The stored value or null if not found
 * @throws {StorageError} If operation fails
 */
export const getLocalStorageItem = <T>(key: string): T | null => {
  validateKey(key);
  checkStorageAvailability(StorageType.LOCAL);

  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;

    return JSON.parse(item) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new StorageError(
        'Failed to parse stored value',
        StorageErrorCode.DESERIALIZATION_ERROR,
        error
      );
    }
    throw new StorageError(
      'Failed to get localStorage item',
      StorageErrorCode.UNKNOWN_ERROR,
      error as Error
    );
  }
};

/**
 * Sets an item in sessionStorage with enhanced security
 * @param key - The key to store the value under
 * @param value - The value to store
 * @throws {StorageError} If operation fails
 */
export const setSessionStorageItem = <T>(key: string, value: T): void => {
  validateKey(key);
  checkStorageAvailability(StorageType.SESSION);

  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).name === 'QuotaExceededError') {
        throw new StorageError(
          'sessionStorage quota exceeded',
          StorageErrorCode.QUOTA_EXCEEDED,
          error
        );
      }
      throw new StorageError(
        'Failed to set sessionStorage item',
        StorageErrorCode.UNKNOWN_ERROR,
        error
      );
    }
  }
};

/**
 * Gets an item from sessionStorage with type safety
 * @param key - The key to retrieve
 * @returns The stored value or null if not found
 * @throws {StorageError} If operation fails
 */
export const getSessionStorageItem = <T>(key: string): T | null => {
  validateKey(key);
  checkStorageAvailability(StorageType.SESSION);

  try {
    const item = sessionStorage.getItem(key);
    if (item === null) return null;

    return JSON.parse(item) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new StorageError(
        'Failed to parse stored value',
        StorageErrorCode.DESERIALIZATION_ERROR,
        error
      );
    }
    throw new StorageError(
      'Failed to get sessionStorage item',
      StorageErrorCode.UNKNOWN_ERROR,
      error as Error
    );
  }
};

/**
 * Removes an item from specified storage
 * @param key - The key to remove
 * @param storage - The type of storage to remove from
 * @throws {StorageError} If operation fails
 */
export const removeStorageItem = (key: string, storage: StorageType): void => {
  validateKey(key);
  checkStorageAvailability(storage);

  try {
    window[storage].removeItem(key);
  } catch (error) {
    throw new StorageError(
      `Failed to remove item from ${storage}`,
      StorageErrorCode.UNKNOWN_ERROR,
      error as Error
    );
  }
};

/**
 * Clears all items from both storage types
 * @throws {StorageError} If operation fails
 */
export const clearStorage = (): void => {
  try {
    checkStorageAvailability(StorageType.LOCAL);
    checkStorageAvailability(StorageType.SESSION);

    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    throw new StorageError(
      'Failed to clear storage',
      StorageErrorCode.UNKNOWN_ERROR,
      error as Error
    );
  }
};

// Export types for external use
export type { StorageError as StorageErrorType };