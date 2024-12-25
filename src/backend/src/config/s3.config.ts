/**
 * AWS S3 Storage Configuration
 * Configures secure document storage settings with enhanced validation and error handling
 * @version 1.0.0
 * @module config/s3.config
 */

import { config } from 'dotenv'; // v16.0.0
import { S3Config } from '../interfaces/config.interface';

// Load environment variables if not already loaded
if (process.env.NODE_ENV !== 'test') {
  config();
}

/**
 * Valid AWS regions for S3 bucket deployment
 * Restricted to regions with enhanced security and compliance certifications
 */
const VALID_AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
];

/**
 * Validates S3 bucket name according to AWS naming rules
 * @param bucketName - The S3 bucket name to validate
 * @returns boolean - True if valid, false otherwise
 */
const isValidBucketName = (bucketName: string): boolean => {
  const bucketNameRegex = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
  return bucketNameRegex.test(bucketName);
};

/**
 * Validates AWS access key format
 * @param key - AWS access key to validate
 * @returns boolean - True if valid, false otherwise
 */
const isValidAccessKey = (key: string): boolean => {
  const accessKeyRegex = /^[A-Z0-9]{20}$/;
  return accessKeyRegex.test(key);
};

/**
 * Validates AWS secret key format
 * @param key - AWS secret key to validate
 * @returns boolean - True if valid, false otherwise
 */
const isValidSecretKey = (key: string): boolean => {
  const secretKeyRegex = /^[A-Za-z0-9/+=]{40}$/;
  return secretKeyRegex.test(key);
};

/**
 * Validates all required S3 configuration parameters
 * Throws detailed error messages for invalid configurations
 * @param config - Partial S3 configuration object
 * @throws Error if configuration is invalid
 */
const validateS3Config = (config: Partial<S3Config>): boolean => {
  // Check for required environment variables
  if (!config.bucket || !config.region || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Missing required S3 configuration parameters');
  }

  // Validate bucket name
  if (!isValidBucketName(config.bucket)) {
    throw new Error('Invalid S3 bucket name format');
  }

  // Validate AWS region
  if (!VALID_AWS_REGIONS.includes(config.region)) {
    throw new Error(`Invalid AWS region. Must be one of: ${VALID_AWS_REGIONS.join(', ')}`);
  }

  // Validate AWS credentials
  if (!isValidAccessKey(config.accessKeyId)) {
    throw new Error('Invalid AWS access key format');
  }

  if (!isValidSecretKey(config.secretAccessKey)) {
    throw new Error('Invalid AWS secret key format');
  }

  return true;
};

/**
 * Retrieves and validates S3 configuration from environment variables
 * @returns S3Config - Immutable object containing validated S3 configuration
 * @throws Error if configuration is invalid or missing
 */
const getS3Config = (): Readonly<S3Config> => {
  const config: S3Config = {
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_S3_REGION || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    encryption: {
      enabled: process.env.AWS_S3_ENCRYPTION !== 'false', // Defaults to true
      kmsKeyId: process.env.AWS_S3_KMS_KEY_ID // Optional KMS key for enhanced encryption
    },
    lifecycle: {
      enabled: process.env.AWS_S3_LIFECYCLE !== 'false', // Defaults to true
      transitionDays: parseInt(process.env.AWS_S3_TRANSITION_DAYS || '30', 10),
      expirationDays: parseInt(process.env.AWS_S3_EXPIRATION_DAYS || '365', 10)
    }
  };

  // Validate configuration
  validateS3Config(config);

  // Return immutable configuration object
  return Object.freeze(config);
};

/**
 * Exported S3 configuration object
 * Immutable configuration with validated settings
 */
export const s3Config: Readonly<S3Config> = getS3Config();

/**
 * Export validation utilities for testing and external use
 */
export const s3ConfigUtils = {
  validateS3Config,
  isValidBucketName,
  isValidAccessKey,
  isValidSecretKey
};