import { QueryInterface, DataTypes } from 'sequelize';

// Migration version: ^6.32.1
export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Create extension for trigram operations if not exists
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
    );

    // Add new columns to technologies table
    await queryInterface.addColumn('technologies', 'trl', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await queryInterface.addColumn('technologies', 'domains', {
      type: DataTypes.ARRAY(DataTypes.STRING(255)),
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.addColumn('technologies', 'metadata', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    // Add TRL check constraint
    await queryInterface.addConstraint('technologies', {
      type: 'check',
      fields: ['trl'],
      name: 'technologies_trl_check',
      where: {
        trl: {
          [Op.between]: [1, 9]
        }
      }
    });

    // Create GIN index for domains array
    await queryInterface.addIndex('technologies', {
      fields: ['domains'],
      name: 'technologies_domains_gin_idx',
      using: 'GIN',
      concurrently: true
    });

    // Create GiST index for full-text search on description
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY technologies_description_gist_idx 
      ON technologies USING gist (description gist_trgm_ops);
    `);

    // Add metadata validation trigger
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION validate_technology_metadata()
      RETURNS trigger AS $$
      BEGIN
        IF NOT (
          NEW.metadata ? 'patent_status' AND 
          NEW.metadata ? 'development_stage' AND
          NEW.metadata ? 'licensing_status'
        ) THEN
          RAISE EXCEPTION 'Invalid metadata structure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER technology_metadata_validation
      BEFORE INSERT OR UPDATE ON technologies
      FOR EACH ROW
      EXECUTE FUNCTION validate_technology_metadata();
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Drop triggers and functions
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS technology_metadata_validation ON technologies;
      DROP FUNCTION IF EXISTS validate_technology_metadata();
    `);

    // Drop indexes
    await queryInterface.removeIndex('technologies', 'technologies_description_gist_idx');
    await queryInterface.removeIndex('technologies', 'technologies_domains_gin_idx');

    // Remove constraint
    await queryInterface.removeConstraint('technologies', 'technologies_trl_check');

    // Remove columns
    await queryInterface.removeColumn('technologies', 'metadata');
    await queryInterface.removeColumn('technologies', 'domains');
    await queryInterface.removeColumn('technologies', 'trl');
  }
};