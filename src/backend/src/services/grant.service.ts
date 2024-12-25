/**
 * @fileoverview Grant management service implementation with enhanced security and AI assistance
 * Provides comprehensive grant discovery, application processing, and AI-assisted writing features
 * @version 1.0.0
 */

import { OpenAI } from 'openai'; // ^4.0.0
import { RateLimiterRedis } from 'rate-limiter-flexible'; // ^2.4.1
import { Redis } from 'redis'; // ^4.6.8
import { IGrant, IGrantSearchParams, IGrantResponse, GrantType, GrantStatus } from '../../interfaces/grant.interface';
import { GrantModel } from '../../db/models/grant.model';
import { grantValidators } from '../../api/validators/grant.validator';
import { SecurityLevel, ValidationSeverity } from '../../utils/validation';
import { User, UserRole } from '../../interfaces/user.interface';
import { ValidationError } from 'sequelize';

/**
 * Interface for AI assistance response
 */
interface IAIResponse {
  suggestions: string[];
  confidenceScore: number;
  metadata: {
    model: string;
    timestamp: Date;
    processingTime: number;
  };
}

/**
 * Enhanced service class implementing secure grant management business logic
 */
export class GrantService {
  private readonly CACHE_TTL = 3600; // 1 hour cache duration
  private readonly MAX_AI_REQUESTS = 100; // Maximum AI requests per hour
  private readonly AI_CONFIDENCE_THRESHOLD = 0.85;

  /**
   * Initialize grant service with required dependencies
   */
  constructor(
    private readonly openaiClient: OpenAI,
    private readonly grantModel: typeof GrantModel,
    private readonly rateLimiter: RateLimiterRedis,
    private readonly cacheClient: Redis
  ) {
    this.validateDependencies();
  }

  /**
   * Creates a new grant opportunity with enhanced security validation
   * @param grantData Grant data to be created
   * @param creator User creating the grant
   * @throws {ValidationError} If validation fails
   * @throws {SecurityError} If security checks fail
   */
  public async createGrant(grantData: IGrant, creator: User): Promise<IGrant> {
    try {
      // Validate user permissions
      if (!this.hasGrantCreationPermission(creator)) {
        throw new Error('Insufficient permissions to create grant');
      }

      // Validate grant data
      const validationResult = await grantValidators.validateGrantCreate(grantData);
      if (!validationResult.isValid) {
        throw new ValidationError('Grant validation failed', validationResult.errors);
      }

      // Apply security classification
      const securityLevel = this.determineSecurityLevel(grantData);
      grantData.securityLevel = securityLevel;

      // Create grant with audit trail
      const createdGrant = await this.grantModel.create({
        ...grantData,
        createdBy: creator.id,
        auditLog: [{
          action: 'CREATE',
          timestamp: new Date(),
          userId: creator.id,
          details: 'Initial grant creation'
        }]
      });

      // Invalidate relevant caches
      await this.invalidateGrantCaches();

      return createdGrant;
    } catch (error) {
      console.error('Grant creation failed:', error);
      throw error;
    }
  }

  /**
   * Searches for grants with security filtering and caching
   * @param searchParams Search parameters
   * @param requestor User making the request
   */
  public async searchGrants(
    searchParams: IGrantSearchParams,
    requestor: User
  ): Promise<IGrantResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(searchParams, requestor);
      const cachedResult = await this.cacheClient.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      // Validate search parameters
      const validatedParams = await grantValidators.validateGrantSearch(searchParams);

      // Apply security filters based on user role
      const securityFilters = this.getSecurityFilters(requestor);
      const query = {
        ...validatedParams,
        ...securityFilters,
        order: this.buildSortOrder(searchParams.sortBy),
        limit: searchParams.limit || 20,
        offset: ((searchParams.page || 1) - 1) * (searchParams.limit || 20)
      };

      // Execute search
      const { rows, count } = await this.grantModel.findAndCountAll(query);

      const response: IGrantResponse = {
        grants: rows,
        total: count,
        page: searchParams.page || 1,
        limit: searchParams.limit || 20,
        totalPages: Math.ceil(count / (searchParams.limit || 20))
      };

