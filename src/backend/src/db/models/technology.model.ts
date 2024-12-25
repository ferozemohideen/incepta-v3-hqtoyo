import { Model, DataTypes, QueryTypes, Sequelize } from 'sequelize'; // Version: ^6.32.1
import {
  Technology,
  TechnologyMetadata,
  PatentStatus,
  DevelopmentStage,
  SecurityClassification
} from '../../interfaces/technology.interface';

/**
 * Enhanced Sequelize model for technology transfer listings with security and search optimizations
 * Implements comprehensive data structure with security classifications and audit capabilities
 * @see Technical Specifications/3.2 Database Design/3.2.1 Schema Design
 */
class TechnologyModel extends Model<Technology> {
  public id!: string;
  public title!: string;
  public description!: string;
  public university!: string;
  public patentStatus!: PatentStatus;
  public trl!: number;
  public domains!: string[];
  public metadata!: TechnologyMetadata;
  public securityClassification!: SecurityClassification;
  public auditLog!: object[];
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastSecurityReview!: Date;
  public encryptedFields!: string[];

  /**
   * Initialize the technology model with enhanced security and search capabilities
   * @param sequelize - Sequelize instance
   * @returns Initialized technology model
   */
  public static init(sequelize: Sequelize): typeof TechnologyModel {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [3, 255]
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },
        university: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },
        patentStatus: {
          type: DataTypes.ENUM(...Object.values(PatentStatus)),
          allowNull: false,
          defaultValue: PatentStatus.NOT_PATENTED
        },
        trl: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 9
          }
        },
        domains: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: []
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          validate: {
            isValidMetadata(value: TechnologyMetadata) {
              if (!value.inventors || !Array.isArray(value.inventors)) {
                throw new Error('Inventors array is required');
              }
              if (!Object.values(DevelopmentStage).includes(value.stage)) {
                throw new Error('Invalid development stage');
              }
            }
          }
        },
        securityClassification: {
          type: DataTypes.ENUM(...Object.values(SecurityClassification)),
          allowNull: false,
          defaultValue: SecurityClassification.INTERNAL
        },
        auditLog: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: []
        },
        lastSecurityReview: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        encryptedFields: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: []
        },
        searchVector: {
          type: DataTypes.TSVECTOR,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'technologies',
        indexes: [
          // Optimized search indexes
          {
            name: 'technologies_search_idx',
            using: 'gin',
            fields: ['searchVector']
          },
          {
            name: 'technologies_university_idx',
            fields: ['university']
          },
          {
            name: 'technologies_domains_idx',
            using: 'gin',
            fields: ['domains']
          },
          {
            name: 'technologies_security_idx',
            fields: ['securityClassification']
          }
        ],
        hooks: {
          beforeSave: async (instance: TechnologyModel) => {
            // Update search vector for full-text search
            const searchText = `
              ${instance.title} 
              ${instance.description} 
              ${instance.university} 
              ${instance.domains.join(' ')}
            `;
            const [results] = await sequelize.query(
              'SELECT to_tsvector(:searchText) as vector',
              {
                replacements: { searchText },
                type: QueryTypes.SELECT
              }
            );
            instance.setDataValue('searchVector', (results as any).vector);

            // Update audit log
            const auditLog = instance.auditLog as any[];
            auditLog.push({
              timestamp: new Date(),
              action: instance.isNewRecord ? 'CREATE' : 'UPDATE',
              fields: instance.changed()
            });
          }
        }
      }
    );

    return this;
  }

  /**
   * Set up model associations with enhanced security constraints
   * @param models - Database models object
   */
  public static associate(models: any): void {
    this.belongsTo(models.User, {
      foreignKey: {
        name: 'createdById',
        allowNull: false
      },
      as: 'creator'
    });

    this.hasMany(models.Grant, {
      foreignKey: 'technologyId',
      as: 'grants',
      onDelete: 'CASCADE',
      hooks: true
    });
  }

  /**
   * Validate and update security classification with audit trail
   * @param classification - New security classification
   * @returns Validation result
   */
  public async validateSecurityClassification(
    classification: SecurityClassification
  ): Promise<boolean> {
    const currentLevel = Object.values(SecurityClassification).indexOf(
      this.securityClassification
    );
    const newLevel = Object.values(SecurityClassification).indexOf(classification);

    // Only allow increasing security levels
    if (newLevel < currentLevel) {
      throw new Error('Cannot decrease security classification');
    }

    this.securityClassification = classification;
    this.lastSecurityReview = new Date();
    
    // Update audit log
    const auditLog = this.auditLog as any[];
    auditLog.push({
      timestamp: new Date(),
      action: 'SECURITY_UPDATE',
      previousLevel: this.securityClassification,
      newLevel: classification
    });

    // Update encrypted fields based on classification
    if (classification === SecurityClassification.CONFIDENTIAL) {
      this.encryptedFields = ['description', 'metadata'];
    } else if (classification === SecurityClassification.RESTRICTED) {
      this.encryptedFields = ['description', 'metadata', 'domains'];
    }

    return true;
  }
}

export default TechnologyModel;