/**
 * @fileoverview Sequelize model definition for secure message management system
 * Implements encrypted messaging, document sharing, and real-time status tracking
 * with comprehensive audit logging and performance optimization.
 * @version 1.0.0
 */

import { Model, DataTypes } from 'sequelize'; // ^6.32.1
import { Message, MessageType, MessageStatus, MessageMetadata } from '../../interfaces/message.interface';

/**
 * Sequelize model class for encrypted messages with document sharing,
 * status tracking, and audit logging support
 */
export class MessageModel extends Model<Message> implements Message {
  public id!: string;
  public threadId!: string;
  public senderId!: string;
  public recipientId!: string;
  public type!: MessageType;
  public content!: string;
  public status!: MessageStatus;
  public metadata!: MessageMetadata;
  public isEncrypted!: boolean;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  /**
   * Defines model associations with User model and implements cascading soft deletes
   * @param models - Object containing all registered models
   */
  public static associate(models: Record<string, any>): void {
    MessageModel.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender',
      onDelete: 'CASCADE'
    });

    MessageModel.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient',
      onDelete: 'CASCADE'
    });
  }
}

/**
 * Initialize the Message model with its attributes and options
 */
export const initMessageModel = (sequelize: any): typeof MessageModel => {
  MessageModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the message'
      },
      threadId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Groups related messages for efficient retrieval'
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'References the message sender'
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'References the message recipient'
      },
      type: {
        type: DataTypes.ENUM(...Object.values(MessageType)),
        allowNull: false,
        comment: 'Indicates message content type'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Encrypted message content'
      },
      status: {
        type: DataTypes.ENUM(...Object.values(MessageStatus)),
        allowNull: false,
        defaultValue: MessageStatus.SENT,
        comment: 'Tracks message delivery status'
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Stores document properties and audit information'
      },
      isEncrypted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indicates if message content is encrypted'
      }
    },
    {
      sequelize,
      tableName: 'messages',
      timestamps: true,
      paranoid: true, // Enables soft deletes
      indexes: [
        {
          fields: ['threadId'],
          type: 'BTREE',
          name: 'idx_messages_thread'
        },
        {
          fields: ['senderId'],
          type: 'BTREE',
          name: 'idx_messages_sender'
        },
        {
          fields: ['recipientId'],
          type: 'BTREE',
          name: 'idx_messages_recipient'
        },
        {
          fields: ['type'],
          type: 'BTREE',
          name: 'idx_messages_type'
        },
        {
          fields: ['status'],
          type: 'BTREE',
          name: 'idx_messages_status'
        },
        {
          fields: ['createdAt'],
          type: 'BTREE',
          name: 'idx_messages_created'
        }
      ]
    }
  );

  return MessageModel;
};

export default MessageModel;