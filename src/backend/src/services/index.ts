/**
 * @fileoverview Service Layer Entry Point
 * Centralizes and exports all service layer implementations for the Incepta platform.
 * Implements clean architecture pattern with proper separation of concerns.
 * @version 1.0.0
 */

// Import core service implementations
import { AuthService } from './auth.service';
import { GrantService } from './grant.service';
import { TechnologyService } from './technology.service';
import { MessageService } from './message.service';
import { UserService } from './user.service';

// Import required dependencies
import { S3Service } from '../lib/s3';
import { RedisCache } from '../lib/cache';
import winston from 'winston';

// Initialize shared dependencies
const s3Service = new S3Service();
const cacheService = RedisCache.getInstance();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'services.log' })
  ]
});

/**
 * Initialize service instances with required dependencies
 * Implements singleton pattern for service instances
 */
const authService = new AuthService();
const grantService = new GrantService();
const technologyService = new TechnologyService();
const messageService = new MessageService(s3Service, cacheService, logger);
const userService = new UserService();

/**
 * Export service instances for dependency injection
 * Provides centralized access to all core business logic services
 */
export {
  // Core services
  authService as AuthService,
  grantService as GrantService,
  technologyService as TechnologyService,
  messageService as MessageService,
  userService as UserService,
  
  // Service class types for type checking
  AuthService as IAuthService,
  GrantService as IGrantService,
  TechnologyService as ITechnologyService,
  MessageService as IMessageService,
  UserService as IUserService
};

/**
 * Export service factory for testing and dependency injection
 * Allows creation of service instances with custom dependencies
 */
export const createServices = (dependencies: {
  s3Service?: S3Service;
  cacheService?: RedisCache;
  logger?: winston.Logger;
}) => ({
  authService: new AuthService(),
  grantService: new GrantService(),
  technologyService: new TechnologyService(),
  messageService: new MessageService(
    dependencies.s3Service || s3Service,
    dependencies.cacheService || cacheService,
    dependencies.logger || logger
  ),
  userService: new UserService()
});

/**
 * Default export providing all services as a bundle
 * Convenient for importing all services at once
 */
export default {
  auth: authService,
  grant: grantService,
  technology: technologyService,
  message: messageService,
  user: userService
};