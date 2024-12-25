import type { Config } from '@jest/types'; // Version ^29.6.1

/**
 * Comprehensive Jest configuration for Incepta backend service
 * Configures test environment, coverage thresholds, TypeScript integration,
 * module resolution, and advanced testing features
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // Define root directories for tests and source files
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // Pattern matching for test files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module path aliases for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@controllers/(.*)': '<rootDir>/src/api/controllers/$1',
    '@middlewares/(.*)': '<rootDir>/src/api/middlewares/$1',
    '@models/(.*)': '<rootDir>/src/db/models/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@interfaces/(.*)': '<rootDir>/src/interfaces/$1',
    '@lib/(.*)': '<rootDir>/src/lib/$1',
    '@tests/(.*)': '<rootDir>/tests/$1'
  },
  
  // Enable code coverage collection
  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  // Configure coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'json',
    'html',
    'cobertura'
  ],
  
  // Set coverage thresholds to ensure high test coverage
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // TypeScript-specific configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }
  },
  
  // Additional test configuration options
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: '50%',
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true
};

export default config;