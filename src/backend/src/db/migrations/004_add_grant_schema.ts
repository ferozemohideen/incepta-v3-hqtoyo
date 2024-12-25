// @ts-ignore sequelize-cli requires default exports
import { QueryInterface, DataTypes } from 'sequelize'; // v6.32.1

/**
 * Database migration to create grant management schema including:
 * - Enum types for grant types and application statuses
 * - Grants table with full-text search capabilities
 * - Grant applications table with proper relationships
 * - Comprehensive indexing for performance optimization
 */
export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Create enum types
    await queryInterface.sequelize.query(`
      CREATE TYPE grant_type AS ENUM ('SBIR', 'STTR', 'FEDERAL', 'PRIVATE');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE application_status AS ENUM (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
      );
    `);

    // Create grants table
    await queryInterface.createTable('grants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: 'grant_type',
        allowNull: false
      },
      agency: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      deadline: {
        type: DataTypes.DATE,
        allowNull: false
      },
      requirements: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
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

    // Create grant_applications table
    await queryInterface.createTable('grant_applications', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      grant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'grants',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: 'application_status',
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      content: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true
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

    // Create indexes
    await queryInterface.addIndex('grants', ['type'], {
      name: 'grants_type_idx'
    });

    await queryInterface.addIndex('grants', ['deadline'], {
      name: 'grants_deadline_idx'
    });

    // Add GiST index for full-text search
    await queryInterface.sequelize.query(`
      CREATE INDEX grants_description_gist_idx ON grants 
      USING gist(description gist_trgm_ops);
    `);

    await queryInterface.addIndex('grant_applications', ['user_id'], {
      name: 'grant_applications_user_id_idx'
    });

    await queryInterface.addIndex('grant_applications', ['status'], {
      name: 'grant_applications_status_idx'
    });

    // Add updated_at trigger for automatic timestamp updates
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_grants_updated_at
        BEFORE UPDATE ON grants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_grant_applications_updated_at
        BEFORE UPDATE ON grant_applications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Drop triggers first
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_grant_applications_updated_at ON grant_applications;
    `);
    
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_grants_updated_at ON grants;
    `);

    // Drop function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Drop indexes
    await queryInterface.removeIndex('grant_applications', 'grant_applications_status_idx');
    await queryInterface.removeIndex('grant_applications', 'grant_applications_user_id_idx');
    await queryInterface.removeIndex('grants', 'grants_deadline_idx');
    await queryInterface.removeIndex('grants', 'grants_type_idx');
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS grants_description_gist_idx;
    `);

    // Drop tables
    await queryInterface.dropTable('grant_applications');
    await queryInterface.dropTable('grants');

    // Drop enum types
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS application_status;`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS grant_type;`);
  }
};