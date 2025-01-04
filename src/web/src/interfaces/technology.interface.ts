/**
 * @fileoverview Technology-related TypeScript interfaces and types for the Incepta platform.
 * @version 1.0.0
 * @package @incepta/web
 */

import { UUID } from 'crypto'; // Latest version

/**
 * Enumeration of possible patent statuses for technology listings
 */
export enum PatentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  PROVISIONAL = 'PROVISIONAL',
  NOT_PATENTED = 'NOT_PATENTED'
}

/**
 * Enumeration of development stages for technologies
 */
export enum DevelopmentStage {
  CONCEPT = 'CONCEPT',
  PROTOTYPE = 'PROTOTYPE',
  VALIDATION = 'VALIDATION',
  COMMERCIALIZATION = 'COMMERCIALIZATION',
  MARKET_READY = 'MARKET_READY'
}

/**
 * Interface representing attachment metadata
 */
export interface TechnologyAttachment {
  id: UUID;
  name: string;
  type: string;
  size: number;
}

/**
 * Interface for extended technology metadata
 */
export interface TechnologyMetadata {
  /** List of technology inventors */
  inventors: string[];
  /** Patent number if granted, null otherwise */
  patentNumber: string | null;
  /** Patent filing date if applicable */
  filingDate: Date | null;
  /** Relevant technology keywords */
  keywords: string[];
  /** Current development stage */
  stage: DevelopmentStage;
  /** Associated documents and files */
  attachments: TechnologyAttachment[];
}

/**
 * Type defining technology-related permissions
 */
export type TechnologyPermissions = {
  /** Permission to view technology details */
  canView: boolean;
  /** Permission to edit technology information */
  canEdit: boolean;
  /** Permission to delete technology listing */
  canDelete: boolean;
  /** Permission to contact technology owners */
  canContact: boolean;
  /** Permission to download attachments */
  canDownload: boolean;
  /** Permission to save technology */
  canSave: boolean;
};

/**
 * Interface for configuring technology display options
 */
export interface TechnologyDisplayConfig {
  /** Toggle metadata visibility */
  showMetadata: boolean;
  /** Toggle action buttons visibility */
  showActions: boolean;
  /** Layout style for technology display */
  layout: 'grid' | 'list' | 'compact';
  /** Fields to highlight in the display */
  highlightFields: (keyof Technology)[];
}

/**
 * Core interface representing a technology listing
 */
export interface Technology {
  /** Unique identifier */
  id: UUID;
  /** Technology title */
  title: string;
  /** Detailed description */
  description: string;
  /** Source university/institution */
  university: string;
  /** Current patent status */
  patentStatus: PatentStatus;
  /** Technology Readiness Level (1-9) */
  trl: number;
  /** Technology domains/categories */
  domains: string[];
  /** Extended metadata */
  metadata: TechnologyMetadata;
  /** Access permissions */
  permissions: TechnologyPermissions;
  /** Display configuration */
  displayConfig: TechnologyDisplayConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Security level classification */
  securityLevel: string;
}

/**
 * Interface for technology search parameters
 */
export interface TechnologySearchParams {
  /** Search query string */
  query: string;
  /** Filter by universities */
  universities: string[];
  /** Filter by patent status */
  patentStatus: PatentStatus[];
  /** Filter by TRL range */
  trlRange: {
    min: number;
    max: number;
  };
  /** Filter by technology domains */
  domains: string[];
  /** Filter by development stage */
  stage: DevelopmentStage[];
  /** Filter by date range */
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  /** Sort field */
  sortBy: keyof Technology;
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
  /** Pagination page number */
  page: number;
  /** Results per page */
  limit: number;
}

/**
 * Type guard to check if a value is a valid Technology
 */
export function isTechnology(value: unknown): value is Technology {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'description' in value &&
    'university' in value &&
    'patentStatus' in value &&
    'trl' in value
  );
}

/**
 * Type guard to check if a value is a valid TechnologyMetadata
 */
export function isTechnologyMetadata(value: unknown): value is TechnologyMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'inventors' in value &&
    'stage' in value &&
    'attachments' in value
  );
}