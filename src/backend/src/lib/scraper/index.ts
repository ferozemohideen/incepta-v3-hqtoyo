/**
 * Scraper Infrastructure Entry Point
 * Implements factory pattern for scraper instantiation with comprehensive error handling,
 * monitoring, and type safety.
 * @version 1.0.0
 */

// Internal imports
import { BaseScraper } from './base.scraper';
import { TechnologyScraper } from './technology.scraper';
import { GrantScraper } from './grant.scraper';
import { UniversityScraper } from './university.scraper';
import { logger } from '../logger';
import { scraperConfig } from '../../config/scraper.config';

// Types
import { GrantType } from '../../interfaces/grant.interface';
import { SecurityClassification } from '../../interfaces/technology.interface';

/**
 * Factory interface for creating scraper instances
 */
export interface ScraperFactory {
  createTechnologyScraper(options: TechnologyScraperOptions): TechnologyScraper;
  createGrantScraper(options: GrantScraperOptions): GrantScraper;
  createUniversityScraper(options: UniversityScraperOptions): UniversityScraper;
}

/**
 * Options interface for technology scraper configuration
 */
export interface TechnologyScraperOptions {
  url: string;
  university: string;
  selectors: {
    title: string;
    description: string;
    inventors: string;
    patentStatus: string;
    categories: string;
    publicationDate: string;
    contactInfo: string;
  };
  securityLevel: SecurityClassification;
}

/**
 * Options interface for grant scraper configuration
 */
export interface GrantScraperOptions {
  url: string;
  grantType: GrantType;
  selectors: {
    title: string;
    description: string;
    amount: string;
    deadline: string;
    agency: string;
    requirements: string;
    eligibility: string;
    focusAreas: string;
  };
}

/**
 * Options interface for university scraper configuration
 */
export interface UniversityScraperOptions {
  url: string;
  university: string;
  selectors: {
    listingContainer: string;
    title: string;
    description: string;
    patentStatus: string;
    metadata: {
      inventors?: string;
      filingDate?: string;
      keywords?: string;
    };
  };
}

/**
 * Singleton factory implementation for scraper instantiation
 */
export class DefaultScraperFactory implements ScraperFactory {
  private static instance: DefaultScraperFactory;
  private readonly metrics: Map<string, {
    created: number;
    active: number;
    errors: number;
  }> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.initializeMetrics();
    this.setupMetricsReporting();
  }

  /**
   * Get singleton instance of factory
   */
  public static getInstance(): DefaultScraperFactory {
    if (!DefaultScraperFactory.instance) {
      DefaultScraperFactory.instance = new DefaultScraperFactory();
    }
    return DefaultScraperFactory.instance;
  }

  /**
   * Create technology scraper instance with validation
   */
  public createTechnologyScraper(options: TechnologyScraperOptions): TechnologyScraper {
    try {
      this.validateTechnologyOptions(options);
      
      const scraper = new TechnologyScraper({
        url: options.url,
        university: options.university,
        selectors: options.selectors,
        rateLimits: scraperConfig.rateLimit,
        retryConfig: scraperConfig.retryConfig
      });

      this.updateMetrics('technology', 'created');
      return scraper;
    } catch (error) {
      this.updateMetrics('technology', 'error');
      logger.error('Failed to create technology scraper', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create grant scraper instance with validation
   */
  public createGrantScraper(options: GrantScraperOptions): GrantScraper {
    try {
      this.validateGrantOptions(options);
      
      const scraper = new GrantScraper(
        options.grantType,
        options.url
      );

      this.updateMetrics('grant', 'created');
      return scraper;
    } catch (error) {
      this.updateMetrics('grant', 'error');
      logger.error('Failed to create grant scraper', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Create university scraper instance with validation
   */
  public createUniversityScraper(options: UniversityScraperOptions): UniversityScraper {
    try {
      this.validateUniversityOptions(options);
      
      const scraper = new UniversityScraper({
        url: options.url,
        university: options.university,
        selectors: options.selectors,
        rateLimits: scraperConfig.rateLimit,
        retryConfig: scraperConfig.retryConfig
      });

      this.updateMetrics('university', 'created');
      return scraper;
    } catch (error) {
      this.updateMetrics('university', 'error');
      logger.error('Failed to create university scraper', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    ['technology', 'grant', 'university'].forEach(type => {
      this.metrics.set(type, {
        created: 0,
        active: 0,
        errors: 0
      });
    });
  }

  /**
   * Update metrics for scraper operations
   */
  private updateMetrics(type: string, action: 'created' | 'error'): void {
    const metric = this.metrics.get(type);
    if (metric) {
      if (action === 'created') {
        metric.created++;
        metric.active++;
      } else if (action === 'error') {
        metric.errors++;
      }
      this.metrics.set(type, metric);
    }
  }

  /**
   * Setup periodic metrics reporting
   */
  private setupMetricsReporting(): void {
    setInterval(() => {
      const metricsSnapshot = Object.fromEntries(this.metrics.entries());
      logger.info('Scraper factory metrics', { metrics: metricsSnapshot });
    }, scraperConfig.monitoring.metricsInterval);
  }

  /**
   * Validate technology scraper options
   */
  private validateTechnologyOptions(options: TechnologyScraperOptions): void {
    if (!options.url || !options.university) {
      throw new Error('Missing required technology scraper options');
    }
    if (!options.selectors || !options.selectors.title || !options.selectors.description) {
      throw new Error('Invalid technology selectors configuration');
    }
  }

  /**
   * Validate grant scraper options
   */
  private validateGrantOptions(options: GrantScraperOptions): void {
    if (!options.url || !options.grantType) {
      throw new Error('Missing required grant scraper options');
    }
    if (!Object.values(GrantType).includes(options.grantType)) {
      throw new Error('Invalid grant type specified');
    }
    if (!options.selectors || !options.selectors.title || !options.selectors.description) {
      throw new Error('Invalid grant selectors configuration');
    }
  }

  /**
   * Validate university scraper options
   */
  private validateUniversityOptions(options: UniversityScraperOptions): void {
    if (!options.url || !options.university) {
      throw new Error('Missing required university scraper options');
    }
    if (!options.selectors || !options.selectors.listingContainer) {
      throw new Error('Invalid university selectors configuration');
    }
  }
}

// Export scraper implementations
export {
  BaseScraper,
  TechnologyScraper,
  GrantScraper,
  UniversityScraper
};

// Export factory singleton instance
export const scraperFactory = DefaultScraperFactory.getInstance();