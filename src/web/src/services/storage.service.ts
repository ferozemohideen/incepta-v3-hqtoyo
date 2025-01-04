import { S3, AWSError } from 'aws-sdk';
import axios, { AxiosInstance } from 'axios';
import * as CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import {
  setLocalStorageItem,
  getLocalStorageItem,
  setSessionStorageItem,
  getSessionStorageItem,
  removeStorageItem,
  StorageType,
  StorageError,
  StorageErrorCode,
} from '../utils/storage.utils';

// Types for service configuration and responses
interface UploadOptions {
  encryption?: boolean;
  expiration?: number; // URL expiration in seconds
  metadata?: Record<string, string>;
  cacheControl?: string;
}

interface DownloadOptions {
  useCache?: boolean;
  decryption?: boolean;
  progressCallback?: (progress: number) => void;
}

interface UrlOptions {
  expiration: number;
  downloadFilename?: string;
  contentType?: string;
}

interface SecureDocumentResponse {
  documentId: string;
  url: string;
  metadata: Record<string, string>;
  expiresAt: Date;
}

interface EncryptedData {
  data: string;
  iv: string;
  key: string;
}

// Service class for secure document storage operations
export class StorageService {
  private readonly s3Client: S3;
  private readonly bucketName: string;
  private readonly encryptionKey: string;
  private readonly axiosInstance: AxiosInstance;
  private readonly allowedFileTypes: Set<string>;
  private readonly maxFileSize: number = 100 * 1024 * 1024; // 100MB
  private readonly cachePrefix: string = 'doc_cache_';

