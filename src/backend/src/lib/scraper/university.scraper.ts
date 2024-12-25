/**
 * University Technology Transfer Office Scraper
 * Implements specialized web scraping functionality for collecting technology transfer data
 * from university websites with enhanced security, error handling, and performance optimizations.
 * @version 1.0.0
 */

// External imports - versions specified as per requirements
import * as cheerio from 'cheerio'; // ^1.0.0-rc.12
import sanitizeHtml from 'sanitize-html'; // ^2.11.0

// Internal imports
import { BaseScraper } from './base.scraper';
import { logger } from '../logger';
import { Technology } from '../../interfaces/technology.interface';

/**
 * Configuration interface for university-specific selectors
 */
interface UniversitySelectors {
  listingContainer: string;
  title: string;
  description: string;
  patentStatus: string;
  metadata: {
    inventors?: string;
    filingDate?: string;
    keywords?: string;
  };
}

/**
 * Rate limiting configuration interface
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  concurrentRequests: number;
}

/**
 * Retry configuration interface
 */
interface RetryConfig {
  maxRetries: number;
  backoffFactor: number;
  initialDelay: number;
}

/**
 * Configuration options for university scraper
 */
interface UniversityScraperOptions {
  url: string;
  university: string;
  selectors: UniversitySelectors;
  rateLimits: RateLimitConfig;
  retryConfig?: RetryConfig;
}

/**
 * Constants for scraper configuration
 */
const REQUIRED_FIELDS = ['title', 'description', 'university', 'patent_status'];
const MAX_DESCRIPTION_LENGTH = 5000;
const VALID_PATENT_STATUSES = ['pending', 'granted', 'provisional', 'not_filed'];
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffFactor: 2,
  initialDelay: 1000
};
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  concurrentRequests: 5
};

/**
 * Enhanced scraper implementation for university technology transfer offices
 */
export class UniversityScraper extends BaseScraper {
  private readonly university: string;
  private readonly selectors: UniversitySelectors;
  private readonly metrics: {
    totalTechnologies: number;
    failedExtractions: number;
    processingTime: number;
  };

  /**
   * Initialize university scraper with enhanced configuration
   */
  constructor(options: UniversityScraperOptions) {
    super({
      url: options.url,
      selector: options.selectors.listingContainer,
      customHeaders: {
        'User-Agent': 'Incepta-Bot/1.0 (+https://incepta.ai/bot)'
      },
      timeout: 30000
    });

    this.university = options.university;
    this.selectors = options.selectors;
    this.metrics = {
      totalTechnologies: 0,
      failedExtractions: 0,
      processingTime: 0
    };

    // Validate configuration
    this.validateConfiguration(options);
  }

  /**
   * Execute scraping process with enhanced error handling and monitoring
   */
  public async scrape(): Promise<Technology[]> {
    const startTime = Date.now();
    const technologies: Technology[] = [];

    try {
      logger.info('Starting university scraping process', {
        university: this.university,
        url: this.url
      });

      // Fetch and parse HTML content
      const html = await this.retry(() => this.fetch());
      const $ = await this.parse(html);

      // Extract technologies with validation
      const listings = $(this.selector);
      
      for (const element of listings) {
        try {
          const technology = await this.extractTechnology($(element));
          if (this.validateTechnology(technology)) {
            technologies.push(technology);
            this.metrics.totalTechnologies++;
          }
        } catch (error) {
          this.metrics.failedExtractions++;
          logger.error('Failed to extract technology', {
            university: this.university,
            error: error.message,
            element: $(element).html()?.substring(0, 100)
          });
        }
      }

      // Log completion metrics
      this.metrics.processingTime = Date.now() - startTime;
      logger.info('Completed university scraping process', {
        university: this.university,
        technologies: technologies.length,
        failures: this.metrics.failedExtractions,
        duration: this.metrics.processingTime
      });

      return technologies;
    } catch (error) {
      logger.error('University scraping process failed', {
        university: this.university,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Extract technology information with enhanced validation and sanitization
   */
  private async extractTechnology(element: cheerio.Cheerio): Promise<Technology> {
    const title = this.sanitizeContent(element.find(this.selectors.title).text());
    const description = this.sanitizeContent(
      element.find(this.selectors.description).text()
    );
    const patentStatus = this.normalizePatentStatus(
      element.find(this.selectors.patentStatus).text()
    );

    // Extract metadata with validation
    const metadata = {
      inventors: this.extractInventors(element),
      filingDate: this.extractFilingDate(element),
      keywords: this.extractKeywords(element)
    };

    // Validate required fields
    if (!title || !description) {
      throw new Error('Missing required technology fields');
    }

    return {
      title,
      description: description.substring(0, MAX_DESCRIPTION_LENGTH),
      university: this.university,
      patent_status: patentStatus,
      metadata
    };
  }

  /**
   * Validate extracted technology data
   */
  private validateTechnology(technology: Partial<Technology>): boolean {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!technology[field]) {
        logger.warn('Missing required field in technology', {
          university: this.university,
          field,
          technology: technology.title
        });
        return false;
      }
    }

    // Validate patent status
    if (!VALID_PATENT_STATUSES.includes(technology.patent_status!)) {
      logger.warn('Invalid patent status', {
        university: this.university,
        status: technology.patent_status,
        technology: technology.title
      });
      return false;
    }

    return true;
  }

  /**
   * Sanitize content with security measures
   */
  private sanitizeContent(content: string): string {
    return sanitizeHtml(content.trim(), {
      allowedTags: [],
      allowedAttributes: {},
      textFilter: (text) => {
        return text.replace(/[^\w\s-.,]/g, '');
      }
    });
  }

  /**
   * Extract and normalize patent status
   */
  private normalizePatentStatus(status: string): string {
    status = status.toLowerCase().trim();
    
    if (status.includes('pending')) return 'pending';
    if (status.includes('granted') || status.includes('issued')) return 'granted';
    if (status.includes('provisional')) return 'provisional';
    return 'not_filed';
  }

  /**
   * Extract inventor information with validation
   */
  private extractInventors(element: cheerio.Cheerio): string[] {
    if (!this.selectors.metadata.inventors) return [];

    return element
      .find(this.selectors.metadata.inventors)
      .text()
      .split(',')
      .map(inventor => this.sanitizeContent(inventor))
      .filter(inventor => inventor.length > 0);
  }

  /**
   * Extract and validate filing date
   */
  private extractFilingDate(element: cheerio.Cheerio): Date | undefined {
    if (!this.selectors.metadata.filingDate) return undefined;

    const dateStr = element.find(this.selectors.metadata.filingDate).text();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * Extract and normalize keywords
   */
  private extractKeywords(element: cheerio.Cheerio): string[] {
    if (!this.selectors.metadata.keywords) return [];

    return element
      .find(this.selectors.metadata.keywords)
      .text()
      .split(',')
      .map(keyword => this.sanitizeContent(keyword))
      .filter(keyword => keyword.length > 0);
  }

  /**
   * Validate scraper configuration
   */
  private validateConfiguration(options: UniversityScraperOptions): void {
    if (!options.university || !options.url) {
      throw new Error('Missing required configuration parameters');
    }

    if (!options.selectors.listingContainer || !options.selectors.title || !options.selectors.description) {
      throw new Error('Missing required selectors');
    }

    // Apply default configurations
    options.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retryConfig
    };

    options.rateLimits = {
      ...DEFAULT_RATE_LIMITS,
      ...options.rateLimits
    };
  }
}

export default UniversityScraper;