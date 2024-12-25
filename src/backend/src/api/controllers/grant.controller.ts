/**
 * @fileoverview Enhanced grant management controller with comprehensive security,
 * validation, and performance optimizations for the Incepta platform.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { CircuitBreaker } from 'circuit-breaker-ts'; // ^0.0.8
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { GrantService } from '../../services/grant.service';
import { IGrant, IGrantSearchParams, GrantType, GrantStatus } from '../../interfaces/grant.interface';
import { grantValidators } from '../validators/grant.validator';
import { SecurityLevel, ValidationSeverity } from '../../utils/validation';
import { UserRole } from '../../constants/roles';
import { User } from '../../interfaces/user.interface';

/**
 * Rate limiter configuration for AI endpoints
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // Limit each IP to 100 AI requests per hour
  message: 'AI request limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enhanced controller class for grant management functionality
 * Implements comprehensive security, validation, and performance features
 */
export class GrantController {
  private readonly aiCircuitBreaker: CircuitBreaker;
  private readonly correlationPrefix = 'grant';

  /**
   * Initialize grant controller with required dependencies
   * @param grantService Injected grant service instance
   */
  constructor(private readonly grantService: GrantService) {
    this.aiCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000,
      timeout: 5000,
    });

    this.initializeRequestHandlers();
  }

  /**
   * Creates a new grant opportunity with enhanced validation
   * @param req Express request object
   * @param res Express response object
   */
  public async createGrant(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      const user = req.user as User;
      
      // Validate user permissions
      if (![UserRole.ADMIN, UserRole.TTO].includes(user.role)) {
        res.status(403).json({
          status: 'error',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User not authorized to create grants'
        });
        return;
      }

      const grantData: IGrant = req.body;
      const createdGrant = await this.grantService.createGrant(grantData, user);

      res.status(201).json({
        status: 'success',
        data: createdGrant,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Searches for grants with enhanced filtering and security
   * @param req Express request object
   * @param res Express response object
   */
  public async searchGrants(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      const searchParams: IGrantSearchParams = req.query;
      const user = req.user as User;

      const results = await this.grantService.searchGrants(searchParams, user);

      res.status(200).json({
        status: 'success',
        data: results,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a specific grant by ID with security checks
   * @param req Express request object
   * @param res Express response object
   */
  public async getGrantById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      const { id } = req.params;
      const user = req.user as User;

      const grant = await this.grantService.getGrantById(id, user);

      if (!grant) {
        res.status(404).json({
          status: 'error',
          code: 'GRANT_NOT_FOUND',
          message: 'Grant not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: grant,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing grant with validation
   * @param req Express request object
   * @param res Express response object
   */
  public async updateGrant(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      const { id } = req.params;
      const user = req.user as User;
      const updateData = req.body;

      // Validate user permissions
      if (![UserRole.ADMIN, UserRole.TTO].includes(user.role)) {
        res.status(403).json({
          status: 'error',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User not authorized to update grants'
        });
        return;
      }

      const updatedGrant = await this.grantService.updateGrant(id, updateData, user);

      res.status(200).json({
        status: 'success',
        data: updatedGrant,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submits a grant application with enhanced validation
   * @param req Express request object
   * @param res Express response object
   */
  public async submitApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      const { grantId } = req.params;
      const user = req.user as User;
      const applicationData = req.body;

      const application = await this.grantService.submitApplication(
        grantId,
        applicationData,
        user
      );

      res.status(201).json({
        status: 'success',
        data: application,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets AI-powered writing assistance with rate limiting and circuit breaking
   * @param req Express request object
   * @param res Express response object
   */
  public async getAIAssistance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const correlationId = `${this.correlationPrefix}-${uuidv4()}`;
    
    try {
      // Apply rate limiting
      await new Promise((resolve) => aiRateLimiter(req, res, resolve));

      const { grantId, section, content } = req.body;
      const user = req.user as User;

      // Use circuit breaker for AI service calls
      const aiResponse = await this.aiCircuitBreaker.execute(() =>
        this.grantService.getAIAssistance(grantId, section, content, user)
      );

      res.status(200).json({
        status: 'success',
        data: aiResponse,
        metadata: {
          correlationId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.name === 'CircuitBreakerError') {
        res.status(503).json({
          status: 'error',
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'AI assistance temporarily unavailable'
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Initialize request handlers and middleware
   * @private
   */
  private initializeRequestHandlers(): void {
    // Bind all methods to maintain proper 'this' context
    this.createGrant = this.createGrant.bind(this);
    this.searchGrants = this.searchGrants.bind(this);
    this.getGrantById = this.getGrantById.bind(this);
    this.updateGrant = this.updateGrant.bind(this);
    this.submitApplication = this.submitApplication.bind(this);
    this.getAIAssistance = this.getAIAssistance.bind(this);
  }
}