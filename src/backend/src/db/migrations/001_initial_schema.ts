import { QueryInterface, DataTypes } from 'sequelize'; // ^6.32.1

/**
 * Initial database migration that establishes the core schema for the Incepta platform.
 * Implements comprehensive security, search optimization, and data integrity features
 * for users, technologies, grants, and messaging systems.
 */

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Enable required PostgreSQL extensions
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

    // Create users table with RBAC and security metadata
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['admin', 'tto', 'entrepreneur', 'researcher']]
        }
      },
      profile: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      security: {
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

    // Create technologies table
    await queryInterface.createTable('technologies', {
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
      university: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      patent_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['pending', 'granted', 'provisional']]
        }
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      search_vector: {
        type: DataTypes.TSVECTOR,
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
      search_vector: {
        type: DataTypes.TSVECTOR,
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

    // Create messages table
    await queryInterface.createTable('messages', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      thread_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      attachments: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // Create optimized indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_idx',
      unique: true
    });

    await queryInterface.addIndex('users', ['role'], {
      name: 'users_role_idx'
    });

    await queryInterface.addIndex('technologies', ['university', 'patent_status'], {
      name: 'technologies_university_patent_idx'
    });

    await queryInterface.addIndex('technologies', {
      fields: ['search_vector'],
      using: 'gin',
      name: 'technologies_search_idx'
    });

    await queryInterface.addIndex('grants', ['deadline'], {
      name: 'grants_deadline_idx'
    });

    await queryInterface.addIndex('grants', {
      fields: ['search_vector'],
      using: 'gin',
      name: 'grants_search_idx'
    });

    await queryInterface.addIndex('messages', ['thread_id', 'created_at'], {
      name: 'messages_thread_time_idx'
    });

    // Create triggers for search vector updates
    await queryInterface.sequelize.query(`
      CREATE TRIGGER technologies_search_vector_update
      BEFORE INSERT OR UPDATE ON technologies
      FOR EACH ROW EXECUTE FUNCTION
      tsvector_update_trigger(search_vector, 'pg_catalog.english', title, description);
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER grants_search_vector_update
      BEFORE INSERT OR UPDATE ON grants
      FOR EACH ROW EXECUTE FUNCTION
      tsvector_update_trigger(search_vector, 'pg_catalog.english', title, agency);
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Drop triggers
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS technologies_search_vector_update ON technologies');
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS grants_search_vector_update ON grants');

    // Drop tables with cascading
    await queryInterface.dropTable('messages', { cascade: true });
    await queryInterface.dropTable('grants', { cascade: true });
    await queryInterface.dropTable('technologies', { cascade: true });
    await queryInterface.dropTable('users', { cascade: true });

    // Disable extensions
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "pg_trgm"');
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
};