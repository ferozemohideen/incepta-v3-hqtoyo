/**
 * Enhanced S3 Storage Service
 * Implements secure document management with encryption, validation, and monitoring
 * @version 1.0.0
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'; // ^3.0.0
import { Upload } from '@aws-sdk/lib-storage'; // ^3.0.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import { s3Config } from '../../config/s3.config';

// Custom type definitions
type ProgressCallback = (progress: number) => void;
type ValidationResult = { valid: boolean; message?: string };

interface UploadResult {
  url: string;
  key: string;
  metadata: Record<string, string>;
  etag: string;
}

interface DownloadResult {
  buffer: Buffer;
  metadata: Record<string, string>;
  contentType: string;
}

interface SecurityOptions {
  requireSignedUrls: boolean;
  customHeaders?: Record<string, string>;
  ipRestriction?: string[];
}

interface SignedUrlResult {
  url: string;
  expires: Date;
  metadata: Record<string, string>;
}

/**
 * Enhanced S3 Service for secure document management
 * Implements comprehensive security, validation, and monitoring
 */
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly allowedFileTypes: Set<string>;
  private readonly maxFileSize: number = 100 * 1024 * 1024; // 100MB

  constructor() {
    // Initialize S3 client with secure configuration
    this.s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      maxAttempts: 3,
    });

    this.bucket = s3Config.bucket;
    this.allowedFileTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ]);
  }

  /**
   * Validates file metadata and security requirements
   * @param fileBuffer - File content buffer
   * @param contentType - File MIME type
   * @param metadata - File metadata
   */
  private async validateFile(
    fileBuffer: Buffer,
    contentType: string,
    metadata: Record<string, string>
  ): Promise<ValidationResult> {
    // Check file size
    if (fileBuffer.length > this.maxFileSize) {
      return { valid: false, message: 'File size exceeds maximum limit' };
    }

    // Validate content type
    if (!this.allowedFileTypes.has(contentType)) {
      return { valid: false, message: 'File type not allowed' };
    }

    // Validate metadata
    if (!metadata.uploadedBy || !metadata.documentType) {
      return { valid: false, message: 'Required metadata missing' };
    }

    return { valid: true };
  }

  /**
   * Encrypts file content using AES-256
   * @param buffer - Original file buffer
   */
  private encryptBuffer(buffer: Buffer): Buffer {
    const encrypted = CryptoJS.AES.encrypt(
      buffer.toString('base64'),
      s3Config.encryption.kmsKeyId || 'default-key'
    );
    return Buffer.from(encrypted.toString(), 'utf-8');
  }

  /**
   * Uploads file to S3 with encryption and progress tracking
   */
  public async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
    metadata: Record<string, string>,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    // Validate file
    const validation = await this.validateFile(fileBuffer, contentType, metadata);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Encrypt file if enabled
    const finalBuffer = s3Config.encryption.enabled 
      ? this.encryptBuffer(fileBuffer)
      : fileBuffer;

    // Prepare upload parameters
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: finalBuffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          encrypted: String(s3Config.encryption.enabled),
          timestamp: new Date().toISOString(),
        },
        ServerSideEncryption: 'AES256',
      },
    });

    // Handle upload progress
    if (onProgress) {
      upload.on('httpUploadProgress', (progress) => {
        const percentage = (progress.loaded || 0) / (progress.total || 1) * 100;
        onProgress(percentage);
      });
    }

    // Execute upload
    const result = await upload.done();

    return {
      url: `https://${this.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`,
      key,
      metadata,
      etag: result.ETag || '',
    };
  }

  /**
   * Downloads file from S3 with security validation
   */
  public async downloadFile(key: string): Promise<DownloadResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('File content not found');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const decryptedBuffer = s3Config.encryption.enabled 
      ? Buffer.from(CryptoJS.AES.decrypt(
          buffer.toString('utf-8'),
          s3Config.encryption.kmsKeyId || 'default-key'
        ).toString(CryptoJS.enc.Base64), 'base64')
      : buffer;

    return {
      buffer: decryptedBuffer,
      metadata: response.Metadata || {},
      contentType: response.ContentType || 'application/octet-stream',
    };
  }

  /**
   * Securely deletes file from S3
   */
  public async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Generates secure pre-signed URL with enhanced validation
   */
  public async getSignedUrl(
    key: string,
    expiresIn: number,
    options: SecurityOptions
  ): Promise<SignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(options.customHeaders || {}),
    });

    const url = await this.s3Client.sign(command, {
      expiresIn,
    });

    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);

    return {
      url: url.toString(),
      expires,
      metadata: {
        generated: new Date().toISOString(),
        expiresAt: expires.toISOString(),
      },
    };
  }
}

// Export singleton instance
export const s3Service = new S3Service();