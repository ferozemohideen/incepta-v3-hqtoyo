/**
 * @fileoverview Message validation middleware with enhanced security measures
 * Implements comprehensive validation for the secure messaging system
 * @version 1.0.0
 */

import Joi from 'joi'; // Version: 17.9.0
import xss from 'xss'; // Version: 1.0.14
import { Message, MessageType, MessageStatus } from '../../interfaces/message.interface';
import { validateMessage } from '../../utils/validation';
import { UserRole } from '../../constants/roles';

// Cache compiled schemas for performance
const messageSchema = Joi.object().keys({
  content: Joi.string().min(1).max(10000).required()
    .custom((value, helpers) => {
      // Apply XSS sanitization
      const sanitized = xss(value, {
        whiteList: {}, // Strict mode - no HTML allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
      });
      return sanitized;
    }),
  threadId: Joi.string().uuid().required(),
  type: Joi.string().valid(MessageType.TEXT, MessageType.DOCUMENT).required(),
  metadata: Joi.object({
    documentUrl: Joi.string().uri().when('type', {
      is: MessageType.DOCUMENT,
      then: Joi.required()
    }),
    fileName: Joi.string().when('type', {
      is: MessageType.DOCUMENT,
      then: Joi.required()
    }),
    fileSize: Joi.number().positive().when('type', {
      is: MessageType.DOCUMENT,
      then: Joi.required()
    }),
    contentType: Joi.string().when('type', {
      is: MessageType.DOCUMENT,
      then: Joi.required()
    }),
    checksum: Joi.string().when('type', {
      is: MessageType.DOCUMENT,
      then: Joi.required()
    }),
    uploadedAt: Joi.date().iso(),
    expiresAt: Joi.date().iso().greater('now'),
    encryptionKey: Joi.string().min(32)
  }).when('type', {
    is: MessageType.DOCUMENT,
    then: Joi.required()
  })
}).options({ stripUnknown: true });

const messageUpdateSchema = Joi.object().keys({
  id: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(10000),
  status: Joi.string().valid(...Object.values(MessageStatus)),
  lastModified: Joi.date().iso().required()
}).options({ stripUnknown: true });

const messageQuerySchema = Joi.object().keys({
  threadId: Joi.string().uuid(),
  page: Joi.number().integer().min(1).max(100).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  sort: Joi.string().valid('ASC', 'DESC').default('DESC')
}).options({ stripUnknown: true });

/**
 * Rate limiting configuration for message operations
 */
const RATE_LIMITS = {
  CREATE: { windowMs: 60000, max: 30 }, // 30 messages per minute
  UPDATE: { windowMs: 60000, max: 60 }, // 60 updates per minute
  QUERY: { windowMs: 60000, max: 100 } // 100 queries per minute
};

/**
 * Validates message creation requests with enhanced security checks
 */
export const validateCreateMessage = async (req: any, res: any, next: any): Promise<void> => {
  try {
    // Validate rate limits
    const userKey = `${req.user.id}:create`;
    if (!checkRateLimit(userKey, RATE_LIMITS.CREATE)) {
      res.status(429).json({
        error: 'Rate limit exceeded for message creation',
        retryAfter: getRateLimitReset(userKey)
      });
      return;
    }

    // Schema validation
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Invalid message format',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Additional security checks for document messages
    if (value.type === MessageType.DOCUMENT) {
      const validationResult = await validateDocumentMessage(value);
      if (!validationResult.isValid) {
        res.status(400).json({
          error: 'Invalid document message',
          details: validationResult.errors
        });
        return;
      }
    }

    // Sanitize and assign validated data
    req.validatedMessage = value;
    next();
  } catch (err) {
    res.status(500).json({
      error: 'Message validation failed',
      message: err.message
    });
  }
};

/**
 * Validates message update requests with permission checks
 */
export const validateUpdateMessage = async (req: any, res: any, next: any): Promise<void> => {
  try {
    // Validate rate limits
    const userKey = `${req.user.id}:update`;
    if (!checkRateLimit(userKey, RATE_LIMITS.UPDATE)) {
      res.status(429).json({
        error: 'Rate limit exceeded for message updates',
        retryAfter: getRateLimitReset(userKey)
      });
      return;
    }

    // Schema validation
    const { error, value } = messageUpdateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Invalid update format',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Permission checks
    const canUpdate = await checkUpdatePermissions(req.user, value.id);
    if (!canUpdate) {
      res.status(403).json({
        error: 'Insufficient permissions to update message'
      });
      return;
    }

    // Sanitize and assign validated data
    req.validatedUpdate = value;
    next();
  } catch (err) {
    res.status(500).json({
      error: 'Update validation failed',
      message: err.message
    });
  }
};

/**
 * Validates message retrieval requests with pagination and filtering
 */
export const validateGetMessages = async (req: any, res: any, next: any): Promise<void> => {
  try {
    // Validate rate limits
    const userKey = `${req.user.id}:query`;
    if (!checkRateLimit(userKey, RATE_LIMITS.QUERY)) {
      res.status(429).json({
        error: 'Rate limit exceeded for message queries',
        retryAfter: getRateLimitReset(userKey)
      });
      return;
    }

    // Schema validation
    const { error, value } = messageQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Thread access permission check
    if (value.threadId) {
      const hasAccess = await checkThreadAccess(req.user, value.threadId);
      if (!hasAccess) {
        res.status(403).json({
          error: 'Insufficient permissions to access thread'
        });
        return;
      }
    }

    // Optimize query parameters
    value.page = value.page || 1;
    value.limit = value.limit || 20;
    
    // Assign validated query
    req.validatedQuery = value;
    next();
  } catch (err) {
    res.status(500).json({
      error: 'Query validation failed',
      message: err.message
    });
  }
};

/**
 * Helper function to validate document message security
 */
async function validateDocumentMessage(message: any): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Validate file signature
  if (!isValidFileSignature(message.metadata.contentType, message.metadata.checksum)) {
    errors.push('Invalid file signature');
  }

  // Validate file size limits
  const maxSize = getMaxFileSize(message.metadata.contentType);
  if (message.metadata.fileSize > maxSize) {
    errors.push(`File size exceeds maximum allowed (${maxSize} bytes)`);
  }

  // Validate document URL security
  if (!isSecureUrl(message.metadata.documentUrl)) {
    errors.push('Document URL must use HTTPS protocol');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to check message update permissions
 */
async function checkUpdatePermissions(user: any, messageId: string): Promise<boolean> {
  // Admins can update any message
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Users can update their own messages
  const message = await getMessage(messageId);
  return message && message.senderId === user.id;
}

/**
 * Helper function to check thread access permissions
 */
async function checkThreadAccess(user: any, threadId: string): Promise<boolean> {
  const thread = await getThread(threadId);
  return thread && thread.participantIds.includes(user.id);
}

// Additional helper functions would be implemented here
// - checkRateLimit()
// - getRateLimitReset()
// - isValidFileSignature()
// - getMaxFileSize()
// - isSecureUrl()
// - getMessage()
// - getThread()