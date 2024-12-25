/**
 * Technology Scraper Implementation
 * Specialized scraper for extracting technology transfer listings with comprehensive
 * error handling, monitoring, and data validation capabilities.
 * @version 1.0.0
 */

// External imports
import * as cheerio from 'cheerio'; // ^1.0.0-rc.12
import dayjs from 'dayjs'; // ^1.11.9
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.4.1
import winston from 'winston'; // ^3.8.2

// Internal imports
import { BaseScraper } from './base.scraper';
import { logger } from '../logger';
import { scraperConfig } from '../../config/scraper.config';

/**
 * Interface for technology-specific selectors
 */
interface TechnologySelectors {
  title: string;
  description: string;
  inventors: string;
  patentStatus: string;
  categories: string;
  publicationDate: string;
  contactInfo: string;
}

/**
 * Interface for rate limit configuration
 */
interface RateLimitConfig {
  points: number;
  duration: number;
  blockDuration: number;
}

/**
 * Interface for retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  backoffPeriod: number;
  maxBackoffTime: number;
}

/**
 * Configuration options for technology scraper
 */
interface TechnologyScraperOptions {
  url: string;
  university: string;
  selectors: TechnologySelectors;
  rateLimits: RateLimitConfig;
  retryConfig: RetryConfig;
}

/**
 * Interface for extracted technology data
 */
interface TechnologyData {
  title: string;
  description: string;
  inventors: string[];
  patentStatus: string;
  categories: string[];
  publicationDate: string;
  contactInfo: string;
  university: string;
  sourceUrl: string;
  scrapedAt: string;
}

/**
 * Enhanced specialized scraper for extracting technology listings
 */
export class TechnologyScraper extends BaseScraper {
  private readonly university: string;
  private readonly selectors: TechnologySelectors;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: winston.Logger;

  /**
   * Initialize technology scraper with comprehensive configuration
   */
  constructor(options: TechnologyScraperOptions) {
    super({
      url: options.url,
      selector: options.selectors.title, // Use title selector as main identifier
      customHeaders: {
        'User-Agent': scraperConfig.userAgent
      },
      timeout: scraperConfig.timeoutConfig.total
    });

    this.university = options.university;
    this.selectors = options.selectors;
    this.logger = logger;

    // Initialize rate limiter for university-specific limits
    this.rateLimiter = new RateLimiter({
      points: options.rateLimits.points,
      duration: options.rateLimits.duration,
      blockDuration: options.rateLimits.blockDuration
    });
  }

  /**
   * Execute enhanced scraping process with comprehensive error handling
   */
  public async scrape(): Promise<void> {
    try {
      // Check rate limits before proceeding
      await this.rateLimiter.consume(this.university);

      // Fetch HTML content with retry mechanism
      const html = await this.retry(() => this.fetch());

      // Parse HTML content
      const $ = await this.parse(html);

      // Extract and validate technology data
      const technologies = await this.extractTechnologies($);

      // Process and store extracted technologies
      await this.processTechnologies(technologies);

      this.logger.info('Successfully scraped technologies', {
        university: this.university,
        count: technologies.length,
        url: this.url
      });
    } catch (error) {
      this.logger.error('Failed to scrape technologies', {
        university: this.university,
        url: this.url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Extract technology listings from parsed HTML
   */
  private async extractTechnologies($: cheerio.CheerioAPI): Promise<TechnologyData[]> {
    const technologies: TechnologyData[] = [];

    try {
      $(this.selectors.title).each((_, element) => {
        const $element = $(element);
        const $parent = $element.parent();

        const technology = {
          title: this.sanitizeText($element.text()),
          description: this.sanitizeText($parent.find(this.selectors.description).text()),
          inventors: this.extractList($parent.find(this.selectors.inventors)),
          patentStatus: this.sanitizeText($parent.find(this.selectors.patentStatus).text()),
          categories: this.extractList($parent.find(this.selectors.categories)),
          publicationDate: this.parseDate($parent.find(this.selectors.publicationDate).text()),
          contactInfo: this.sanitizeText($parent.find(this.selectors.contactInfo).text()),
          university: this.university,
          sourceUrl: this.url,
          scrapedAt: new Date().toISOString()
        };

        if (this.validateTechnology(technology)) {
          technologies.push(technology);
        }
      });

      return technologies;
    } catch (error) {
      this.logger.error('Failed to extract technologies', {
        university: this.university,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process and store extracted technologies
   */
  private async processTechnologies(technologies: TechnologyData[]): Promise<void> {
    for (const technology of technologies) {
      try {
        await this.queue.produce('technology.new', {
          data: technology,
          metadata: {
            source: this.university,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        this.logger.error('Failed to process technology', {
          university: this.university,
          technology: technology.title,
          error: error.message
        });
      }
    }
  }

  /**
   * Validate extracted technology data
   */
  private validateTechnology(technology: TechnologyData): boolean {
    return !!(
      technology.title &&
      technology.description &&
      technology.inventors.length > 0 &&
      technology.patentStatus &&
      this.isValidDate(technology.publicationDate)
    );
  }

  /**
   * Extract list items from HTML element
   */
  private extractList($element: cheerio.Cheerio): string[] {
    const items: string[] = [];
    $element.each((_, el) => {
      const text = this.sanitizeText($(el).text());
      if (text) items.push(text);
    });
    return items;
  }

  /**
   * Parse and validate date string
   */
  private parseDate(dateStr: string): string {
    try {
      const parsed = dayjs(dateStr);
      return parsed.isValid() ? parsed.toISOString() : '';
    } catch {
      return '';
    }
  }

  /**
   * Validate date string
   */
  private isValidDate(dateStr: string): boolean {
    return dayjs(dateStr).isValid();
  }

  /**
   * Sanitize extracted text
   */
  private sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ');
  }
}

export default TechnologyScraper;