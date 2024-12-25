/// <reference types="vite/client" />

/**
 * Type declaration for Vite environment variables with strict typing and validation.
 * Extends the ImportMetaEnv interface to provide comprehensive type definitions
 * for both development and production environments.
 * @version Vite ^4.3.0
 */
interface ImportMetaEnv {
  /** API endpoint URL for backend services */
  readonly VITE_API_URL: string;
  
  /** Development server port (development only) */
  readonly VITE_PORT: number;
  
  /** Auth0 authentication domain */
  readonly VITE_AUTH0_DOMAIN: string;
  
  /** Auth0 client identifier */
  readonly VITE_AUTH0_CLIENT_ID: string;
  
  /** Auth0 API audience identifier */
  readonly VITE_AUTH0_AUDIENCE: string;
  
  /** Elasticsearch service endpoint URL */
  readonly VITE_ELASTICSEARCH_URL: string;
  
  /** AWS S3 bucket name for file storage */
  readonly VITE_S3_BUCKET: string;
  
  /** WebSocket server endpoint URL */
  readonly VITE_WEBSOCKET_URL: string;
  
  /** OpenAI API key for LLM services */
  readonly VITE_OPENAI_API_KEY: string;
  
  /** Application mode - development, production, or test */
  readonly MODE: 'development' | 'production' | 'test';
  
  /** Base URL for the application */
  readonly BASE_URL: string;
  
  /** Flag indicating production environment */
  readonly PROD: boolean;
  
  /** Flag indicating development environment */
  readonly DEV: boolean;
}

/**
 * Type augmentation for the ImportMeta interface to include env property
 * with strict typing from ImportMetaEnv.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}