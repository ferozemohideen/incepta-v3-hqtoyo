// winston v3.10.0 - Primary logging library
import winston from 'winston';
// winston-daily-rotate-file v4.7.1 - Log rotation management
import DailyRotateFile from 'winston-daily-rotate-file';
// winston-elasticsearch v0.17.1 - Elasticsearch transport
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Type definitions for logger configuration
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'security' | 'audit';
type TransportType = 'console' | 'file' | 'elasticsearch';

// Interface for Elasticsearch client options
interface ElasticsearchClientOptions {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

// Interface for transport configuration
interface TransportConfig {
  type: TransportType;
  level: LogLevel;
  filename?: string;
  maxSize?: string;
  maxFiles?: string;
  format?: string;
  datePattern?: string;
  zippedArchive?: boolean;
  clientOpts?: ElasticsearchClientOptions;
  bufferLimit?: number;
  retryLimit?: number;
  flushInterval?: number;
}

// Interface for logger configuration
interface LoggerConfig {
  level: LogLevel;
  format: string;
  timestamp: boolean;
  colorize: boolean;
  transports: TransportConfig[];
  exitOnError: boolean;
  silent?: boolean;
  handleExceptions: boolean;
  maxListeners: number;
}

// Constants for log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 1,
  audit: 1,
};

// Log format configurations
const LOG_FORMATS = {
  development: 'colorized',
  production: 'json',
  test: 'simple',
  security: 'detailed',
};

// Log retention policies (in days)
const RETENTION_POLICIES = {
  development: '14d',
  production: '30d',
  security: '90d',
};

// Custom format for detailed security logs
const securityFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV,
        service: 'incepta',
      },
    });
  })
);

// Environment-specific logger configurations
export const loggerConfig: Record<string, LoggerConfig> = {
  // Development environment configuration
  development: {
    level: 'debug',
    format: LOG_FORMATS.development,
    timestamp: true,
    colorize: true,
    handleExceptions: true,
    exitOnError: false,
    maxListeners: 30,
    transports: [
      {
        type: 'console',
        format: 'simple',
        level: 'debug',
      },
      {
        type: 'file',
        filename: 'logs/development-%DATE%.log',
        maxSize: '20m',
        maxFiles: RETENTION_POLICIES.development,
        format: 'json',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        level: 'debug',
      },
    ],
  },

  // Production environment configuration
  production: {
    level: 'info',
    format: LOG_FORMATS.production,
    timestamp: true,
    colorize: false,
    handleExceptions: true,
    exitOnError: false,
    maxListeners: 50,
    transports: [
      {
        type: 'console',
        format: 'json',
        level: 'info',
      },
      {
        type: 'file',
        filename: 'logs/production-%DATE%.log',
        maxSize: '50m',
        maxFiles: RETENTION_POLICIES.production,
        format: 'json',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        level: 'info',
        bufferLimit: 1000,
        flushInterval: 5000,
      },
      {
        type: 'elasticsearch',
        level: 'info',
        clientOpts: {
          node: 'http://elasticsearch:9200',
          auth: {
            username: 'elastic',
            password: process.env.ELASTIC_PASSWORD || 'ELASTIC_PASSWORD',
          },
          ssl: {
            rejectUnauthorized: true,
          },
        },
        bufferLimit: 2000,
        retryLimit: 3,
        flushInterval: 2000,
      },
      {
        type: 'file',
        filename: 'logs/security-%DATE%.log',
        level: 'security',
        maxSize: '100m',
        maxFiles: RETENTION_POLICIES.security,
        format: 'detailed',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
      },
    ],
  },

  // Test environment configuration
  test: {
    level: 'error',
    format: LOG_FORMATS.test,
    timestamp: true,
    colorize: false,
    handleExceptions: true,
    exitOnError: false,
    maxListeners: 10,
    transports: [
      {
        type: 'console',
        format: 'simple',
        level: 'error',
      },
    ],
  },
};

// Helper function to create Winston format based on configuration
export const createWinstonFormat = (formatType: string): winston.Logform.Format => {
  switch (formatType) {
    case 'json':
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      );
    case 'colorized':
      return winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.simple()
      );
    case 'detailed':
      return securityFormat;
    case 'simple':
    default:
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      );
  }
};

// Export custom log levels
export const customLevels = LOG_LEVELS;