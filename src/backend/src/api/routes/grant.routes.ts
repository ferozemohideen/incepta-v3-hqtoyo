/**
 * @fileoverview Express router configuration for grant-related API endpoints
 * Implements comprehensive grant discovery, application, and AI assistance features
 * with enhanced security controls and error handling
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { GrantController } from '../controllers/grant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';
import { UserRole } from '../../constants/roles';

// Initialize router
const router = Router();

// Initialize grant controller
const grantController = new GrantController();

/**
 * Rate limiter for grant search endpoints
 * Implements Technical Specification 7.3 Security Protocols
 */
const searchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many grant search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for grant applications
 * More restrictive due to resource intensity
 */
const applicationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 applications per hour
  message: 'Too many grant applications, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for AI assistance
 * Balanced between usability and resource protection
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 AI requests per hour
  message: 'AI assistance request limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Circuit breaker for AI service
 * Prevents cascade failures from AI service issues
 */
const aiCircuitBreaker = new CircuitBreaker({
  timeout: 5000, // 5 second timeout
  errorThreshold: 50, // Trip after 50% failures
  resetTimeout: 30000, // Reset after 30 seconds
});

/**
 * @route   GET /api/grants/search
 * @desc    Search for grants with comprehensive filtering
 * @access  Private
 */
router.get('/search',
  authenticate,
  searchRateLimiter,
  validateRequest({
    type: 'grant',
    location: 'query',
    stripUnknown: true
  }),
  grantController.searchGrants
);

/**
 * @route   GET /api/grants/:id
 * @desc    Get detailed information about a specific grant
 * @access  Private
 */
router.get('/:id',
  authenticate,
  validateRequest({
    type: 'grant',
    location: 'params',
    stripUnknown: true
  }),
  grantController.getGrantById
);

/**
 * @route   POST /api/grants
 * @desc    Create a new grant opportunity
 * @access  Private - Admin/TTO only
 */
router.post('/',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TTO]),
  validateRequest({
    type: 'grant',
    location: 'body',
    stripUnknown: true
  }),
  grantController.createGrant
);

/**
 * @route   PUT /api/grants/:id
 * @desc    Update an existing grant
 * @access  Private - Admin/TTO only
 */
router.put('/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TTO]),
  validateRequest({
    type: 'grant',
    location: 'body',
    stripUnknown: true
  }),
  grantController.updateGrant
);

/**
 * @route   POST /api/grants/:id/apply
 * @desc    Submit a grant application with enhanced validation
 * @access  Private
 */
router.post('/:id/apply',
  authenticate,
  applicationRateLimiter,
  validateRequest({
    type: 'grant',
    location: 'body',
    stripUnknown: true
  }),
  grantController.submitApplication
);

/**
 * @route   POST /api/grants/:id/ai-assist
 * @desc    Get AI-powered grant writing assistance
 * @access  Private
 */
router.post('/:id/ai-assist',
  authenticate,
  aiRateLimiter,
  (req, res, next) => {
    aiCircuitBreaker.fire(async () => {
      await grantController.getAIAssistance(req, res, next);
    }).catch(next);
  },
  validateRequest({
    type: 'grant',
    location: 'body',
    stripUnknown: true
  })
);

export default router;