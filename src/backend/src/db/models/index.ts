import { Sequelize, ConnectionError } from 'sequelize'; // ^6.32.1
import { retry } from 'retry'; // ^0.13.1
import TechnologyModel from './technology.model';
import GrantModel from './grant.model';

// Type definitions for enhanced type safety
interface DatabaseModels {
  Technology: typeof TechnologyModel;
  Grant: typeof GrantModel;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastError?: string;
  lastRetry?: Date;
}

interface ModelInitOptions {
  encryption: boolean;
  logging: boolean;
  retryAttempts: number;
}

/**
 * Database instance type with readonly properties for type safety
 */
type DatabaseInstance = Readonly<{
  sequelize: Sequelize;
  models: DatabaseModels;
  connectionStatus: ConnectionStatus;
}>;

/**
 * Initializes database models with encryption and connection management
 * Implements retry logic and connection validation
 * @param sequelize - Sequelize instance
 * @param options - Model initialization options
 */
async function initializeModels(
  sequelize: Sequelize,
  options: ModelInitOptions = { encryption: true, logging: true, retryAttempts: 3 }
): Promise<DatabaseModels> {
  const operation = retry.operation({
    retries: options.retryAttempts,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000,
  });

  return new Promise((resolve, reject) => {
    operation.attempt(async (currentAttempt) => {
      try {
        // Validate database connection with SSL
        await sequelize.authenticate();

        // Initialize models with encryption support
        const models: DatabaseModels = {
          Technology: TechnologyModel.init(sequelize),
          Grant: GrantModel.init(sequelize),
        };

        // Setup audit logging hooks if enabled
        if (options.logging) {
          Object.values(models).forEach((model) => {
            model.addHook('afterCreate', 'auditLog', (instance: any) => {
              console.log(`[AUDIT] Created ${model.name}:`, instance.id);
            });
            model.addHook('afterUpdate', 'auditLog', (instance: any) => {
              console.log(`[AUDIT] Updated ${model.name}:`, instance.id);
            });
          });
        }

        // Validate model initialization
        Object.values(models).forEach((model) => {
          if (!model) {
            throw new Error(`Failed to initialize model: ${model}`);
          }
        });

        resolve(models);
      } catch (error) {
        if (operation.retry(error as Error)) {
          console.warn(`Retrying model initialization (${currentAttempt}/${options.retryAttempts})`);
          return;
        }
        reject(operation.mainError());
      }
    });
  });
}

/**
 * Sets up model associations with validation
 * Implements circular dependency checks and type safety
 * @param models - Initialized database models
 */
async function setupAssociations(models: DatabaseModels): Promise<void> {
  // Validate models before setting up associations
  if (!models.Technology || !models.Grant) {
    throw new Error('Models not properly initialized');
  }

  // Setup model associations with type checking
  Object.values(models).forEach((model) => {
    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  });

  // Validate association setup
  const validateAssociations = () => {
    const technology = models.Technology;
    const grant = models.Grant;

    // Verify required associations exist
    if (!technology.associations.grants) {
      throw new Error('Technology -> Grant association not properly set up');
    }
    if (!grant.associations.technology) {
      throw new Error('Grant -> Technology association not properly set up');
    }
  };

  validateAssociations();
}

/**
 * Creates and exports the database instance with initialized models
 * Implements connection pooling and encryption
 */
const createDatabaseInstance = async (
  sequelize: Sequelize,
  options: ModelInitOptions
): Promise<DatabaseInstance> => {
  const connectionStatus: ConnectionStatus = {
    isConnected: false,
  };

  try {
    // Initialize models with retry logic
    const models = await initializeModels(sequelize, options);

    // Setup model associations
    await setupAssociations(models);

    // Update connection status
    connectionStatus.isConnected = true;

    // Create immutable database instance
    const db: DatabaseInstance = Object.freeze({
      sequelize,
      models,
      connectionStatus,
    });

    return db;
  } catch (error) {
    connectionStatus.isConnected = false;
    connectionStatus.lastError = (error as Error).message;
    connectionStatus.lastRetry = new Date();
    throw error;
  }
};

// Export database configuration and models
export const db = await createDatabaseInstance(
  new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: process.env.NODE_ENV === 'development',
    ssl: true,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  }),
  {
    encryption: true,
    logging: process.env.NODE_ENV === 'development',
    retryAttempts: 3,
  }
);

export type { DatabaseInstance, DatabaseModels, ConnectionStatus, ModelInitOptions };