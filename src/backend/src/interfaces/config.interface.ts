/**
 * Configuration interfaces for the Incepta platform
 * Defines TypeScript interfaces for all core system configuration settings
 * @version 1.0.0
 */

/**
 * Authentication configuration interface
 * Defines settings for JWT, OAuth 2.0, MFA and session management
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  oauth: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    providers: {
      name: string;
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    }[];
  };
  mfa: {
    enabled: boolean;
    issuer: string;
    algorithm: string;
    digits: number;
    period: number;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
  };
}

/**
 * Database configuration interface
 * Defines PostgreSQL connection and pool settings including replication
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    ca?: string;
  };
  poolConfig: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  replication: {
    readReplicas: {
      host: string;
      port: number;
    }[];
  };
}

/**
 * Elasticsearch configuration interface
 * Defines settings for search functionality including indices and snapshots
 */
export interface ElasticsearchConfig {
  nodes: string[];
  auth: {
    username: string;
    password: string;
    apiKey?: string;
  };
  indices: {
    technology: string;
    grant: string;
    user: string;
  };
  settings: {
    numberOfShards: number;
    numberOfReplicas: number;
    refreshInterval: string;
    maxResultWindow: number;
  };
  snapshotConfig: {
    repository: string;
    schedule: string;
  };
}

/**
 * Redis cache configuration interface
 * Defines settings for caching and session management
 */
export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  ttl: {
    default: number;
    session: number;
    rateLimit: number;
  };
  cluster: {
    enabled: boolean;
    nodes: {
      host: string;
      port: number;
    }[];
  };
}

/**
 * S3 storage configuration interface
 * Defines settings for document storage including encryption and lifecycle
 */
export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
  lifecycle: {
    enabled: boolean;
    transitionDays: number;
    expirationDays: number;
  };
}

/**
 * Web scraper configuration interface
 * Defines settings for data collection including rate limiting and retries
 */
export interface ScraperConfig {
  concurrency: {
    perDomain: number;
    total: number;
  };
  rateLimit: {
    requests: number;
    perSeconds: number;
    maxDelay: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffPeriod: number;
    maxBackoffTime: number;
  };
  timeout: {
    connect: number;
    read: number;
    request: number;
  };
  proxy: {
    enabled: boolean;
    urls: string[];
    rotationInterval: number;
  };
}