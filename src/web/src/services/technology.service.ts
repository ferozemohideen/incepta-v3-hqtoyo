/**
 * Technology Service
 * Implements comprehensive technology-related operations with enhanced features
 * Version: 1.0.0
 * 
 * Features:
 * - Advanced caching with LRU implementation
 * - Request queue with rate limiting
 * - Type-safe operations
 * - Comprehensive error handling
 * - Optimistic updates
 */

import { AxiosResponse } from 'axios'; // ^1.4.0
import { LRUCache } from 'lru-cache'; // ^9.1.1
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  Technology, 
  TechnologySearchParams, 
  PatentStatus,
  isTechnology 
} from '../interfaces/technology.interface';
import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Interface for paginated technology response
 */
interface PaginatedTechnologyResponse {
  items: Technology[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Interface for technology match response
 */
interface TechnologyMatchResponse {
  matches: Technology[];
  score: number;
  matchCriteria: Record<string, any>;
}

/**
 * Enhanced Technology Service implementation
 */
class TechnologyService {
  private readonly baseUrl: string;
  private readonly cache: LRUCache<string, any>;

  constructor() {
    this.baseUrl = API_ENDPOINTS.TECHNOLOGIES.BASE;
    
    // Initialize LRU cache with configuration
    this.cache = new LRUCache<string, any>({
      max: 500, // Maximum number of items
      ttl: 1000 * 60 * 5, // 5 minutes TTL
      updateAgeOnGet: true,
      allowStale: false
    });
  }

  /**
   * Search technologies with advanced filtering and pagination
   * @param params - Search parameters
   * @returns Promise resolving to paginated technology results
   */
  async searchTechnologies(
    params: TechnologySearchParams
  ): Promise<PaginatedTechnologyResponse> {
    const cacheKey = `search:${JSON.stringify(params)}`;
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult as PaginatedTechnologyResponse;
    }

    try {
      const response = await apiService.get<PaginatedTechnologyResponse>(
        `${this.baseUrl}/search`,
        params,
        { cache: true }
      );

      // Validate response data
      if (response.items.every(isTechnology)) {
        this.cache.set(cacheKey, response);
        return response;
      }

      throw new Error('Invalid technology data received from API');
    } catch (error) {
      console.error('Technology search failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve technology details by ID with caching
   * @param id - Technology UUID
   * @returns Promise resolving to technology details
   */
  async getTechnologyById(id: string): Promise<Technology> {
    if (!id) {
      throw new Error('Technology ID is required');
    }

    const cacheKey = `technology:${id}`;
    const cachedTechnology = this.cache.get(cacheKey);
    if (cachedTechnology) {
      return cachedTechnology as Technology;
    }

    try {
      const technology = await apiService.get<Technology>(
        `${this.baseUrl}/${id}`,
        undefined,
        { cache: true }
      );

      if (isTechnology(technology)) {
        this.cache.set(cacheKey, technology);
        return technology;
      }

      throw new Error('Invalid technology data received');
    } catch (error) {
      console.error(`Failed to fetch technology ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get AI-matched technologies for a user
   * @param userId - User UUID
   * @returns Promise resolving to matched technologies
   */
  async getMatchingTechnologies(userId: string): Promise<TechnologyMatchResponse> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const cacheKey = `matches:${userId}`;
    const cachedMatches = this.cache.get(cacheKey);
    if (cachedMatches) {
      return cachedMatches as TechnologyMatchResponse;
    }

    try {
      const matches = await apiService.post<TechnologyMatchResponse>(
        `${this.baseUrl}/match`,
        { userId },
        { priority: 2 } // Higher priority for matching requests
      );

      if (matches.matches.every(isTechnology)) {
        this.cache.set(cacheKey, matches, { ttl: 1000 * 60 * 15 }); // 15 minutes TTL for matches
        return matches;
      }

      throw new Error('Invalid match data received');
    } catch (error) {
      console.error('Technology matching failed:', error);
      throw error;
    }
  }

  /**
   * Save technology to user's saved items with optimistic updates
   * @param technologyId - Technology UUID
   * @returns Promise resolving to void
   */
  async saveTechnology(technologyId: string): Promise<void> {
    if (!technologyId) {
      throw new Error('Technology ID is required');
    }

    // Optimistically update cache
    const cacheKey = `saved:${technologyId}`;
    this.cache.set(cacheKey, true);

    try {
      await apiService.post(
        `${this.baseUrl}/save`,
        { technologyId },
        { priority: 1 }
      );
    } catch (error) {
      // Revert optimistic update on error
      this.cache.delete(cacheKey);
      console.error('Failed to save technology:', error);
      throw error;
    }
  }

  /**
   * Clear cache entries related to technologies
   * @param pattern - Optional pattern to match cache keys
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear specific cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const technologyService = new TechnologyService();