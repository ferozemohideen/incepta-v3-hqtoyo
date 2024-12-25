/**
 * @fileoverview Enhanced User Controller Implementation
 * Handles HTTP requests for user management with comprehensive security features
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { UserService } from '../../services/user.service';
import { User, UserProfile, UserPreferences, UserSecurity } from '../../interfaces/user.interface';
import { UserRole, Permission, hasPermission } from '../../constants/roles';
import { AuditLog } from '../../utils/audit';
import { RateLimiter } from '../../utils/rate-limiter';
import { ValidationError } from 'sequelize';

/**
 * Custom error type for controller operations
 */
class UserControllerError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'UserControllerError';
  }
}

/**
 * Enhanced User Controller with comprehensive security features
 */
export class UserController {
  private userService: UserService;
  private rateLimiter: RateLimiter;

  constructor(userService: UserService) {
    this.userService = userService;
    this.rateLimiter = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    });
  }

  /**
   * Creates a new user with enhanced security validation
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Rate limiting check
      await this.rateLimiter.checkLimit(req);

      // Validate request body
      const { email, password, name, role, profile } = req.body;

      if (!email || !password || !name || !role) {
        throw new UserControllerError('Missing required fields', 400);
      }

      // Validate user role permissions
      if (!Object.values(UserRole).includes(role)) {
        throw new UserControllerError('Invalid user role', 400);
      }

      // Only admins can create TTO or admin users
      if (
        (role === UserRole.ADMIN || role === UserRole.TTO) &&
        (!req.user || !hasPermission(req.user.role, 'MANAGE_USERS'))
      ) {
        throw new UserControllerError('Insufficient permissions', 403);
      }

      // Create user with validated data
      const user = await this.userService.createUser({
        email,
        password,
        name,
        role,
        profile: profile || {},
        preferences: {
          emailNotifications: true,
          theme: 'light',
          language: 'en',
          timezone: 'UTC'
        }
      });

      // Log user creation
      await AuditLog.create({
        action: 'CREATE_USER',
        userId: req.user?.id,
        targetId: user.id,
        details: {
          email: user.email,
          role: user.role
        }
      });

      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves user details with proper authorization checks
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public getUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.rateLimiter.checkLimit(req);

      const { id } = req.params;

      // Validate authorization
      if (
        !req.user ||
        (req.user.id !== id && !hasPermission(req.user.role, 'MANAGE_USERS'))
      ) {
        throw new UserControllerError('Unauthorized access', 403);
      }

      const user = await this.userService.getUserById(id);
      if (!user) {
        throw new UserControllerError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates user profile with enhanced validation
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.rateLimiter.checkLimit(req);

      const { id } = req.params;
      const profile: UserProfile = req.body;

      // Validate authorization
      if (
        !req.user ||
        (req.user.id !== id && !hasPermission(req.user.role, 'MANAGE_USERS'))
      ) {
        throw new UserControllerError('Unauthorized access', 403);
      }

      // Validate profile data
      if (!profile.organization || !profile.title) {
        throw new UserControllerError('Missing required profile fields', 400);
      }

      const updatedUser = await this.userService.updateUserProfile(id, profile);

      await AuditLog.create({
        action: 'UPDATE_USER_PROFILE',
        userId: req.user.id,
        targetId: id,
        details: { fields: Object.keys(profile) }
      });

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates user preferences
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.rateLimiter.checkLimit(req);

      const { id } = req.params;
      const preferences: UserPreferences = req.body;

      // Validate authorization
      if (!req.user || req.user.id !== id) {
        throw new UserControllerError('Unauthorized access', 403);
      }

      const updatedUser = await this.userService.updateUserPreferences(
        id,
        preferences
      );

      await AuditLog.create({
        action: 'UPDATE_USER_PREFERENCES',
        userId: req.user.id,
        targetId: id,
        details: { fields: Object.keys(preferences) }
      });

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates user security settings with enhanced validation
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public updateSecurity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.rateLimiter.checkLimit(req);

      const { id } = req.params;
      const securityData: Partial<UserSecurity> = req.body;

      // Validate authorization
      if (!req.user || req.user.id !== id) {
        throw new UserControllerError('Unauthorized access', 403);
      }

      const updatedUser = await this.userService.updateUserSecurity(
        id,
        securityData
      );

      await AuditLog.create({
        action: 'UPDATE_USER_SECURITY',
        userId: req.user.id,
        targetId: id,
        details: {
          mfaUpdated: typeof securityData.mfaEnabled !== 'undefined'
        }
      });

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a user with proper authorization
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.rateLimiter.checkLimit(req);

      const { id } = req.params;

      // Validate authorization
      if (!req.user || !hasPermission(req.user.role, 'MANAGE_USERS')) {
        throw new UserControllerError('Unauthorized access', 403);
      }

      // Prevent deletion of admin users by non-admins
      const targetUser = await this.userService.getUserById(id);
      if (
        targetUser?.role === UserRole.ADMIN &&
        req.user.role !== UserRole.ADMIN
      ) {
        throw new UserControllerError('Cannot delete admin users', 403);
      }

      await this.userService.deleteUser(id);

      await AuditLog.create({
        action: 'DELETE_USER',
        userId: req.user.id,
        targetId: id,
        details: { deletedRole: targetUser?.role }
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export default UserController;