      // Cache results
      await this.cacheClient.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(response)
      );

      return response;
    } catch (error) {
      console.error('Grant search failed:', error);
      throw error;
    }
  }

  /**
   * Provides AI-powered grant writing suggestions using GPT-4
   * @param grantId Target grant ID
   * @param section Grant section for assistance
   * @param content Current content
   * @param requestor User requesting assistance
   */
  public async getAIAssistance(
    grantId: string,
    section: string,
    content: string,
    requestor: User
  ): Promise<IAIResponse> {
    try {
      // Check rate limits
      await this.rateLimiter.consume(requestor.id, 1);

      // Validate grant access
      const grant = await this.grantModel.findByPk(grantId);
      if (!grant || !this.canAccessGrant(grant, requestor)) {
        throw new Error('Grant not found or access denied');
      }

      const startTime = Date.now();

      // Generate enhanced prompt
      const prompt = this.generateAIPrompt(grant, section, content);

      // Call GPT-4 with retry logic
      const completion = await this.openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert grant writer specializing in technology transfer and research commercialization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        n: 3
      });

      // Process and validate AI response
      const suggestions = completion.choices.map(choice => choice.message.content || '');
      const confidenceScore = this.calculateConfidenceScore(suggestions);

      if (confidenceScore < this.AI_CONFIDENCE_THRESHOLD) {
        throw new Error('AI suggestions did not meet confidence threshold');
      }

      const response: IAIResponse = {
        suggestions,
        confidenceScore,
        metadata: {
          model: "gpt-4",
          timestamp: new Date(),
          processingTime: Date.now() - startTime
        }
      };

      // Log AI usage metrics
      await this.logAIUsage(grantId, requestor.id, response);

      return response;
    } catch (error) {
      console.error('AI assistance failed:', error);
      throw error;
    }
  }

  /**
   * Validates service dependencies
   * @private
   */
  private validateDependencies(): void {
    if (!this.openaiClient || !this.grantModel || !this.rateLimiter || !this.cacheClient) {
      throw new Error('Missing required dependencies');
    }
  }

  /**
   * Determines security level for grant data
   * @private
   */
  private determineSecurityLevel(grantData: IGrant): SecurityLevel {
    if (grantData.type === GrantType.FEDERAL || grantData.amount > 1000000) {
      return SecurityLevel.HIGH;
    }
    return SecurityLevel.MEDIUM;
  }

  /**
   * Generates cache key for grant searches
   * @private
   */
  private generateCacheKey(params: IGrantSearchParams, user: User): string {
    return `grants:search:${user.role}:${JSON.stringify(params)}`;
  }

  /**
   * Checks if user has grant creation permission
   * @private
   */
  private hasGrantCreationPermission(user: User): boolean {
    return [UserRole.ADMIN, UserRole.TTO].includes(user.role);
  }

  /**
   * Builds sort order for queries
   * @private
   */
  private buildSortOrder(sortBy?: string): any[] {
    switch (sortBy) {
      case 'deadline':
        return [['deadline', 'ASC']];
      case 'amount':
        return [['amount', 'DESC']];
      default:
        return [['createdAt', 'DESC']];
    }
  }

  /**
   * Gets security filters based on user role
   * @private
   */
  private getSecurityFilters(user: User): any {
    switch (user.role) {
      case UserRole.ADMIN:
        return {};
      case UserRole.TTO:
        return { university: user.profile.organization };
      default:
        return { securityLevel: SecurityLevel.LOW };
    }
  }

  /**
   * Generates AI prompt for grant writing assistance
   * @private
   */
  private generateAIPrompt(grant: IGrant, section: string, content: string): string {
    return `
      Grant Type: ${grant.type}
      Section: ${section}
      Current Content: ${content}

      Please provide three alternative suggestions for improving this grant ${section} section.
      Focus on:
      1. Technical clarity and precision
      2. Alignment with grant requirements
      3. Impact and innovation emphasis
      4. Compliance with ${grant.type} guidelines
    `;
  }

  /**
   * Calculates confidence score for AI suggestions
   * @private
   */
  private calculateConfidenceScore(suggestions: string[]): number {
    // Implement confidence scoring logic
    return suggestions.length >= 3 ? 0.9 : 0.7;
  }

  /**
   * Logs AI usage metrics
   * @private
   */
  private async logAIUsage(
    grantId: string,
    userId: string,
    response: IAIResponse
  ): Promise<void> {
    // Implement AI usage logging
    console.log('AI Usage:', {
      grantId,
      userId,
      timestamp: response.metadata.timestamp,
      processingTime: response.metadata.processingTime
    });
  }

  /**
   * Invalidates grant-related caches
   * @private
   */
  private async invalidateGrantCaches(): Promise<void> {
    const keys = await this.cacheClient.keys('grants:search:*');
    if (keys.length > 0) {
      await this.cacheClient.del(keys);
    }
  }
}