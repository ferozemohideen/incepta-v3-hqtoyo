/**
 * @fileoverview Database migration to implement comprehensive role-based access control (RBAC)
 * Creates role_permissions table and adds role management to users table with proper constraints
 * @version 1.0.0
 */

import { QueryInterface, DataTypes } from 'sequelize'; // ^6.32.1
import { UserRole } from '../../constants/roles';

/**
 * Default permission sets for each role based on RolePermissions constant
 */
const DEFAULT_ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: {
    permissions: [
      'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_SYSTEM', 'VIEW_ALL_ANALYTICS',
      'MANAGE_ALL_TECHNOLOGIES', 'MANAGE_ALL_GRANTS', 'MANAGE_ALL_MESSAGES',
      'ACCESS_ADMIN_DASHBOARD', 'CONFIGURE_SYSTEM_SETTINGS', 'AUDIT_SYSTEM_LOGS'
    ]
  },
  [UserRole.TTO]: {
    permissions: [
      'VIEW_TTO_DASHBOARD', 'MANAGE_OWN_TECHNOLOGIES', 'MANAGE_LICENSING_AGREEMENTS',
      'VIEW_TTO_ANALYTICS', 'MANAGE_TTO_MESSAGES', 'EXPORT_TTO_REPORTS',
      'UPDATE_TECHNOLOGY_STATUS', 'REVIEW_LICENSING_REQUESTS', 'MANAGE_DOCUMENT_TEMPLATES',
      'VIEW_ENTREPRENEUR_PROFILES'
    ]
  },
  [UserRole.ENTREPRENEUR]: {
    permissions: [
      'VIEW_ENTREPRENEUR_DASHBOARD', 'SEARCH_TECHNOLOGIES', 'SUBMIT_GRANT_APPLICATIONS',
      'MANAGE_OWN_MESSAGES', 'UPDATE_OWN_PROFILE', 'SAVE_TECHNOLOGIES',
      'REQUEST_TECHNOLOGY_INFO', 'ACCESS_GRANT_TOOLS', 'VIEW_PUBLIC_ANALYTICS',
      'SCHEDULE_TTO_MEETINGS'
    ]
  },
  [UserRole.RESEARCHER]: {
    permissions: [
      'VIEW_RESEARCHER_DASHBOARD', 'UPDATE_RESEARCH_DATA', 'MANAGE_RESEARCH_PROFILE',
      'VIEW_RESEARCH_ANALYTICS', 'SUBMIT_TECHNOLOGY_UPDATES', 'MANAGE_RESEARCH_DOCUMENTS',
      'VIEW_COLLABORATION_OPPORTUNITIES', 'ACCESS_RESEARCH_TOOLS', 'MANAGE_RESEARCH_TEAM',
      'VIEW_GRANT_OPPORTUNITIES'
    ]
  },
  [UserRole.GUEST]: {
    permissions: [
      'VIEW_PUBLIC_TECHNOLOGIES', 'VIEW_PUBLIC_GRANTS', 'CREATE_ACCOUNT',
      'VIEW_PUBLIC_PROFILES', 'ACCESS_PUBLIC_DOCUMENTS', 'SEARCH_PUBLIC_LISTINGS',
      'VIEW_SUCCESS_STORIES', 'ACCESS_HELP_CENTER', 'VIEW_PLATFORM_STATISTICS',
      'CONTACT_SUPPORT'
    ]
  }
};

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    // Create extension for UUID generation if not exists
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create role_permissions table
    await queryInterface.createTable('role_permissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isIn: [Object.values(UserRole)]
        }
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          isValidPermissionSet(value: any) {
            if (!Array.isArray(value)) {
              throw new Error('Permissions must be an array');
            }
          }
        }
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create index on role column
    await queryInterface.addIndex('role_permissions', ['role'], {
      name: 'role_permissions_role_idx',
      using: 'BTREE'
    });

    // Add role column to users table
    await queryInterface.addColumn('users', 'role', {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: UserRole.GUEST
    });

    // Add role validation constraint
    await queryInterface.addConstraint('users', {
      type: 'check',
      name: 'users_role_check',
      fields: ['role'],
      where: {
        role: Object.values(UserRole)
      }
    });

    // Create index on users.role
    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_idx',
      using: 'BTREE'
    });

    // Insert default permission sets
    await queryInterface.bulkInsert('role_permissions', 
      Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, { permissions }]) => ({
        id: queryInterface.sequelize.fn('uuid_generate_v4'),
        role,
        permissions,
        created_at: new Date(),
        updated_at: new Date()
      }))
    );

    // Add foreign key constraint
    await queryInterface.addConstraint('users', {
      fields: ['role'],
      type: 'foreign key',
      name: 'users_role_fkey',
      references: {
        table: 'role_permissions',
        field: 'role'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    // Remove foreign key constraint
    await queryInterface.removeConstraint('users', 'users_role_fkey');

    // Remove role column constraints and index
    await queryInterface.removeConstraint('users', 'users_role_check');
    await queryInterface.removeIndex('users', 'users_role_idx');

    // Remove role column from users
    await queryInterface.removeColumn('users', 'role');

    // Drop role_permissions table and its index
    await queryInterface.dropTable('role_permissions');
  }
};