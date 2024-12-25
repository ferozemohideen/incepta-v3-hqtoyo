// @ts-check
import { UUID } from 'crypto'; // v18.0.0

/**
 * Core interface defining the structure of a grant opportunity
 * @interface IGrant
 */
export interface IGrant {
  id: UUID;
  title: string;
  description: string;
  type: GrantType;
  agency: string;
  amount: number;
  deadline: Date;
  requirements: IGrantRequirements;
  eligibilityCriteria: string[];
  fundingAreas: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface defining document requirements for grant applications
 * @interface IGrantRequirements
 */
export interface IGrantRequirements {
  technicalVolume: IDocumentRequirement;
  businessPlan: IDocumentRequirement;
  budget: IDocumentRequirement;
  additionalDocuments: IDocumentRequirement[];
}

/**
 * Interface specifying requirements for individual grant documents
 * @interface IDocumentRequirement
 */
export interface IDocumentRequirement {
  name: string;
  required: boolean;
  maxPages: number;
  format: string[];
}

/**
 * Interface for tracking grant application status and progress
 * @interface IGrantApplication
 */
export interface IGrantApplication {
  id: UUID;
  grantId: UUID;
  userId: UUID;
  status: GrantStatus;
  documents: IApplicationDocument[];
  progress: number;
  feedback: IApplicationFeedback[];
  submittedAt: Date;
  lastModifiedAt: Date;
}

/**
 * Interface for application document tracking
 * @interface IApplicationDocument
 */
export interface IApplicationDocument {
  id: UUID;
  name: string;
  fileUrl: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Interface for application feedback items
 * @interface IApplicationFeedback
 */
export interface IApplicationFeedback {
  id: UUID;
  userId: UUID;
  message: string;
  createdAt: Date;
  type: 'comment' | 'revision' | 'approval';
}

/**
 * Interface for grant search parameters
 * @interface IGrantSearchParams
 */
export interface IGrantSearchParams {
  type?: GrantType[];
  agency?: string[];
  minAmount?: number;
  maxAmount?: number;
  deadline?: DateRange;
  fundingAreas?: string[];
  page?: number;
  limit?: number;
  sortBy?: GrantSortField;
  sortOrder?: SortOrder;
}

/**
 * Interface defining date range for search queries
 * @interface DateRange
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Enum defining supported grant types
 * @enum {string}
 */
export enum GrantType {
  SBIR = 'SBIR',
  STTR = 'STTR',
  FEDERAL = 'FEDERAL',
  PRIVATE = 'PRIVATE'
}

/**
 * Enum defining grant application status values
 * @enum {string}
 */
export enum GrantStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Enum defining available sort fields for grant searches
 * @enum {string}
 */
export enum GrantSortField {
  DEADLINE = 'deadline',
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
  RELEVANCE = 'relevance'
}

/**
 * Enum defining sort order options
 * @enum {string}
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Type for grant match score calculation
 */
export type GrantMatchScore = {
  overall: number;
  technical: number;
  business: number;
  eligibility: number;
};

/**
 * Type for grant statistics
 */
export type GrantStats = {
  totalApplications: number;
  successRate: number;
  averageAmount: number;
  topFundingAreas: string[];
};