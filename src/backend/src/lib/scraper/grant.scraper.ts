/**
 * Grant Scraper Implementation
 * Specialized scraper for collecting grant opportunities with enhanced validation,
 * error handling, and memory optimization
 * @version 1.0.0
 */

// External imports
import * as cheerio from 'cheerio'; // ^1.0.0-rc.12
import dayjs from 'dayjs'; // ^1.11.9

// Internal imports
import { BaseScraper } from './base.scraper';
import { IGrant, GrantType } from '../../interfaces/grant.interface';
import { logger } from '../logger';

/**
 * Interface for grant scraper configuration
 */
interface GrantScraperConfig {
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
  validation: {
    minDescriptionLength: number;
    maxAmountThreshold: number;
    minDeadlineDays: number;
  };
  memory: {
    maxBatchSize: number;
    gcIntervalMs: number;
  };
}

/**
 * Enhanced grant data validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Grant scraper implementation with comprehensive validation and error handling
 */
export class GrantScraper extends BaseScraper {
  private readonly grantType: GrantType;
  private readonly config: GrantScraperConfig;
  private memoryUsage: NodeJS.MemoryUsage;
  private batchCount: number = 0;

  /**
   * Initialize grant scraper with enhanced configuration
   */
  constructor(grantType: GrantType, sourceUrl: string) {
    // Initialize base scraper with enhanced error handling
    super({
      url: sourceUrl,
      selector: '.grant-listing',
      customHeaders: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000
    });

    this.grantType = grantType;
    this.memoryUsage = process.memoryUsage();

    // Configure grant-specific settings
    this.config = {
      selectors: {
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.grant-deadline',
        agency: '.grant-agency',
        requirements: '.grant-requirements',
        eligibility: '.grant-eligibility',
        focusAreas: '.grant-focus-areas'
      },
      validation: {
        minDescriptionLength: 100,
        maxAmountThreshold: 10000000, // $10M
        minDeadlineDays: 7
      },
      memory: {
        maxBatchSize: 100,
        gcIntervalMs: 60000 // 1 minute
      }
    };

    // Setup memory monitoring
    this.setupMemoryMonitoring();
  }

  /**
   * Implement grant-specific scraping logic with enhanced error handling
   */
  public async scrape(): Promise<IGrant[]> {
    try {
      logger.info('Starting grant scraping', {
        grantType: this.grantType,
        url: this.url
      });

      const html = await this.fetch();
      const $ = await this.parse(html);
      const grants: IGrant[] = [];

      // Process grants in batches to manage memory
      $(this.selector).each(async (_, element) => {
        try {
          const grant = await this.parseGrantDetails($, element);
          const validation = this.validateGrant(grant);

          if (validation.isValid) {
            grants.push(grant);
            this.batchCount++;

            // Check batch size and trigger GC if needed
            if (this.batchCount >= this.config.memory.maxBatchSize) {
              await this.processBatch();
            }
          } else {
            logger.warn('Invalid grant data', {
              errors: validation.errors,
              url: this.url
            });
          }
        } catch (error) {
          logger.error('Error parsing grant details', {
            error: error.message,
            url: this.url
          });
        }
      });

      logger.info('Completed grant scraping', {
        grantsCollected: grants.length,
        grantType: this.grantType
      });

      return grants;
    } catch (error) {
      logger.error('Failed to scrape grants', {
        error: error.message,
        grantType: this.grantType,
        url: this.url
      });
      throw error;
    }
  }

