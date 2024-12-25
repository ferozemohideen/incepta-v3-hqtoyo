// @ts-check
import { UUID } from 'crypto'; // Version: latest

/**
 * Patent status enumeration for technology listings
 */
export enum PatentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  PROVISIONAL = 'PROVISIONAL',
  NOT_PATENTED = 'NOT_PATENTED'
}

/**
 * Development stages for technologies
 */
export enum DevelopmentStage {
  CONCEPT = 'CONCEPT',
  PROTOTYPE = 'PROTOTYPE',
  PILOT = 'PILOT',
  MARKET_READY = 'MARKET_READY'
}

/**
 * Security classification levels for data protection
 * @see Technical Specifications/7.2 Data Security/7.2.2 Data Classification
 */
export enum SecurityClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

/**
 * Sort options for technology search results
 */
export enum SortOptions {
  RELEVANCE = 'RELEVANCE',
  DATE_DESC = 'DATE_DESC',
  TRL_DESC = 'TRL_DESC',
  UNIVERSITY = 'UNIVERSITY'
}

/**
 * Publication reference structure for academic citations
 */
export interface PublicationReference {
  title: string;
  authors: string[];
  journal?: string;
  doi?: string;
  year: number;
  url?: string;
}

/**
 * Funding record structure for tracking financial history
 */
export interface FundingRecord {
  source: string;
  amount: number;
  grantNumber?: string;
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
}

/**
 * Extended metadata interface for technology listings
 */
export interface TechnologyMetadata {
  inventors: string[];
  patentNumber?: string;
  filingDate?: Date;
  keywords: string[];
  stage: DevelopmentStage;
  publications: PublicationReference[];
  fundingHistory: FundingRecord[];
}

/**
 * Core technology listing interface
 * @see Technical Specifications/3.2 Database Design/3.2.1 Schema Design
 */
export interface Technology {
  id: UUID;
  title: string;
  description: string;
  university: string;
  patentStatus: PatentStatus;
  trl: number; // Technology Readiness Level (1-9)
  domains: string[];
  metadata: TechnologyMetadata;
  createdAt: Date;
  updatedAt: Date;
  securityLevel: SecurityClassification;
}

/**
 * Search parameters interface for technology discovery
 * @see Technical Specifications/3.2.2 Data Management Strategy
 */
export interface TechnologySearchParams {
  query?: string;
  universities?: string[];
  patentStatus?: PatentStatus[];
  trlRange?: {
    min: number;
    max: number;
  };
  domains?: string[];
  securityLevels?: SecurityClassification[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
  sortBy?: SortOptions;
}

/**
 * Search result pagination metadata
 */
export interface SearchResultMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Technology search results interface
 */
export interface TechnologySearchResult {
  items: Technology[];
  metadata: SearchResultMetadata;
}