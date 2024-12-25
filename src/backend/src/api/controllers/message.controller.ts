/**
 * Enhanced Message Controller Implementation
 * Provides secure messaging functionality with document sharing and real-time status tracking
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import multer from 'multer'; // ^1.4.5-lts.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { MessageService } from '../../services/message.service';
import { Message, MessageType, MessageStatus } from '../../interfaces/message.interface';

// Constants for rate limiting and file uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window

/**
 * Multer configuration for secure file uploads
 */
const upload = multer({
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ]);

    if (allowedTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * Rate limiter configuration
 */
const messageLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: 'Too many messages sent. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Enhanced Message Controller class implementing secure messaging functionality
 */
export class MessageController {
  private readonly messageService: MessageService;

  /**
   * Initializes controller with required dependencies
   */
  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  /**
   * Creates a new message with optional document attachment
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public createMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> => {
    try {
      const { recipientId, content, options } = req.body;
      const senderId = req.user.id;

      // Validate request parameters
      if (!recipientId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      let message: Message;

      // Handle file upload if present
      if (req.file) {
        message = await this.messageService.sendMessage(
          senderId,
          recipientId,
          content,
          req.file.buffer,
          req.file.originalname,
          options
        );
      } else {
        message = await this.messageService.sendMessage(
          senderId,
          recipientId,
          content,
          undefined,
          undefined,
          options
        );
      }

      return res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves messages from a thread with pagination
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> => {
    try {
      const { threadId } = req.params;
      const { page = 1, limit = 50, options = {} } = req.query;

      const messages = await this.messageService.getThreadMessages(
        threadId,
        Number(page),
        Number(limit),
        options
      );

      return res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates message status (read/delivered)
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public updateMessageStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> => {
    try {
      const { messageId } = req.params;
      const { status } = req.body;

      if (!Object.values(MessageStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message status'
        });
      }

      await this.messageService.updateMessageStatus(messageId, status);

      return res.status(200).json({
        success: true,
        message: 'Message status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a message (soft delete)
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  public deleteMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> => {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      await this.messageService.deleteMessage(messageId, userId);

      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns the configured multer middleware for file uploads
   */
  public static getFileUploadMiddleware() {
    return upload.single('document');
  }

  /**
   * Returns the configured rate limiter middleware
   */
  public static getRateLimiterMiddleware() {
    return messageLimiter;
  }
}

export default MessageController;