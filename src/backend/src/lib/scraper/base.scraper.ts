/**
 * Base Scraper Class
 * Implements enterprise-grade web scraping functionality with distributed rate limiting,
 * sophisticated error recovery, and performance monitoring
 * @version 1.0.0
 */

// External imports
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'; // ^1.4.0
import * as cheerio from 'cheerio'; // ^1.0.0-rc.12
import Bottleneck from 'bottleneck'; // ^2.19.5
import { CircuitBreaker } from 'circuit-breaker-ts'; // ^1.0.0

// Internal imports
import { scraperConfig } from '../../config/scraper.config';
import { logger } from '../logger';
import { KafkaQueue } from '../queue';

/**
 * Enhanced configuration options for scraper instances
 */
export interface ScraperOptions {
  url: string;
  selector: string;
  customHeaders?: Record<string, string>;
  proxyConfig?: {
    url: string;
    auth?: {
      username: string;
      password: string;
    };
  };
  timeout?: number;
}

/**
 * Error categories for sophisticated error handling
 */
enum ScraperErrorType {
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  PARSE = 'PARSE',
  VALIDATION = 'VALIDATION',
  PROXY = 'PROXY',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Abstract base class providing enterprise-grade scraping functionality
 */
export abstract class BaseScraper {
  protected readonly url: string;
  protected readonly selector: string;
  protected readonly httpClient: AxiosInstance;
  protected readonly rateLimiter: Bottleneck;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly queue: KafkaQueue;

  private readonly metrics = {
    requestsTotal: 0,
    requestsFailed: 0,
    parseErrors: 0,
    rateLimitHits: 0,
    avgResponseTime: 0
  };

  /**
   * Initialize scraper with enhanced configuration and monitoring
   */
  constructor(options: ScraperOptions) {
    this.validateOptions(options);

    this.url = options.url;
    this.selector = options.selector;

    // Initialize rate limiter with cluster support
    this.rateLimiter = new Bottleneck({
      minTime: scraperConfig.rateLimit.perSeconds * 1000 / scraperConfig.rateLimit.requests,
      maxConcurrent: scraperConfig.concurrency.perDomain,
      reservoir: scraperConfig.rateLimit.requests,
      reservoirRefreshInterval: scraperConfig.rateLimit.perSeconds * 1000,
      reservoirRefreshAmount: scraperConfig.rateLimit.requests
    });

    // Initialize circuit breaker for failure isolation
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: scraperConfig.retryConfig.circuitBreaker.failureThreshold,
      resetTimeout: scraperConfig.retryConfig.circuitBreaker.resetTimeout
    });

    // Configure HTTP client with enhanced error handling
    this.httpClient = axios.create({
      timeout: options.timeout || scraperConfig.timeoutConfig.total,
      headers: {
        'User-Agent': scraperConfig.userAgent,
        ...options.customHeaders
      },
      proxy: options.proxyConfig ? {
        host: options.proxyConfig.url,
        auth: options.proxyConfig.auth
      } : undefined
    });

    // Initialize Kafka queue for distributed processing
    this.queue = new KafkaQueue({
      brokers: ['localhost:9092'], // Configure from environment
      clientId: 'scraper-service'
    }, logger);

    // Set up cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Abstract method for implementing specific scraping logic
   */
  public abstract scrape(): Promise<void>;

  /**
   * Makes rate-limited HTTP request with circuit breaker protection
   */
  protected async fetch(): Promise<string> {
    const startTime = Date.now();

    try {
      // Check circuit breaker status
      await this.circuitBreaker.execute(async () => {
        // Apply rate limiting
        return await this.rateLimiter.schedule(async () => {
          const response = await this.httpClient.get(this.url);
          
          // Update metrics
          this.metrics.requestsTotal++;
          this.metrics.avgResponseTime = 
            (this.metrics.avgResponseTime * (this.metrics.requestsTotal - 1) + 
             (Date.now() - startTime)) / this.metrics.requestsTotal;

          return response.data;
        });
      });

      logger.info('Successfully fetched URL', {
        url: this.url,
        duration: Date.now() - startTime
      });

      return '';
    } catch (error) {
      const errorType = this.categorizeError(error);
      this.metrics.requestsFailed++;

      logger.error('Failed to fetch URL', {
        url: this.url,
        errorType,
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Memory-optimized HTML parsing with error handling
   */
  protected async parse(html: string): Promise<cheerio.CheerioAPI> {
    try {
      const $ = cheerio.load(html, {
        decodeEntities: true,
        xmlMode: false,
        lowerCaseTags: true
      });

      return $;
    } catch (error) {
      this.metrics.parseErrors++;
      logger.error('Failed to parse HTML', {
        url: this.url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Enhanced retry logic with sophisticated error handling
   */
  protected async retry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: Error;

    while (attempt < scraperConfig.retryConfig.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;

        const backoffTime = Math.min(
          scraperConfig.retryConfig.backoffPeriod * Math.pow(2, attempt),
          scraperConfig.retryConfig.maxBackoffTime
        );

        logger.warn('Operation failed, retrying', {
          url: this.url,
          attempt,
          backoffTime,
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }

    throw lastError!;
  }

  /**
   * Validates scraper configuration options
   */
  private validateOptions(options: ScraperOptions): void {
    if (!options.url || !options.url.startsWith('http')) {
      throw new Error('Invalid URL provided');
    }

    if (!options.selector) {
      throw new Error('CSS selector is required');
    }

    if (options.timeout && (options.timeout < 1000 || options.timeout > 60000)) {
      throw new Error('Timeout must be between 1 and 60 seconds');
    }
  }

  /**
   * Categorizes errors for appropriate handling strategies
   */
  private categorizeError(error: any): ScraperErrorType {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') return ScraperErrorType.NETWORK;
      if (error.response?.status === 429) return ScraperErrorType.RATE_LIMIT;
      if (error.response?.status === 407) return ScraperErrorType.PROXY;
    }
    if (error instanceof SyntaxError) return ScraperErrorType.PARSE;
    if (error instanceof TypeError) return ScraperErrorType.VALIDATION;
    return ScraperErrorType.UNKNOWN;
  }

  /**
   * Sets up cleanup handlers for graceful shutdown
   */
  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      await this.rateLimiter.disconnect();
      await this.queue.gracefulShutdown();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }
}