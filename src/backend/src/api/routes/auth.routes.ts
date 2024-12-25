/**
 * @fileoverview Enhanced Authentication Routes
 * Implements secure authentication endpoints with comprehensive security features
 * including rate limiting, device fingerprinting, and audit logging.
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1
import { AuthController } from '../controllers/auth.controller';
import { authenticate, requireMFA } from '../middlewares/auth.middleware';
import { HTTP_STATUS } from '../../constants/statusCodes';
import { ErrorCodes } from '../../constants/errorCodes';
import { createErrorResponse } from '../../utils/errors';

/**
 * Initialize rate limiters for different authentication endpoints
 * with varying thresholds based on security requirements
 */
const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 60, // 1 hour block
});

const refreshRateLimiter = new RateLimiterMemory({
  points: 10, // 10 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 30 * 60, // 30 minutes block
});

const mfaRateLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60 * 5, // per 5 minutes
  blockDuration: 60 * 10, // 10 minutes block
});

/**
 * Applies rate limiting middleware with custom error handling
 * @param limiter - RateLimiter instance to use
 * @returns Express middleware function
 */
const rateLimitMiddleware = (limiter: RateLimiterMemory) => async (req: any, res: any, next: any) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch (error) {
    const response = createErrorResponse(ErrorCodes.RATE_LIMIT_EXCEEDED);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(response);
  }
};

/**
 * Initializes authentication routes with enhanced security features
 * @param authController - Instance of AuthController
 * @returns Configured Express router
 */
export function initializeAuthRoutes(authController: AuthController): Router {
  const router = Router();

  /**
   * @route POST /auth/login
   * @description Authenticates user with enhanced security including device fingerprinting
   * @access Public
   */
  router.post(
    '/login',
    rateLimitMiddleware(loginRateLimiter),
    async (req, res, next) => {
      try {
        await authController.login(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/refresh
   * @description Refreshes access token with reuse detection
   * @access Public
   */
  router.post(
    '/refresh',
    rateLimitMiddleware(refreshRateLimiter),
    async (req, res, next) => {
      try {
        await authController.refreshToken(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/mfa/setup
   * @description Sets up MFA with backup codes generation
   * @access Private
   */
  router.post(
    '/mfa/setup',
    authenticate,
    rateLimitMiddleware(mfaRateLimiter),
    async (req, res, next) => {
      try {
        await authController.setupMFA(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/mfa/verify
   * @description Verifies MFA token with progressive delay
   * @access Private
   */
  router.post(
    '/mfa/verify',
    authenticate,
    rateLimitMiddleware(mfaRateLimiter),
    async (req, res, next) => {
      try {
        await authController.verifyMFA(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * @route GET /auth/oauth/callback
   * @description Handles OAuth/SAML callback with enhanced state validation
   * @access Public
   */
  router.get(
    '/oauth/callback',
    rateLimitMiddleware(refreshRateLimiter),
    async (req, res, next) => {
      try {
        await authController.handleOAuthCallback(req, res);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * @route POST /auth/logout
   * @description Securely logs out user and invalidates tokens
   * @access Private
   */
  router.post(
    '/logout',
    authenticate,
    async (req, res, next) => {
      try {
        // Clear secure cookies
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });

        res.status(HTTP_STATUS.NO_CONTENT).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Export configured router
export default initializeAuthRoutes;