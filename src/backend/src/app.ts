/**
 * @fileoverview Main Express application configuration for the Incepta platform
 * Implements comprehensive middleware chain, security features, and API routing
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import rateLimit from 'express-rate-limit'; // ^6.9.0
import morgan from 'morgan'; // ^1.10.0

// Import routes and middleware
import { router } from './api/routes';
import { errorHandler } from './api/middlewares/error.middleware';
import { loggingMiddleware } from './api/middlewares/logging.middleware';
import { config } from './config';
import { enhancedLogger as logger } from './lib/logger';

// Constants
const API_PREFIX = '/api/v1';
const MAX_REQUEST_SIZE = '10mb';

// Initialize Express application
const app: Express = express();

/**
 * Configure security middleware
 * Implements comprehensive security headers and controls
 */
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));

/**
 * Configure CORS with enhanced security
 * Implements strict origin validation and credential handling
 */
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

/**
 * Configure request parsing and compression
 * Implements size limits and security controls
 */
app.use(express.json({ limit: MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));
app.use(compression());

/**
 * Configure rate limiting
 * Implements protection against abuse and DoS attacks
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});

app.use(limiter);

/**
 * Configure logging middleware
 * Implements comprehensive request/response logging
 */
app.use(loggingMiddleware);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/**
 * Health check endpoint
 * Implements basic service health monitoring
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * Mount API routes
 * Implements versioned API endpoints with security middleware
 */
app.use(API_PREFIX, router);

/**
 * Configure 404 handler
 * Implements standardized handling of undefined routes
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

/**
 * Configure global error handling
 * Implements comprehensive error handling and logging
 */
app.use(errorHandler);

/**
 * Log application startup
 * Implements startup monitoring and configuration validation
 */
logger.info('Application configuration completed', {
  environment: process.env.NODE_ENV,
  security: {
    cors: true,
    helmet: true,
    rateLimiting: true
  },
  api: {
    prefix: API_PREFIX,
    maxRequestSize: MAX_REQUEST_SIZE
  }
});

// Export configured Express application
export default app;