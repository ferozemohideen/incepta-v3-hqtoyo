/**
 * @fileoverview Technology routes configuration with comprehensive security and monitoring
 * Implements secure, scalable and monitored routes for technology discovery and management
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import prometheusMiddleware from 'express-prometheus-middleware'; // v1.2.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import cacheControl from 'express-cache-controller'; // v1.1.0

import { TechnologyController } from '../controllers/technology.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  validateCreateTechnology,
  validateUpdateTechnology,
  validateTechnologySearch
} from '../validators/technology.validator';
import { UserRole } from '../../constants/roles';
import { HTTP_STATUS } from '../../constants/statusCodes';

/**
 * Configures and returns Express router with technology endpoints
 * Implements comprehensive middleware chains for security, performance and monitoring
 * @param controller - Technology controller instance
 * @returns Configured Express router
 */
export function configureRoutes(controller: TechnologyController): Router {
  const router = Router();

  // Configure Prometheus monitoring
  router.use(prometheusMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5],
    prefix: 'technology_'
  }));

  // Health check endpoint
  router.get('/health', (_, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'healthy' });
  });

  // Configure rate limiters
  const searchRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many search requests, please try again later'
  });

  const mutationRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many modification requests, please try again later'
  });

  // Configure caching for GET endpoints
  const cacheConfig = {
    public: true,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60 // 1 minute grace period
  };

  // Public routes with rate limiting and caching
  router.get('/search',
    searchRateLimit,
    cacheControl(cacheConfig),
    validateTechnologySearch,
    controller.searchTechnologies
  );

  router.get('/:id',
    searchRateLimit,
    cacheControl(cacheConfig),
    controller.getTechnology
  );

  // Protected routes with comprehensive security middleware
  router.post('/',
    mutationRateLimit,
    authenticate,
    authorize([UserRole.TTO, UserRole.ADMIN], ['MANAGE_OWN_TECHNOLOGIES']),
    validateCreateTechnology,
    controller.createTechnology
  );

  router.put('/:id',
    mutationRateLimit,
    authenticate,
    authorize([UserRole.TTO, UserRole.ADMIN], ['MANAGE_OWN_TECHNOLOGIES']),
    validateUpdateTechnology,
    controller.updateTechnology
  );

  router.delete('/:id',
    mutationRateLimit,
    authenticate,
    authorize([UserRole.TTO, UserRole.ADMIN], ['MANAGE_OWN_TECHNOLOGIES']),
    controller.deleteTechnology
  );

  // Protected metrics endpoint
  router.get('/metrics',
    authenticate,
    authorize([UserRole.ADMIN], ['VIEW_ALL_ANALYTICS']),
    (_, res) => {
      res.set('Content-Type', prometheusMiddleware.metricsContentType);
      // Metrics collection handled by prometheus middleware
    }
  );

  // Error handling middleware
  router.use((err, req, res, next) => {
    console.error('Technology Route Error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id
    });

    res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    });
  });

  return router;
}

// Export configured router
export default configureRoutes;