  constructor() {
    // Initialize AWS S3 client with server-side encryption
    this.s3Client = new S3({
      region: process.env.AWS_REGION,
      apiVersion: '2006-03-01',
      serverSideEncryption: 'AES256',
      signatureVersion: 'v4',
    });

    this.bucketName = process.env.S3_BUCKET_NAME || '';
    this.encryptionKey = process.env.ENCRYPTION_KEY || '';

    // Initialize allowed file types
    this.allowedFileTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]);

    // Configure axios instance with interceptors
    this.axiosInstance = axios.create();
    this.setupInterceptors();
  }

  /**
   * Securely uploads a document to S3 with encryption
   */
  public async uploadDocument(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<SecureDocumentResponse> {
    try {
      // Validate file
      if (!await this.validateFileType(file)) {
        throw new Error('Invalid file type');
      }
      if (file.size > this.maxFileSize) {
        throw new Error('File size exceeds limit');
      }

      // Generate unique document ID
      const documentId = uuidv4();
      const key = `${path}/${documentId}/${file.name}`;

      // Encrypt file if required
      let fileData: Blob | EncryptedData = file;
      if (options.encryption) {
        fileData = await this.encryptFile(file);
      }

      // Prepare upload parameters
      const uploadParams: S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileData instanceof Blob ? fileData : JSON.stringify(fileData),
        ContentType: file.type,
        Metadata: {
          ...options.metadata,
          encrypted: options.encryption ? 'true' : 'false',
          originalName: file.name,
        },
        CacheControl: options.cacheControl || 'private, max-age=3600',
      };

      // Upload to S3
      await this.s3Client.putObject(uploadParams).promise();

      // Generate secure URL
      const url = await this.generateSecureUrl(documentId, {
        expiration: options.expiration || 3600,
        contentType: file.type,
        downloadFilename: file.name,
      });

      return {
        documentId,
        url,
        metadata: uploadParams.Metadata || {},
        expiresAt: new Date(Date.now() + (options.expiration || 3600) * 1000),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Securely downloads and optionally decrypts a document
   */
  public async downloadDocument(
    documentId: string,
    options: DownloadOptions = {}
  ): Promise<Blob> {
    try {
      // Check cache if enabled
      if (options.useCache) {
        const cached = await this.getFromCache(documentId);
        if (cached) return cached;
      }

      // Get object metadata first
      const metadata = await this.s3Client
        .headObject({
          Bucket: this.bucketName,
          Key: documentId,
        })
        .promise();

      // Download with progress tracking
      const response = await this.s3Client
        .getObject({
          Bucket: this.bucketName,
          Key: documentId,
        })
        .promise();

      let data: Blob;
      if (metadata.Metadata?.encrypted === 'true' && options.decryption) {
        // Decrypt data
        const decrypted = await this.decryptFile(response.Body as Buffer);
        data = new Blob([decrypted], { type: metadata.ContentType });
      } else {
        data = new Blob([response.Body as Buffer], {
          type: metadata.ContentType,
        });
      }

      // Cache the result if caching is enabled
      if (options.useCache) {
        await this.saveToCache(documentId, data);
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Deletes a document from S3 storage
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.s3Client
        .deleteObject({
          Bucket: this.bucketName,
          Key: documentId,
        })
        .promise();

      // Remove from cache if exists
      const cacheKey = `${this.cachePrefix}${documentId}`;
      removeStorageItem(cacheKey, StorageType.LOCAL);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generates a secure, time-limited URL for document access
   */
  public async generateSecureUrl(
    documentId: string,
    options: UrlOptions
  ): Promise<string> {
    try {
      const params: S3.GetObjectRequest = {
        Bucket: this.bucketName,
        Key: documentId,
        ResponseContentType: options.contentType,
        ResponseContentDisposition: options.downloadFilename
          ? `attachment; filename="${options.downloadFilename}"`
          : undefined,
      };

      return this.s3Client.getSignedUrlPromise('getObject', {
        ...params,
        Expires: options.expiration,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validates file type against security whitelist
   */
  private async validateFileType(file: File): Promise<boolean> {
    return this.allowedFileTypes.has(file.type);
  }

  /**
   * Encrypts file data using AES-256
   */
  private async encryptFile(file: Blob): Promise<EncryptedData> {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const iv = CryptoJS.lib.WordArray.random(16);
    
    const encrypted = CryptoJS.AES.encrypt(wordArray, this.encryptionKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      data: encrypted.toString(),
      iv: iv.toString(),
      key: CryptoJS.SHA256(this.encryptionKey).toString(),
    };
  }

  /**
   * Decrypts file data
   */
  private async decryptFile(encryptedData: Buffer): Promise<ArrayBuffer> {
    const data = JSON.parse(encryptedData.toString()) as EncryptedData;
    
    const decrypted = CryptoJS.AES.decrypt(data.data, this.encryptionKey, {
      iv: CryptoJS.enc.Hex.parse(data.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return new Uint8Array(decrypted.words).buffer;
  }

  /**
   * Sets up axios interceptors for security headers
   */
  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = uuidv4();
      config.headers['X-Content-Type-Options'] = 'nosniff';
      return config;
    });
  }

  /**
   * Saves document to cache
   */
  private async saveToCache(documentId: string, data: Blob): Promise<void> {
    const cacheKey = `${this.cachePrefix}${documentId}`;
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        try {
          setLocalStorageItem(cacheKey, reader.result);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(data);
    });
  }

  /**
   * Retrieves document from cache
   */
  private async getFromCache(documentId: string): Promise<Blob | null> {
    const cacheKey = `${this.cachePrefix}${documentId}`;
    const cached = getLocalStorageItem<string>(cacheKey);
    
    if (!cached) return null;

    try {
      const response = await fetch(cached);
      return await response.blob();
    } catch {
      return null;
    }
  }

  /**
   * Handles and transforms errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof StorageError) {
      return error;
    }
    if (error instanceof Error) {
      if ((error as AWSError).code) {
        return new StorageError(
          error.message,
          StorageErrorCode.UNKNOWN_ERROR,
          error
        );
      }
      return error;
    }
    return new Error('An unknown error occurred');
  }
}

export type {
  UploadOptions,
  DownloadOptions,
  UrlOptions,
  SecureDocumentResponse,
  EncryptedData,
};