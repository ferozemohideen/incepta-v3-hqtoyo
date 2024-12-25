import { Client } from '@elastic/elasticsearch'; // v8.9.0
import { Technology, SecurityClassification, TechnologySearchParams } from '../../interfaces/technology.interface';
import { elasticsearchConfig } from '../../config/elasticsearch.config';

/**
 * Technology index name from configuration
 */
const TECHNOLOGY_INDEX_NAME = elasticsearchConfig.indices.technology;

/**
 * Technology index settings with custom analyzers and filters
 */
const TECHNOLOGY_INDEX_SETTINGS = {
  number_of_shards: elasticsearchConfig.settings.numberOfShards,
  number_of_replicas: elasticsearchConfig.settings.numberOfReplicas,
  refresh_interval: elasticsearchConfig.settings.refreshInterval,
  analysis: {
    analyzer: {
      technology_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: [
          'lowercase',
          'asciifolding',
          'stop',
          'snowball',
          'technology_synonyms'
        ]
      }
    },
    filter: {
      technology_synonyms: {
        type: 'synonym',
        synonyms_path: 'analysis/technology_synonyms.txt'
      }
    }
  }
};

/**
 * Technology index mapping with field-level security
 */
export const technologyIndexMapping = {
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'technology_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'completion' }
        }
      },
      description: {
        type: 'text',
        analyzer: 'technology_analyzer'
      },
      university: {
        type: 'keyword',
        fields: {
          text: { type: 'text' }
        }
      },
      patentStatus: { type: 'keyword' },
      trl: { type: 'integer' },
      domains: { type: 'keyword' },
      metadata: {
        properties: {
          inventors: { type: 'keyword' },
          patentNumber: { type: 'keyword' },
          filingDate: { type: 'date' },
          keywords: {
            type: 'text',
            analyzer: 'technology_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          stage: { type: 'keyword' },
          publications: {
            properties: {
              title: { type: 'text' },
              authors: { type: 'keyword' },
              journal: { type: 'keyword' },
              doi: { type: 'keyword' },
              year: { type: 'integer' },
              url: { type: 'keyword' }
            }
          },
          fundingHistory: {
            properties: {
              source: { type: 'keyword' },
              amount: { type: 'double' },
              grantNumber: { type: 'keyword' },
              startDate: { type: 'date' },
              endDate: { type: 'date' },
              status: { type: 'keyword' }
            }
          }
        }
      },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      securityLevel: { type: 'keyword' }
    },
    _source: {
      excludes: ['metadata.fundingHistory.amount']
    }
  },
  settings: TECHNOLOGY_INDEX_SETTINGS
};

/**
 * Creates or updates the technology index with security configurations
 * @param client Elasticsearch client instance
 */
export async function createTechnologyIndex(client: Client): Promise<void> {
  const indexExists = await client.indices.exists({
    index: TECHNOLOGY_INDEX_NAME
  });

  if (!indexExists) {
    await client.indices.create({
      index: TECHNOLOGY_INDEX_NAME,
      ...technologyIndexMapping,
      aliases: {
        'technologies_write': {},
        'technologies_read': {}
      }
    });

    // Configure field-level security
    await client.security.putRole({
      name: 'technology_reader',
      body: {
        indices: [{
          names: [TECHNOLOGY_INDEX_NAME],
          privileges: ['read'],
          field_security: {
            grant: ['*'],
            except: ['metadata.fundingHistory.amount']
          }
        }]
      }
    });
  }
}

/**
 * Builds an Elasticsearch query for technology search with security filtering
 * @param searchParams Search parameters for filtering technologies
 * @param securityContext User's security context for access control
 * @returns Elasticsearch query DSL object
 */
export function buildTechnologySearchQuery(
  searchParams: TechnologySearchParams,
  securityContext: { allowedLevels: SecurityClassification[] }
): object {
  const query: any = {
    bool: {
      must: [],
      filter: [
        {
          terms: {
            securityLevel: securityContext.allowedLevels
          }
        }
      ]
    }
  };

  // Full-text search across title and description
  if (searchParams.query) {
    query.bool.must.push({
      multi_match: {
        query: searchParams.query,
        fields: [
          'title^3',
          'description^2',
          'metadata.keywords^2',
          'university'
        ],
        type: 'best_fields',
        operator: 'and',
        fuzziness: 'AUTO'
      }
    });
  }

  // Apply filters
  if (searchParams.universities?.length) {
    query.bool.filter.push({
      terms: { university: searchParams.universities }
    });
  }

  if (searchParams.patentStatus?.length) {
    query.bool.filter.push({
      terms: { patentStatus: searchParams.patentStatus }
    });
  }

  if (searchParams.trlRange) {
    query.bool.filter.push({
      range: {
        trl: {
          gte: searchParams.trlRange.min,
          lte: searchParams.trlRange.max
        }
      }
    });
  }

  if (searchParams.domains?.length) {
    query.bool.filter.push({
      terms: { domains: searchParams.domains }
    });
  }

  if (searchParams.dateRange) {
    query.bool.filter.push({
      range: {
        createdAt: {
          gte: searchParams.dateRange.start,
          lte: searchParams.dateRange.end
        }
      }
    });
  }

  return {
    query,
    sort: buildSortCriteria(searchParams),
    highlight: {
      fields: {
        title: {},
        description: {},
        'metadata.keywords': {}
      },
      pre_tags: ['<em>'],
      post_tags: ['</em>']
    },
    aggs: {
      universities: {
        terms: { field: 'university' }
      },
      patent_status: {
        terms: { field: 'patentStatus' }
      },
      domains: {
        terms: { field: 'domains' }
      },
      avg_trl: {
        avg: { field: 'trl' }
      }
    },
    size: searchParams.limit || 10,
    from: (searchParams.page || 0) * (searchParams.limit || 10),
    track_total_hits: true
  };
}

/**
 * Builds sort criteria based on search parameters
 * @param searchParams Search parameters containing sort options
 * @returns Sort criteria array for Elasticsearch
 */
function buildSortCriteria(searchParams: TechnologySearchParams): any[] {
  const defaultSort = [
    { _score: { order: 'desc' } },
    { createdAt: { order: 'desc' } }
  ];

  if (!searchParams.sortBy) {
    return defaultSort;
  }

  switch (searchParams.sortBy) {
    case 'DATE_DESC':
      return [{ createdAt: { order: 'desc' } }];
    case 'TRL_DESC':
      return [{ trl: { order: 'desc' } }];
    case 'UNIVERSITY':
      return [{ 'university.keyword': { order: 'asc' } }];
    default:
      return defaultSort;
  }
}