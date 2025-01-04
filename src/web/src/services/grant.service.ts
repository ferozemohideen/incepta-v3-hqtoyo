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

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import retry from 'axios-retry';
import {
  IGrant,
  IGrantApplication,
  IGrantSearchParams,
  GrantStatus,
  GrantMatchScore,
  GrantStats
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
 * Interface defining core grant service operations
 */
export interface GrantService {
  searchGrants(params: IGrantSearchParams): Promise<IGrantResponse>;
  getGrantById(id: string): Promise<IGrant>;
  submitApplication(grantId: string, applicationData: Partial<IGrantApplication>): Promise<IGrantApplication>;
  getApplicationStatus(applicationId: string): Promise<IGrantApplication>;
  getGrantStats(): Promise<GrantStats>;
  saveDraft(grantId: string, draftData: Partial<IGrantApplication>): Promise<IGrantApplication>;
  uploadApplicationDocument(applicationId: string, document: File): Promise<void>;
  validateApplication(applicationData: Partial<IGrantApplication>): Promise<boolean>;
  validateSection(sectionData: any, sectionType: string): Promise<boolean>;
}

/**
 * Enhanced implementation of the GrantService interface
 */
class GrantServiceImpl implements GrantService {
  private readonly cacheTimeout: number = 5 * 60 * 1000;
  private readonly maxRetries: number = 3;
  private readonly cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    retry(apiService.get, {
      retries: this.maxRetries,
      retryDelay: retry.exponentialDelay,
      retryCondition: (error) => {
        return retry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429;
      }
    });
  }

  async searchGrants(params: IGrantSearchParams): Promise<IGrantResponse> {
    const cacheKey = `grants_search_${JSON.stringify(params)}`;
    const cached = this.getFromCache<IGrantResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await apiService.get<IGrantResponse>(
        `${API_ENDPOINTS.GRANTS.BASE}/search`,
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

  async getGrantById(id: string): Promise<IGrant> {
    const cacheKey = `grant_${id}`;
    const cached = this.getFromCache<IGrant>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await apiService.get<IGrant>(
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

  async submitApplication(
    grantId: string,
    applicationData: Partial<IGrantApplication>
  ): Promise<IGrantApplication> {
    try {
      const response = await apiService.post<IGrantApplication>(
        `${API_ENDPOINTS.GRANTS.APPLY}/${grantId}`,
        {
          ...applicationData,
          status: GrantStatus.SUBMITTED,
          submittedAt: new Date()
        }
      );

      this.invalidateCache(new RegExp(`^grants_.*${grantId}`));
      
      return response;
    } catch (error) {
      console.error('Application submission failed:', error);
      throw error;
    }
  }

  async getApplicationStatus(applicationId: string): Promise<IGrantApplication> {
    try {
      return await apiService.get<IGrantApplication>(
        `${API_ENDPOINTS.GRANTS.STATUS}/${applicationId}`,
        undefined,
        { cache: false }
      );
    } catch (error) {
      console.error('Status retrieval failed:', error);
      throw error;
    }
  }

  async getGrantStats(): Promise<GrantStats> {
    const cacheKey = 'grant_stats';
    const cached = this.getFromCache<GrantStats>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await apiService.get<GrantStats>(
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

  async saveDraft(
    grantId: string,
    draftData: Partial<IGrantApplication>
  ): Promise<IGrantApplication> {
    try {
      return await apiService.put<IGrantApplication>(
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

  async uploadApplicationDocument(
    applicationId: string,
    document: File
  ): Promise<void> {
    const formData = new FormData();
    formData.append('document', document);

    try {
      await apiService.post(
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

  async validateApplication(applicationData: Partial<IGrantApplication>): Promise<boolean> {
    try {
      const response = await apiService.post<boolean>(
        `${API_ENDPOINTS.GRANTS.BASE}/validate`,
        applicationData
      );
      return response;
    } catch (error) {
      console.error('Application validation failed:', error);
      throw error;
    }
  }

  async validateSection(sectionData: any, sectionType: string): Promise<boolean> {
    try {
      const response = await apiService.post<boolean>(
        `${API_ENDPOINTS.GRANTS.BASE}/validate-section/${sectionType}`,
        sectionData
      );
      return response;
    } catch (error) {
      console.error('Section validation failed:', error);
      throw error;
    }
  }

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

export const grantService = new GrantServiceImpl();