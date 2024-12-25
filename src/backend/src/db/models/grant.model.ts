import { Model, DataTypes, Sequelize, Optional } from 'sequelize'; // ^6.32.1
import { IGrant, GrantType, GrantStatus } from '../../interfaces/grant.interface';

// Attributes interface for Grant creation
interface GrantCreationAttributes extends Optional<IGrant, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Sequelize model class for grants in the Incepta platform
 * Implements comprehensive grant management functionality with support for
 * complex queries, relationships, and validation
 */
class GrantModel extends Model<IGrant, GrantCreationAttributes> implements IGrant {
  public id!: string;
  public title!: string;
  public description!: string;
  public type!: GrantType;
  public agency!: string;
  public amount!: number;
  public deadline!: Date;
  public requirements!: Record<string, unknown>;
  public eligibilityCriteria!: string[];
  public focusAreas!: string[];
  public applicationUrl!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  /**
   * Initialize the grant model with Sequelize
   * Sets up attributes, indexes, and validation rules
   */
  public static init(sequelize: Sequelize): typeof GrantModel {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [3, 255],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        type: {
          type: DataTypes.ENUM(...Object.values(GrantType)),
          allowNull: false,
        },
        agency: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        deadline: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: true,
            isAfter: new Date().toISOString(), // Must be in the future
          },
        },
        requirements: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        eligibilityCriteria: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        focusAreas: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        applicationUrl: {
          type: DataTypes.STRING(512),
          allowNull: false,
          validate: {
            isUrl: true,
          },
        },
        status: {
          type: DataTypes.ENUM(...Object.values(GrantStatus)),
          allowNull: false,
          defaultValue: GrantStatus.DRAFT,
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
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Grant',
        tableName: 'grants',
        paranoid: true, // Enables soft deletes
        indexes: [
          {
            name: 'grants_deadline_idx',
            fields: ['deadline'],
          },
          {
            name: 'grants_type_idx',
            fields: ['type'],
          },
          {
            name: 'grants_agency_idx',
            fields: ['agency'],
          },
          {
            name: 'grants_amount_idx',
            fields: ['amount'],
          },
          {
            name: 'grants_status_idx',
            fields: ['status'],
          },
          {
            name: 'grants_focus_areas_idx',
            fields: ['focusAreas'],
            using: 'gin',
          },
        ],
      }
    );

    return GrantModel;
  }

  /**
   * Establish relationships between grants and other models
   * Sets up associations with Technology and User models
   */
  public static associate(models: any): void {
    // Grant belongs to a Technology
    this.belongsTo(models.Technology, {
      foreignKey: 'technologyId',
      as: 'technology',
    });

    // Grant has many Users through Applications
    this.belongsToMany(models.User, {
      through: models.GrantApplication,
      foreignKey: 'grantId',
      as: 'applicants',
    });
  }

  /**
   * Find grants by deadline range
   * Useful for discovering upcoming opportunities
   */
  public static async findByDeadline(
    startDate: Date,
    endDate: Date
  ): Promise<GrantModel[]> {
    return this.findAll({
      where: {
        deadline: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['deadline', 'ASC']],
    });
  }

  /**
   * Find grants matching a specific technology
   * Uses focus areas and requirements for matching
   */
  public static async findByTechnology(
    technologyId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ rows: GrantModel[]; count: number }> {
    return this.findAndCountAll({
      where: {
        technologyId,
      },
      ...options,
      order: [['deadline', 'ASC']],
    });
  }
}

export default GrantModel;