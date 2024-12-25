# Incepta Web Frontend

[![Build Status](https://github.com/incepta/web/actions/workflows/ci.yml/badge.svg)](https://github.com/incepta/web/actions)
[![Coverage](https://codecov.io/gh/incepta/web/branch/main/graph/badge.svg)](https://codecov.io/gh/incepta/web)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=incepta_web&metric=alert_status)](https://sonarcloud.io/dashboard?id=incepta_web)
[![Dependencies](https://status.david-dm.org/gh/incepta/web.svg)](https://david-dm.org/incepta/web)

Incepta's web frontend is a modern, TypeScript-based React application that powers the technology transfer and grant matching platform. This application provides an intuitive interface for discovering licensable technologies, managing grant applications, and facilitating communication between TTOs and entrepreneurs.

## Prerequisites

- Node.js 18+ LTS
- npm 9+
- Git 2.40+
- VS Code (recommended)

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript + JavaScript Language Features
- Material-UI Snippets
- Jest Runner
- GitLens

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/incepta/web.git
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.development.example .env.development
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/web/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── features/          # Feature-specific modules
│   ├── hooks/            # Custom React hooks
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route components
│   ├── services/         # API services
│   ├── store/            # Redux store configuration
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── tests/                # Test files
├── .env.development      # Development environment variables
├── .env.production       # Production environment variables
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Technology Stack

- **Framework**: React 18.2.0
- **Language**: TypeScript 5.0+
- **State Management**: Redux Toolkit 1.9+
- **Data Fetching**: React Query 4.0+
- **UI Components**: Material UI v5
- **Forms**: React Hook Form 7.0+
- **Testing**: Jest + React Testing Library
- **Build Tool**: Vite
- **Styling**: Emotion (MUI's styling solution)

## Development Guidelines

### Code Style

We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with TypeScript adaptations. ESLint and Prettier are configured to enforce these standards.

### Component Development

```typescript
// Example of a well-structured component
import { FC, memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { TechnologyCardProps } from '@/types';

export const TechnologyCard: FC<TechnologyCardProps> = memo(({
  title,
  description,
  university,
  patentStatus
}) => (
  <Box sx={{ p: 2, border: 1, borderColor: 'divider' }}>
    <Typography variant="h6">{title}</Typography>
    <Typography variant="body2">{description}</Typography>
    <Typography variant="caption">
      {university} • {patentStatus}
    </Typography>
  </Box>
));
```

### Testing

We maintain 80%+ test coverage. Run tests with:

```bash
# Unit tests
npm run test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Environment Configuration

### Development
```env
VITE_API_URL=http://localhost:8080
VITE_AUTH_DOMAIN=auth.incepta-dev.com
VITE_ENVIRONMENT=development
```

### Production
```env
VITE_API_URL=https://api.incepta.com
VITE_AUTH_DOMAIN=auth.incepta.com
VITE_ENVIRONMENT=production
```

## Build and Deployment

### Production Build

```bash
npm run build
```

The build output will be in the `dist` directory.

### Deployment

Deployments are automated through GitHub Actions:
- Push to `develop` deploys to staging
- Push to `main` deploys to production

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

### Pull Request Requirements

- Passes all tests
- Maintains or improves test coverage
- Follows code style guidelines
- Includes documentation updates
- Contains meaningful commit messages

## Troubleshooting

### Common Issues

1. **Build Failures**
```bash
# Clear build cache
npm run clean

# Reinstall dependencies
rm -rf node_modules
npm install
```

2. **Type Errors**
```bash
# Regenerate TypeScript types
npm run types:generate
```

3. **Development Server Issues**
```bash
# Clear Vite cache
npm run dev:clean
```

## License

Copyright © 2023 Incepta. All rights reserved.

## Support

For technical support, please contact:
- Email: dev-support@incepta.com
- Slack: #web-frontend