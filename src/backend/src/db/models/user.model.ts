/**
 * @fileoverview Enhanced Sequelize model for User entity with encryption, validation, and audit logging.
 * Implements RBAC and data classification requirements per technical specifications.
 * @version 1.0.0
 */

import { Model, DataTypes, ValidationError } from 'sequelize'; // v6.35.1
import { User, UserProfile, UserPreferences, UserSecurity } from '../../interfaces/user.interface';
import { UserRole } from '../../constants/roles';
import { encrypt, decrypt } from '../../utils/encryption';

/**
 * Custom type for encrypted JSON fields with automatic encryption/decryption
 */
type EncryptedJSON = {
  get(): any;
  set(value: any): void;
};

/**
 * Enhanced Sequelize model class for User entity with security features
 */
export class UserModel extends Model<User> implements User {
  public id!: string;
  public email!: string;
  public name!: string;
  public role!: UserRole;
  public profile!: UserProfile;
  public preferences!: UserPreferences;
  public security!: UserSecurity;
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastLoginAt!: Date;
  public lastLoginIp!: string;

  /**
   * Custom JSON serializer that implements data classification rules
   * and removes sensitive information
   */
  public toJSON(): Partial<User> {
    const values = super.toJSON() as User;
    
    // Remove sensitive security data
    delete (values as any).security;
    
    // Format dates consistently
    values.createdAt = values.createdAt.toISOString();
    values.updatedAt = values.updatedAt.toISOString();
    if (values.lastLoginAt) {
      values.lastLoginAt = values.lastLoginAt.toISOString();
    }

    return values;
  }

  /**
   * Validates email format and uniqueness
   * @param email Email to validate
   * @throws ValidationError if validation fails
   */
  private static async validateEmail(email: string): Promise<void> {
    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Check email uniqueness
    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
      throw new ValidationError('Email already exists');
    }
  }
}

/**
 * Initialize the User model with schema definition and configuration
 */
UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        async isUnique(value: string) {
          await UserModel.validateEmail(value);
        },
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      validate: {
        isIn: [Object.values(UserRole)],
      },
    },
    profile: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        organization: '',
        title: '',
        phone: '',
        bio: '',
        interests: [],
        avatar: '',
      },
      get() {
        const value = this.getDataValue('profile');
        return value ? decrypt(value) : null;
      },
      set(value: UserProfile) {
        this.setDataValue('profile', encrypt(value));
      },
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        emailNotifications: true,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
      },
      get() {
        const value = this.getDataValue('preferences');
        return value ? decrypt(value) : null;
      },
      set(value: UserPreferences) {
        this.setDataValue('preferences', encrypt(value));
      },
    },
    security: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        mfaEnabled: false,
        lastLogin: new Date(),
        passwordChangedAt: new Date(),
      },
      get() {
        const value = this.getDataValue('security');
        return value ? decrypt(value) : null;
      },
      set(value: UserSecurity) {
        this.setDataValue('security', encrypt(value));
      },
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: true,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: sequelize, // Assuming sequelize instance is imported
    tableName: 'users',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'users_email_idx',
        unique: true,
        fields: ['email'],
      },
      {
        name: 'users_role_idx',
        fields: ['role'],
      },
      {
        name: 'users_last_login_idx',
        fields: ['lastLoginAt'],
      },
      {
        name: 'users_created_at_idx',
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeSave: async (instance: UserModel) => {
        // Validate profile data
        if (!instance.profile || !instance.preferences || !instance.security) {
          throw new ValidationError('Missing required JSON fields');
        }
      },
      afterCreate: async (instance: UserModel) => {
        // Audit logging after user creation
        await AuditLog.create({
          action: 'CREATE_USER',
          userId: instance.id,
          details: {
            email: instance.email,
            role: instance.role,
          },
        });
      },
    },
  }
);

export default UserModel;