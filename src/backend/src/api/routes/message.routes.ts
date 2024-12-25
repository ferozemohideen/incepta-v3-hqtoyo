/**
 * @fileoverview Express router configuration for secure messaging system endpoints
 * Implements secure message operations with enhanced monitoring and performance optimizations
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.17.1
import multer from 'multer'; // ^1.4.5-lts.1
import compression from 'compression'; // ^1.7.4
import helmet from 'helmet'; // ^4.6.0
import cors from 'cors'; // ^2.8.5
import rateLimit from 'express-rate-limit'; // ^5.3.0
import { promisify } from 'util';
import { MessageController } from '../controllers/message.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../../constants/roles';
import { ValidationError } from '../../utils/errors';
import { RedisCache } from '../../lib/cache';

// Initialize Redis cache for rate limiting and response caching
const cache = RedisCache.getInstance();

// Configure multer for file uploads with security restrictions
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Only allow one file per request
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
      cb(new ValidationError('Invalid file type'));
    }
  }
});

/**
 * Configures and returns Express router with secure message endpoints
 * @param messageController - Initialized MessageController instance
 * @returns Configured Express router
 */
export function configureMessageRoutes(messageController: MessageController): Router {
  const router = Router();

  // Apply security middleware
  router.use(helmet());
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true
  }));
  router.use(compression());

  // Configure rate limiters
  const createMessageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many messages created. Please try again later.',
    keyGenerator: (req) => req.user?.userId || req.ip
  });

  const getMessagesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many message requests. Please try again later.',
    keyGenerator: (req) => req.user?.userId || req.ip
  });

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
  });

  // Create message endpoint with file upload support
  router.post('/messages',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
    createMessageLimiter,
    upload.single('document'),
    async (req, res, next) => {
      try {
        const message = await messageController.createMessage(req, res, next);
        return message;
      } catch (error) {
        next(error);
      }
    }
  );

  // Get messages endpoint with caching
  router.get('/messages/:threadId',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
    getMessagesLimiter,
    async (req, res, next) => {
      try {
        const cacheKey = `messages:${req.params.threadId}:${req.query.page || 1}`;
        const cachedMessages = await cache.get(cacheKey);

        if (cachedMessages) {
          return res.json(cachedMessages);
        }

        const messages = await messageController.getMessages(req, res, next);
        await cache.set(cacheKey, messages, 300); // Cache for 5 minutes
        return messages;
      } catch (error) {
        next(error);
      }
    }
  );

  // Update message status endpoint
  router.patch('/messages/:id/status',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
    async (req, res, next) => {
      try {
        const message = await messageController.updateMessageStatus(req, res, next);
        return message;
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete message endpoint
  router.delete('/messages/:id',
    authenticate,
    authorize([UserRole.ADMIN, UserRole.TTO, UserRole.ENTREPRENEUR, UserRole.RESEARCHER]),
    async (req, res, next) => {
      try {
        const result = await messageController.deleteMessage(req, res, next);
        return result;
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handling middleware
  router.use((error: Error, _req: any, res: any, next: any) => {
    console.error('Message Route Error:', error);
    if (res.headersSent) {
      return next(error);
    }
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });

  // Graceful shutdown handler
  const cleanup = async () => {
    try {
      await promisify(upload.array('documents'))({} as any, {} as any, () => {});
      console.log('Message routes cleaned up successfully');
    } catch (error) {
      console.error('Error during message routes cleanup:', error);
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return router;
}

export default configureMessageRoutes;