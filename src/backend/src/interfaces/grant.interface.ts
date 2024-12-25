// @ts-check
import { UUID } from 'crypto'; // v18.0.0

/**
 * Enumeration of all supported grant types in the Incepta platform
 */
export enum GrantType {
  SBIR = 'SBIR',
  STTR = 'STTR',
  FEDERAL = 'FEDERAL',
  STATE = 'STATE',
  PRIVATE = 'PRIVATE',
  FOUNDATION = 'FOUNDATION'
}

/**
 * Enumeration of all possible grant application statuses
 */
export enum GrantStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

/**
 * Comprehensive interface defining the structure of a grant
 * Contains all necessary fields for grant discovery and application
 */
export interface IGrant {
  id: UUID;
  title: string;
  description: string;
  type: GrantType;
  agency: string;
  amount: number;
  deadline: Date;
  requirements: Record<string, unknown>;
  eligibilityCriteria: string[];
  focusAreas: string[];
  applicationUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for tracking and managing grant applications
 * Includes comprehensive status tracking and content management
 */
export interface IGrantApplication {
  id: UUID;
  grantId: UUID;
  userId: UUID;
  status: GrantStatus;
  content: Record<string, unknown>;
  attachments: string[];
  reviewNotes: string;
  submittedAt: Date;
  lastUpdatedAt: Date;
}

/**
 * Interface defining search parameters for grant discovery
 * Supports comprehensive filtering and pagination
 */
export interface IGrantSearchParams {
  type?: GrantType[];
  agency?: string[];
  minAmount?: number;
  maxAmount?: number;
  deadline?: Date;
  focusAreas?: string[];
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

/**
 * Interface for paginated grant search responses
 * Includes metadata for pagination handling
 */
export interface IGrantResponse {
  grants: IGrant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}