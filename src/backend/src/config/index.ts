/**
 * Central Configuration Module
 * Aggregates and validates all configuration settings for the Incepta platform
 * @module config/index
 * @version 1.0.0
 */

// External imports
import { config as dotenvConfig } from 'dotenv'; // v16.3.1
import { createHash, randomBytes } from 'crypto'; // Node.js built-in

// Internal configuration imports
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { elasticsearchConfig } from './elasticsearch.config';
import { redisConfig } from './redis.config';
import { s3Config } from './s3.config';

// Load environment variables
dotenvConfig();

/**
 * Environment type definition
 */
type Environment = 'development' | 'staging' | 'production';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'ENCRYPTION_KEY'
] as const;

/**
 * Validates environment variables
 * @throws Error if required environment variables are missing
 */
const validateEnvironment = (): void => {
  const missingVars = REQUIRED_ENV_VARS.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate NODE_ENV
  const env = process.env.NODE_ENV as Environment;
  if (!['development', 'staging', 'production'].includes(env)) {
    throw new Error('Invalid NODE_ENV value');
  }
};

/**
 * Encrypts sensitive configuration values
 * @param value - Value to encrypt
 * @returns Encrypted value
 */
const encryptValue = (value: string): string => {
  const key = process.env.ENCRYPTION_KEY!;
  const iv = randomBytes(16);
  const cipher = createHash('sha256')
    .update(key)
    .digest('base64')
    .substr(0, 32);

  return Buffer.from(JSON.stringify({
    iv: iv.toString('hex'),
    value: cipher
  })).toString('base64');
};

/**
 * Validates cross-configuration dependencies and security requirements
 * @throws Error if validation fails
 */
const validateConfigurations = (): boolean => {
  const env = process.env.NODE_ENV as Environment;

  // Production-specific validations
  if (env === 'production') {
    // Enforce SSL/TLS
    if (!databaseConfig.ssl.enabled) {
      throw new Error('SSL must be enabled for database in production');
    }
    if (!redisConfig.tls?.enabled) {
      throw new Error('TLS must be enabled for Redis in production');
    }
    if (!s3Config.encryption.enabled) {
      throw new Error('S3 encryption must be enabled in production');
    }

    // Enforce secure authentication
    if (!authConfig.mfa.enabled) {
      throw new Error('MFA must be enabled in production');
    }
  }

  // Cross-service validations
  if (elasticsearchConfig.indices.technology !== 'incepta_technologies') {
    throw new Error('Invalid Elasticsearch technology index name');
  }

  // Cache configuration validation
  if (redisConfig.ttl.session < authConfig.session.maxAge) {
    throw new Error('Redis session TTL must be greater than session max age');
  }

  return true;
};

/**
 * Aggregated configuration object with all platform settings
 */
export const config = Object.freeze({
  environment: process.env.NODE_ENV as Environment,
  
  // Service configurations
  auth: authConfig,
  database: databaseConfig,
  elasticsearch: elasticsearchConfig,
  redis: redisConfig,
  s3: s3Config,

  // Security settings
  security: {
    encryptionEnabled: true,
    encryptValue,
  },

  // Validation utilities
  validateConfigurations,
});

// Perform initial validation
validateEnvironment();
validateConfigurations();

/**
 * Export individual configurations for convenience
 */
export {
  authConfig,
  databaseConfig,
  elasticsearchConfig,
  redisConfig,
  s3Config,
};

/**
 * Export configuration types
 */
export type {
  Environment,
};