/**
 * @fileoverview Main API router configuration with comprehensive security and monitoring
 * Implements versioned API routes with security middleware, caching, and performance optimization
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^6.9.0
import swaggerUi from 'swagger-ui-express'; // ^5.0.0

// Import route handlers
import { initializeAuthRoutes } from './auth.routes';
import { configureRoutes as configureTechnologyRoutes } from './technology.routes';
import { default as grantRouter } from './grant.routes';

// Import middleware
import { errorHandler } from '../middlewares/error.middleware';
import { loggingMiddleware } from '../middlewares/logging.middleware';
import { enhancedLogger as logger } from '../../lib/logger';

/**
 * Configures and returns the main Express router with all API routes
 * Implements comprehensive security, monitoring, and performance features
 */
export function configureRoutes(): Router {
  const router = Router();

  // Security middleware
  router.use(helmet({
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

  // CORS configuration
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Performance optimization
  router.use(compression());

  // Request tracking
  router.use(loggingMiddleware);

  // Rate limiting configuration
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later'
  });

  // Health check endpoint
  router.get('/health', (_, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // API Documentation
  if (process.env.NODE_ENV !== 'production') {
    const swaggerSpec = require('../../docs/swagger.json');
    router.use('/docs', swaggerUi.serve);
    router.get('/docs', swaggerUi.setup(swaggerSpec));
  }

  // API version prefix
  const v1Router = Router();

  // Mount versioned routes
  v1Router.use('/auth', apiLimiter, initializeAuthRoutes());
  v1Router.use('/technologies', apiLimiter, configureTechnologyRoutes());
  v1Router.use('/grants', apiLimiter, grantRouter);

  // Mount v1 router
  router.use('/v1', v1Router);

  // Global error handling
  router.use(errorHandler);

  // Log router configuration
  logger.info('API routes configured', {
    routes: ['/v1/auth', '/v1/technologies', '/v1/grants'],
    security: {
      helmet: true,
      cors: true,
      rateLimiting: true
    },
    monitoring: {
      logging: true,
      errorHandling: true
    }
  });

  return router;
}

// Export configured router
export default configureRoutes();