  /**
   * Parse detailed grant information with comprehensive validation
   */
  private async parseGrantDetails($: cheerio.CheerioAPI, element: cheerio.Element): Promise<IGrant> {
    const title = $(element).find(this.config.selectors.title).text().trim();
    const description = $(element).find(this.config.selectors.description).text().trim();
    const amountText = $(element).find(this.config.selectors.amount).text().trim();
    const deadlineText = $(element).find(this.config.selectors.deadline).text().trim();
    const agency = $(element).find(this.config.selectors.agency).text().trim();

    // Parse and validate amount
    const amount = this.parseAmount(amountText);
    
    // Parse and validate deadline
    const deadline = this.parseDeadline(deadlineText);

    // Extract requirements and eligibility
    const requirements = this.parseRequirements($, element);
    const eligibilityCriteria = this.parseEligibility($, element);
    const focusAreas = this.parseFocusAreas($, element);

    return {
      id: crypto.randomUUID(),
      title,
      description,
      type: this.grantType,
      agency,
      amount,
      deadline,
      requirements,
      eligibilityCriteria,
      focusAreas,
      applicationUrl: $(element).find('a.apply-link').attr('href') || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Validate grant data with comprehensive checks
   */
  private validateGrant(grant: IGrant): ValidationResult {
    const errors: string[] = [];

    // Required field validation
    if (!grant.title) errors.push('Missing grant title');
    if (!grant.description) errors.push('Missing grant description');
    if (!grant.agency) errors.push('Missing agency information');

    // Content validation
    if (grant.description.length < this.config.validation.minDescriptionLength) {
      errors.push('Description too short');
    }

    // Amount validation
    if (grant.amount <= 0 || grant.amount > this.config.validation.maxAmountThreshold) {
      errors.push('Invalid grant amount');
    }

    // Deadline validation
    const daysToDeadline = dayjs(grant.deadline).diff(dayjs(), 'day');
    if (daysToDeadline < this.config.validation.minDeadlineDays) {
      errors.push('Deadline too soon or invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse and validate grant amount
   */
  private parseAmount(amountText: string): number {
    try {
      const cleanAmount = amountText.replace(/[^0-9.]/g, '');
      const amount = parseFloat(cleanAmount);
      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      logger.warn('Error parsing grant amount', {
        amount: amountText,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Parse and validate grant deadline
   */
  private parseDeadline(deadlineText: string): Date {
    try {
      const parsedDate = dayjs(deadlineText);
      return parsedDate.isValid() ? parsedDate.toDate() : new Date();
    } catch (error) {
      logger.warn('Error parsing grant deadline', {
        deadline: deadlineText,
        error: error.message
      });
      return new Date();
    }
  }

  /**
   * Parse grant requirements with structured format
   */
  private parseRequirements($: cheerio.CheerioAPI, element: cheerio.Element): Record<string, unknown> {
    try {
      const requirements: Record<string, unknown> = {};
      $(element).find(this.config.selectors.requirements).each((_, el) => {
        const key = $(el).find('.requirement-key').text().trim();
        const value = $(el).find('.requirement-value').text().trim();
        if (key && value) {
          requirements[key] = value;
        }
      });
      return requirements;
    } catch (error) {
      logger.warn('Error parsing requirements', { error: error.message });
      return {};
    }
  }

  /**
   * Parse eligibility criteria with validation
   */
  private parseEligibility($: cheerio.CheerioAPI, element: cheerio.Element): string[] {
    try {
      const criteria: string[] = [];
      $(element).find(this.config.selectors.eligibility).each((_, el) => {
        const criterion = $(el).text().trim();
        if (criterion) {
          criteria.push(criterion);
        }
      });
      return criteria;
    } catch (error) {
      logger.warn('Error parsing eligibility', { error: error.message });
      return [];
    }
  }

  /**
   * Parse focus areas with validation
   */
  private parseFocusAreas($: cheerio.CheerioAPI, element: cheerio.Element): string[] {
    try {
      const areas: string[] = [];
      $(element).find(this.config.selectors.focusAreas).each((_, el) => {
        const area = $(el).text().trim();
        if (area) {
          areas.push(area);
        }
      });
      return areas;
    } catch (error) {
      logger.warn('Error parsing focus areas', { error: error.message });
      return [];
    }
  }

  /**
   * Process batch of grants and manage memory
   */
  private async processBatch(): Promise<void> {
    try {
      this.batchCount = 0;
      this.memoryUsage = process.memoryUsage();

      if (this.memoryUsage.heapUsed > 0.8 * this.memoryUsage.heapTotal) {
        global.gc?.();
        logger.info('Garbage collection triggered', {
          heapUsed: this.memoryUsage.heapUsed,
          heapTotal: this.memoryUsage.heapTotal
        });
      }
    } catch (error) {
      logger.error('Error processing batch', { error: error.message });
    }
  }

  /**
   * Setup memory monitoring and garbage collection
   */
  private setupMemoryMonitoring(): void {
    setInterval(() => {
      this.memoryUsage = process.memoryUsage();
      logger.debug('Memory usage', {
        heapUsed: this.memoryUsage.heapUsed,
        heapTotal: this.memoryUsage.heapTotal,
        external: this.memoryUsage.external
      });
    }, this.config.memory.gcIntervalMs);
  }
}