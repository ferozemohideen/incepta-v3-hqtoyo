/**
 * Grant Service
 * Implements comprehensive grant-related operations with enhanced caching and error handling
 * Version: 1.0.0
 * 
 * Features:
 * - Advanced grant search with caching
 * - Real-time application tracking
 * - Document management
 * - Progress monitoring
 * - Retry logic for failed requests
 */

import { get, post, put } from './api.service'; // ^1.0.0
import { API_ENDPOINTS } from '../constants/api.constants';
import {
  IGrant,
  IGrantApplication,
  IGrantSearchParams,
  GrantStatus,
  GrantMatchScore,
  GrantStats,
  IDocumentRequirement
} from '../interfaces/grant.interface';

/**
 * Interface for grant search response
 */
interface IGrantResponse {
  data: IGrant[];
  total: number;
  page: number;
  limit: number;
  matchScores?: Record<string, GrantMatchScore>;
}

/**
 * Interface for section validation result
 */
interface ISectionValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Interface defining core grant service operations
 */
export interface GrantService {
  searchGrants(params: IGrantSearchParams): Promise<IGrantResponse>;
  getGrantById(id: string): Promise<IGrant>;
  submitApplication(grantId: string, applicationData: Partial<IGrantApplication>): Promise<IGrantApplication>;
  getApplicationStatus(applicationId: string): Promise<IGrantApplication>;
  getGrantStats(): Promise<GrantStats>;
  saveGrantDraft(grantId: string, draftData: Partial<IGrantApplication>): Promise<IGrantApplication>;
  uploadApplicationDocument(applicationId: string, document: File): Promise<void>;
  validateSection(sectionName: string, sectionData: any, requirements: IDocumentRequirement): Promise<ISectionValidationResult>;
}

/**
 * Enhanced implementation of the GrantService interface
 */
class GrantServiceImpl implements GrantService {
  private readonly cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries: number = 3;
  private readonly cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    // Retry configuration is handled by ApiServiceImpl
  }

  /**
   * Enhanced search for grants with caching and pagination
   */
  async searchGrants(params: IGrantSearchParams): Promise<IGrantResponse> {
    const cacheKey = `grants_search_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await get<IGrantResponse>(
        API_ENDPOINTS.GRANTS.SEARCH,
        params,
        { cache: true }
      );

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Grant search failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve grant details by ID with caching
   */
  async getGrantById(id: string): Promise<IGrant> {
    const cacheKey = `grant_${id}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await get<IGrant>(
        `${API_ENDPOINTS.GRANTS.BASE}/${id}`,
        undefined,
        { cache: true }
      );

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Grant retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Submit grant application with progress tracking
   */
  async submitApplication(
    grantId: string,
    applicationData: Partial<IGrantApplication>
  ): Promise<IGrantApplication> {
    try {
      const response = await post<IGrantApplication>(
        `${API_ENDPOINTS.GRANTS.APPLY}/${grantId}`,
        {
          ...applicationData,
          status: GrantStatus.SUBMITTED,
          submittedAt: new Date()
        }
      );

      // Invalidate relevant caches
      this.invalidateCache(new RegExp(`^grants_.*${grantId}`));
      
      return response;
    } catch (error) {
      console.error('Application submission failed:', error);
      throw error;
    }
  }

  /**
   * Track application status with real-time updates
   */
  async getApplicationStatus(applicationId: string): Promise<IGrantApplication> {
    try {
      return await get<IGrantApplication>(
        `${API_ENDPOINTS.GRANTS.STATUS}/${applicationId}`,
        undefined,
        { cache: false } // Real-time status should not be cached
      );
    } catch (error) {
      console.error('Status retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve grant statistics with caching
   */
  async getGrantStats(): Promise<GrantStats> {
    const cacheKey = 'grant_stats';
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await get<GrantStats>(
        `${API_ENDPOINTS.GRANTS.BASE}/stats`,
        undefined,
        { cache: true }
      );

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Stats retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Save grant application draft
   */
  async saveGrantDraft(
    grantId: string,
    draftData: Partial<IGrantApplication>
  ): Promise<IGrantApplication> {
    try {
      return await put<IGrantApplication>(
        `${API_ENDPOINTS.GRANTS.DRAFTS}/${grantId}`,
        {
          ...draftData,
          status: GrantStatus.DRAFT,
          lastModifiedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Draft save failed:', error);
      throw error;
    }
  }

  /**
   * Upload application document with progress tracking
   */
  async uploadApplicationDocument(
    applicationId: string,
    document: File
  ): Promise<void> {
    const formData = new FormData();
    formData.append('document', document);

    try {
      await post(
        `${API_ENDPOINTS.GRANTS.BASE}/${applicationId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    } catch (error) {
      console.error('Document upload failed:', error);
      throw error;
    }
  }

  /**
   * Validate grant application section against requirements
   */
  async validateSection(
    sectionName: string,
    sectionData: any,
    requirements: IDocumentRequirement
  ): Promise<ISectionValidationResult> {
    const errors: string[] = [];

    try {
      // Validate required fields
      if (requirements.required && !sectionData) {
        errors.push(`${sectionName} is required`);
      }

      // Validate file format if provided
      if (sectionData?.format && !requirements.format.includes(sectionData.format)) {
        errors.push(`Invalid format. Allowed formats: ${requirements.format.join(', ')}`);
      }

      // Validate page count if applicable
      if (sectionData?.pages && sectionData.pages > requirements.maxPages) {
        errors.push(`Page count exceeds maximum limit of ${requirements.maxPages}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Section validation failed:', error);
      throw error;
    }
  }

  /**
   * Cache management utilities
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private invalidateCache(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const grantService = new GrantServiceImpl();