/**
 * @fileoverview Enhanced User Routes Implementation
 * Implements secure API routes for user management with RBAC, validation, and audit logging
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { UserRole } from '../../constants/roles';
import { HTTP_STATUS } from '../../constants/statusCodes';

/**
 * Enhanced User Router class with comprehensive security features
 */
export class UserRouter {
  private router: Router;
  private userController: UserController;

  // Rate limiter for user management endpoints
  private readonly userRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiter for sensitive operations
  private readonly sensitiveOpRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 requests per window
    message: 'Too many sensitive operations, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  constructor(userController: UserController) {
    this.router = express.Router();
    this.userController = userController;
    this.configureMiddleware();
    this.configureRoutes();
  }

  /**
   * Configures global middleware for the user routes
   */
  private configureMiddleware(): void {
    // Security headers
    this.router.use(helmet());

    // Global rate limiting
    this.router.use(this.userRateLimiter);

    // Parse JSON payloads
    this.router.use(express.json({ limit: '10kb' }));
  }

  /**
   * Configures all user management routes with security middleware
   */
  private configureRoutes(): void {
    // Create new user (Admin/TTO only)
    this.router.post(
      '/',
      authenticate,
      authorize([UserRole.ADMIN, UserRole.TTO], ['MANAGE_USERS']),
      validateRequest({
        type: 'USER',
        location: 'body',
        stripUnknown: true,
      }),
      this.userController.createUser
    );

    // Get user by ID (Self or Admin)
    this.router.get(
      '/:id',
      authenticate,
      authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
      this.userController.getUser
    );

    // Update user (Self or Admin)
    this.router.put(
      '/:id',
      authenticate,
      authorize([UserRole.ADMIN], ['MANAGE_USERS']),
      this.sensitiveOpRateLimiter,
      validateRequest({
        type: 'USER',
        location: 'body',
        stripUnknown: true,
      }),
      this.userController.updateUser
    );

    // Delete user (Admin only)
    this.router.delete(
      '/:id',
      authenticate,
      authorize([UserRole.ADMIN], ['MANAGE_USERS']),
      this.sensitiveOpRateLimiter,
      this.userController.deleteUser
    );

    // Update user profile (Self or Admin)
    this.router.put(
      '/:id/profile',
      authenticate,
      authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
      validateRequest({
        type: 'USER',
        location: 'body',
        stripUnknown: true,
      }),
      this.userController.updateProfile
    );

    // Update user preferences (Self only)
    this.router.put(
      '/:id/preferences',
      authenticate,
      validateRequest({
        type: 'USER',
        location: 'body',
        stripUnknown: true,
      }),
      this.userController.updatePreferences
    );
  }

  /**
   * Returns the configured router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create and configure a new UserRouter instance
 * @param userController - Instance of UserController
 * @returns Configured Express router
 */
export function createUserRouter(userController: UserController): Router {
  const userRouter = new UserRouter(userController);
  return userRouter.getRouter();
}

export default createUserRouter;