// winston v3.10.0
import winston from 'winston';
// winston-daily-rotate-file v4.7.1
import DailyRotateFile from 'winston-daily-rotate-file';
// winston-elasticsearch v0.17.3
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { loggerConfig } from '../config/logger.config';

// Interfaces for metadata types
interface SecurityMetadata {
  userId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  classification?: string;
}

interface AuditMetadata {
  userId?: string;
  action: string;
  resource: string;
  changes?: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
}

// Constants
const DEFAULT_META = {
  service: 'incepta-backend',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  securityLevel: process.env.SECURITY_LEVEL || 'standard',
  complianceMode: process.env.COMPLIANCE_MODE || 'default'
};

// Enhanced error formatter with security context
const formatError = (error: Error, securityContext?: Record<string, any>) => {
  const formattedError = {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'production' 
      ? undefined 
      : error.stack?.split('\n').slice(0, 5),
    timestamp: new Date().toISOString(),
    ...securityContext,
    metadata: {
      ...DEFAULT_META,
      errorId: Math.random().toString(36).substring(7)
    }
  };

  // Remove sensitive information
  delete formattedError.stack;
  return formattedError;
};

// PII data masking formatter
const maskPII = winston.format((info) => {
  if (info.metadata?.userId) {
    info.metadata.userId = `***${info.metadata.userId.slice(-4)}`;
  }
  if (info.metadata?.ipAddress) {
    info.metadata.ipAddress = 'xxx.xxx.xxx.xxx';
  }
  return info;
});

// Create the logger instance
const createLogger = () => {
  // Determine environment configuration
  const env = process.env.NODE_ENV || 'development';
  const config = loggerConfig[env];

  // Create Winston logger with custom levels
  const logger = winston.createLogger({
    levels: {
      error: 0,
      warn: 1,
      security: 1,
      audit: 1,
      info: 2,
      http: 3,
      debug: 4
    },
    defaultMeta: DEFAULT_META,
    exitOnError: config.exitOnError,
    silent: config.silent || false,
    handleExceptions: config.handleExceptions
  });

  // Configure transports based on environment
  config.transports.forEach(transport => {
    switch (transport.type) {
      case 'console':
        logger.add(new winston.transports.Console({
          level: transport.level,
          format: winston.format.combine(
            winston.format.timestamp(),
            env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
            winston.format.json()
          )
        }));
        break;

      case 'file':
        logger.add(new DailyRotateFile({
          level: transport.level,
          filename: transport.filename,
          datePattern: transport.datePattern,
          zippedArchive: transport.zippedArchive,
          maxSize: transport.maxSize,
          maxFiles: transport.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            maskPII(),
            winston.format.json()
          )
        }));
        break;

      case 'elasticsearch':
        if (env === 'production') {
          logger.add(new ElasticsearchTransport({
            level: transport.level,
            clientOpts: transport.clientOpts,
            bufferLimit: transport.bufferLimit,
            retryLimit: transport.retryLimit,
            flushInterval: transport.flushInterval,
            format: winston.format.combine(
              winston.format.timestamp(),
              maskPII(),
              winston.format.json()
            )
          }));
        }
        break;
    }
  });

  // Add error handler
  logger.on('error', (error) => {
    console.error('Logger error:', formatError(error));
  });

  return logger;
};

// Create and configure the logger instance
const logger = createLogger();

// Enhanced logging methods with type safety
export interface Logger {
  error(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  http(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  security(message: string, meta: SecurityMetadata): void;
  audit(message: string, meta: AuditMetadata): void;
}

// Export the configured logger instance
export const enhancedLogger: Logger = {
  error: (message: string, meta?: Record<string, any>) => 
    logger.error(message, { metadata: meta }),
  
  warn: (message: string, meta?: Record<string, any>) => 
    logger.warn(message, { metadata: meta }),
  
  info: (message: string, meta?: Record<string, any>) => 
    logger.info(message, { metadata: meta }),
  
  http: (message: string, meta?: Record<string, any>) => 
    logger.http(message, { metadata: meta }),
  
  debug: (message: string, meta?: Record<string, any>) => 
    logger.debug(message, { metadata: meta }),
  
  security: (message: string, meta: SecurityMetadata) => 
    logger.log('security', message, {
      metadata: {
        ...meta,
        timestamp: new Date().toISOString(),
        correlationId: Math.random().toString(36).substring(7)
      }
    }),
  
  audit: (message: string, meta: AuditMetadata) => 
    logger.log('audit', message, {
      metadata: {
        ...meta,
        timestamp: new Date().toISOString()
      }
    })
};

export default enhancedLogger;