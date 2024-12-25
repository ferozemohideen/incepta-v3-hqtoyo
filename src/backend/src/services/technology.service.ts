import { injectable, inject } from 'inversify'; // Version: ^6.0.1
import { Client } from '@elastic/elasticsearch'; // Version: 8.9.0
import { Transaction } from 'sequelize'; // Version: 6.32.1
import Redis from 'ioredis'; // Version: 5.3.2
import { v4 as uuidv4 } from 'uuid'; // Version: 9.0.0

import {
  Technology,
  TechnologySearchParams,
  SecurityClassification,
  SortOptions,
  SearchResultMetadata
} from '../../interfaces/technology.interface';
import TechnologyModel from '../../db/models/technology.model';

const CACHE_TTL = 3600; // 1 hour cache TTL
const SEARCH_TIMEOUT = 2000; // 2 second search timeout

/**
 * Service class implementing secure technology management and search functionality
 * Implements comprehensive data handling with security, caching, and audit logging
 */
@injectable()
export class TechnologyService {
  constructor(
    @inject('ElasticsearchClient') private readonly esClient: Client,
    @inject('DatabaseTransaction') private readonly transaction: Transaction,
    @inject('RedisClient') private readonly cacheClient: Redis
  ) {}

  /**
   * Creates a new technology listing with security validation and audit logging
   * @param technologyData - Technology data to create
   * @param securityContext - Security context for authorization
   * @returns Created technology with metadata
   */
  public async createTechnology(
    technologyData: Omit<Technology, 'id' | 'createdAt' | 'updatedAt'>,
    securityContext: { userId: string; roles: string[] }
  ): Promise<Technology> {
    // Validate security context
    if (!this.validateSecurityContext(securityContext)) {
      throw new Error('Insufficient permissions to create technology listing');
    }

    try {
      const result = await this.transaction.transaction(async (t) => {
        // Create technology record with UUID
        const technology = await TechnologyModel.create(
          {
            ...technologyData,
            id: uuidv4(),
            createdById: securityContext.userId,
            auditLog: [{
              timestamp: new Date(),
              action: 'CREATE',
              userId: securityContext.userId,
              roles: securityContext.roles
            }]
          },
          { transaction: t }
        );

        // Index in Elasticsearch with security metadata
        await this.esClient.index({
          index: 'technologies',
          id: technology.id,
          document: {
            ...technology.toJSON(),
            securityMetadata: {
              classification: technology.securityClassification,
              allowedRoles: this.determineAllowedRoles(technology.securityClassification)
            }
          },
          refresh: true
        });

        // Invalidate relevant caches
        await this.invalidateRelatedCaches(technology.university);

        return technology;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to create technology: ${error.message}`);
    }
  }

  /**
   * Searches for technologies with security filtering and caching
   * @param searchParams - Search parameters and filters
   * @param securityContext - Security context for authorization
   * @returns Filtered and paginated search results
   */
  public async searchTechnologies(
    searchParams: TechnologySearchParams,
    securityContext: { userId: string; roles: string[] }
  ): Promise<{ items: Technology[]; metadata: SearchResultMetadata }> {
    const cacheKey = this.generateCacheKey(searchParams, securityContext);
    
    // Check cache first
    const cachedResults = await this.cacheClient.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }

    try {
      // Build secure Elasticsearch query
      const esQuery = this.buildSecureSearchQuery(searchParams, securityContext);

      // Execute search with timeout
      const searchResult = await this.esClient.search({
        index: 'technologies',
        body: esQuery,
        timeout: `${SEARCH_TIMEOUT}ms`
      });

      // Process and filter results
      const items = searchResult.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      })) as Technology[];

      const metadata: SearchResultMetadata = {
        total: searchResult.hits.total as number,
        page: searchParams.page || 1,
        limit: searchParams.limit || 10,
        totalPages: Math.ceil((searchResult.hits.total as number) / (searchParams.limit || 10))
      };

      const results = { items, metadata };

      // Cache results
      await this.cacheClient.setex(
        cacheKey,
        CACHE_TTL,
        JSON.stringify(results)
      );

      return results;
    } catch (error) {
      throw new Error(`Search operation failed: ${error.message}`);
    }
  }

  /**
   * Updates an existing technology listing with security validation
   * @param id - Technology ID to update
   * @param updateData - Updated technology data
   * @param securityContext - Security context for authorization
   * @returns Updated technology
   */
  public async updateTechnology(
    id: string,
    updateData: Partial<Technology>,
    securityContext: { userId: string; roles: string[] }
  ): Promise<Technology> {
    try {
      const technology = await TechnologyModel.findByPk(id);
      
      if (!technology) {
        throw new Error('Technology not found');
      }

      // Validate security context for update
      if (!this.canModifyTechnology(technology, securityContext)) {
        throw new Error('Insufficient permissions to update technology');
      }

      const result = await this.transaction.transaction(async (t) => {
        // Update technology with audit log
        const updated = await technology.update(
          {
            ...updateData,
            auditLog: [
              ...technology.auditLog,
              {
                timestamp: new Date(),
                action: 'UPDATE',
                userId: securityContext.userId,
                roles: securityContext.roles,
                modifiedFields: Object.keys(updateData)
              }
            ]
          },
          { transaction: t }
        );

        // Update Elasticsearch index
        await this.esClient.update({
          index: 'technologies',
          id: technology.id,
          doc: {
            ...updated.toJSON(),
            securityMetadata: {
              classification: updated.securityClassification,
              allowedRoles: this.determineAllowedRoles(updated.securityClassification)
            }
          },
          refresh: true
        });

        // Invalidate caches
        await this.invalidateRelatedCaches(technology.university);

        return updated;
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to update technology: ${error.message}`);
    }
  }

  /**
   * Validates security context against required permissions
   * @param securityContext - Security context to validate
   * @returns Validation result
   */
  private validateSecurityContext(
    securityContext: { userId: string; roles: string[] }
  ): boolean {
    return securityContext.roles.some(role => 
      ['ADMIN', 'TTO_MANAGER', 'TECHNOLOGY_EDITOR'].includes(role)
    );
  }

  /**
   * Builds secure Elasticsearch query with security filters
   * @param params - Search parameters
   * @param securityContext - Security context for filtering
   * @returns Elasticsearch query object
   */
  private buildSecureSearchQuery(
    params: TechnologySearchParams,
    securityContext: { userId: string; roles: string[] }
  ): any {
    const { query, universities, patentStatus, trlRange, domains, securityLevels, dateRange, page = 1, limit = 10, sortBy = SortOptions.RELEVANCE } = params;

    return {
      query: {
        bool: {
          must: [
            query ? {
              multi_match: {
                query,
                fields: ['title^3', 'description^2', 'domains', 'university'],
                fuzziness: 'AUTO'
              }
            } : { match_all: {} },
            {
              terms: {
                'securityMetadata.allowedRoles': securityContext.roles
              }
            }
          ],
          filter: [
            universities && { terms: { university: universities } },
            patentStatus && { terms: { patentStatus } },
            domains && { terms: { domains } },
            securityLevels && { terms: { securityClassification: securityLevels } },
            trlRange && {
              range: {
                trl: {
                  gte: trlRange.min,
                  lte: trlRange.max
                }
              }
            },
            dateRange && {
              range: {
                createdAt: {
                  gte: dateRange.start,
                  lte: dateRange.end
                }
              }
            }
          ].filter(Boolean)
        }
      },
      sort: this.buildSortClause(sortBy),
      from: (page - 1) * limit,
      size: limit,
      _source: { excludes: ['auditLog'] }
    };
  }

  /**
   * Builds sort clause for Elasticsearch query
   * @param sortBy - Sort option
   * @returns Sort clause
   */
  private buildSortClause(sortBy: SortOptions): any[] {
    switch (sortBy) {
      case SortOptions.DATE_DESC:
        return [{ createdAt: 'desc' }];
      case SortOptions.TRL_DESC:
        return [{ trl: 'desc' }];
      case SortOptions.UNIVERSITY:
        return [{ university: 'asc' }];
      case SortOptions.RELEVANCE:
      default:
        return [{ _score: 'desc' }];
    }
  }

  /**
   * Determines allowed roles based on security classification
   * @param classification - Security classification
   * @returns Array of allowed roles
   */
  private determineAllowedRoles(classification: SecurityClassification): string[] {
    const baseRoles = ['ADMIN', 'TTO_MANAGER'];
    
    switch (classification) {
      case SecurityClassification.PUBLIC:
        return [...baseRoles, 'RESEARCHER', 'ENTREPRENEUR'];
      case SecurityClassification.INTERNAL:
        return [...baseRoles, 'TECHNOLOGY_EDITOR', 'RESEARCHER'];
      case SecurityClassification.CONFIDENTIAL:
        return [...baseRoles, 'TECHNOLOGY_EDITOR'];
      case SecurityClassification.RESTRICTED:
        return baseRoles;
      default:
        return baseRoles;
    }
  }

  /**
   * Generates cache key for search results
   * @param params - Search parameters
   * @param securityContext - Security context
   * @returns Cache key string
   */
  private generateCacheKey(
    params: TechnologySearchParams,
    securityContext: { userId: string; roles: string[] }
  ): string {
    return `tech:search:${JSON.stringify(params)}:${securityContext.roles.join(',')}`;
  }

  /**
   * Invalidates related caches when data changes
   * @param university - University to invalidate caches for
   */
  private async invalidateRelatedCaches(university: string): Promise<void> {
    const pattern = `tech:search:*${university}*`;
    const keys = await this.cacheClient.keys(pattern);
    if (keys.length > 0) {
      await this.cacheClient.del(...keys);
    }
  }

  /**
   * Checks if user can modify technology based on security context
   * @param technology - Technology to check
   * @param securityContext - Security context
   * @returns Boolean indicating modification permission
   */
  private canModifyTechnology(
    technology: Technology,
    securityContext: { userId: string; roles: string[] }
  ): boolean {
    const allowedRoles = this.determineAllowedRoles(technology.securityClassification);
    return securityContext.roles.some(role => allowedRoles.includes(role));
  }
}