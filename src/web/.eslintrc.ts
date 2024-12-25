// ESLint configuration for Incepta Frontend Application
// Dependencies:
// eslint: ^8.40.0
// @typescript-eslint/parser: ^5.59.0
// @typescript-eslint/eslint-plugin: ^5.59.0
// eslint-plugin-react: ^7.32.0
// eslint-plugin-react-hooks: ^4.6.0
// eslint-config-prettier: ^8.8.0

module.exports = {
  // Specify parser for TypeScript
  parser: '@typescript-eslint/parser',

  // Parser options
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json', // Reference to TypeScript configuration
  },

  // Environments where code will run
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },

  // Plugin dependencies
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],

  // Configuration extends
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other formatting rules
  ],

  // React version detection
  settings: {
    react: {
      version: 'detect',
    },
  },

  // Custom rule configurations
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'off', // Allow type inference for function returns
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow type inference for exported functions
    '@typescript-eslint/no-explicit-any': 'warn', // Warn on usage of 'any' type
    '@typescript-eslint/no-unused-vars': ['error', {
      'argsIgnorePattern': '^_', // Allow unused variables that start with underscore
    }],

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Not needed with TypeScript
    'react-hooks/rules-of-hooks': 'error', // Enforce hooks rules
    'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies in hooks

    // General JavaScript/TypeScript rules
    'no-console': ['warn', {
      allow: ['warn', 'error'], // Only allow console.warn and console.error
    }],
    'prefer-const': 'error', // Require const declarations for variables that are never reassigned
    'no-var': 'error', // Disallow var declarations
    'eqeqeq': ['error', 'always'], // Require strict equality comparisons

    // Additional best practices
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'error',
    'no-throw-literal': 'error',
    'prefer-template': 'error',
    'require-await': 'error',
    'no-return-await': 'error',
    'no-await-in-loop': 'warn',
    'no-floating-decimal': 'error',
    'no-implied-eval': 'error',
    'no-lone-blocks': 'error',
    'no-multi-spaces': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-spread': 'error',
    'radix': 'error',
    'wrap-iife': ['error', 'any'],
  },

  // Override rules for specific file patterns
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['**/stories/**/*'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};