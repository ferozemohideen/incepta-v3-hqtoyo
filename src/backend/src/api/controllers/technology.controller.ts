import { Request, Response } from 'express'; // Version: 4.18.2
import { injectable, inject } from 'inversify'; // Version: 6.0.1
import { StatusCodes } from 'http-status-codes'; // Version: 2.2.0
import { rateLimit } from 'express-rate-limit'; // Version: 6.7.0

import { TechnologyService } from '../../services/technology.service';
import { 
  Technology, 
  TechnologySearchParams, 
  SecurityClassification 
} from '../../interfaces/technology.interface';

/**
 * Controller handling technology transfer listings with enhanced security and performance
 * Implements comprehensive CRUD operations with caching and access control
 */
@injectable()
export class TechnologyController {
  constructor(
    @inject('TechnologyService') private readonly technologyService: TechnologyService
  ) {}

  /**
   * Create new technology listing with security validation
   * @param req Request with technology data and security context
   * @param res Response object
   */
  @rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // limit each IP to 50 create requests per window
  })
  public async createTechnology(req: Request, res: Response): Promise<Response> {
    try {
      const securityContext = {
        userId: req.user?.id,
        roles: req.user?.roles || []
      };

      // Validate security context
      await this.technologyService.checkPermissions(securityContext);

      // Validate data classification
      await this.technologyService.validateDataClassification(req.body);

      const technology = await this.technologyService.createTechnology(
        req.body,
        securityContext
      );

      // Log security event
      await this.technologyService.logSecurityEvent({
        action: 'CREATE',
        resourceId: technology.id,
        userId: securityContext.userId,
        roles: securityContext.roles
      });

      return res.status(StatusCodes.CREATED).json(technology);
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: error.message
      });
    }
  }

  /**
   * Retrieve technology by ID with security filtering
   * @param req Request with technology ID
   * @param res Response object
   */
  public async getTechnology(req: Request, res: Response): Promise<Response> {
    try {
      const securityContext = {
        userId: req.user?.id,
        roles: req.user?.roles || []
      };

      const technology = await this.technologyService.getTechnology(
        req.params.id,
        securityContext
      );

      if (!technology) {
        return res.status(StatusCodes.NOT_FOUND).json({
          error: 'Technology not found'
        });
      }

      return res.status(StatusCodes.OK).json(technology);
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: error.message
      });
    }
  }

  /**
   * Search technologies with security filtering and caching
   * @param req Request with search parameters
   * @param res Response object
   */
  @rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 search requests per window
  })
  public async searchTechnologies(req: Request, res: Response): Promise<Response> {
    try {
      const searchParams: TechnologySearchParams = {
        query: req.query.q as string,
        universities: req.query.universities as string[],
        patentStatus: req.query.patentStatus as any[],
        trlRange: req.query.trlRange as any,
        domains: req.query.domains as string[],
        securityLevels: req.query.securityLevels as SecurityClassification[],
        dateRange: req.query.dateRange as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as any
      };

      const securityContext = {
        userId: req.user?.id,
        roles: req.user?.roles || []
      };

      const results = await this.technologyService.searchTechnologies(
        searchParams,
        securityContext
      );

      return res.status(StatusCodes.OK).json(results);
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: error.message
      });
    }
  }

  /**
   * Update technology with security validation
   * @param req Request with update data
   * @param res Response object
   */
  @rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // limit each IP to 50 update requests per window
  })
  public async updateTechnology(req: Request, res: Response): Promise<Response> {
    try {
      const securityContext = {
        userId: req.user?.id,
        roles: req.user?.roles || []
      };

      // Validate security context and permissions
      await this.technologyService.checkPermissions(securityContext);

      // Validate data classification for update
      await this.technologyService.validateDataClassification(req.body);

      const technology = await this.technologyService.updateTechnology(
        req.params.id,
        req.body,
        securityContext
      );

      // Log security event
      await this.technologyService.logSecurityEvent({
        action: 'UPDATE',
        resourceId: req.params.id,
        userId: securityContext.userId,
        roles: securityContext.roles,
        modifiedFields: Object.keys(req.body)
      });

      return res.status(StatusCodes.OK).json(technology);
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: error.message
      });
    }
  }

  /**
   * Delete technology with security validation
   * @param req Request with technology ID
   * @param res Response object
   */
  @rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30 // limit each IP to 30 delete requests per window
  })
  public async deleteTechnology(req: Request, res: Response): Promise<Response> {
    try {
      const securityContext = {
        userId: req.user?.id,
        roles: req.user?.roles || []
      };

      // Validate security context and permissions
      await this.technologyService.checkPermissions(securityContext);

      await this.technologyService.deleteTechnology(
        req.params.id,
        securityContext
      );

      // Log security event
      await this.technologyService.logSecurityEvent({
        action: 'DELETE',
        resourceId: req.params.id,
        userId: securityContext.userId,
        roles: securityContext.roles
      });

      return res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: error.message
      });
    }
  }
}