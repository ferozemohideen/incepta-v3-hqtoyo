// @mui/material v5.14.0
import React, { useCallback } from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { CustomCard } from '../common/Card';
import StatisticsChart from './StatisticsChart';
import ErrorBoundary from '../common/ErrorBoundary';
import { SPACING, ANIMATION } from '../../constants/ui.constants';

/**
 * Interface for data points used in analytics visualization
 */
export interface ChartDataPoint {
  timestamp: string;
  value: number | number[];
  label: string;
  series?: string[];
}

/**
 * Props interface for the AnalyticsCard component
 */
export interface AnalyticsCardProps {
  /** Card title with proper accessibility label */
  title: string;
  /** Optional description text */
  description?: string;
  /** Array of data points for visualization */
  data: ChartDataPoint[];
  /** Loading state indicator */
  loading?: boolean;
  /** Optional card height in pixels */
  height?: number;
  /** Optional callback for data export */
  onExport?: () => void;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * AnalyticsCard component for displaying metrics and trends
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  description,
  data,
  loading = false,
  height = 400,
  onExport,
  ariaLabel,
}) => {
  const theme = useTheme();

  // Calculate responsive padding based on viewport
  const getPadding = useCallback(() => {
    return {
      xs: SPACING.SCALE.sm,
      sm: SPACING.SCALE.md,
      md: SPACING.SCALE.md,
    }[theme.breakpoints.keys[0]] || SPACING.SCALE.md;
  }, [theme.breakpoints]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onExport) {
      onExport();
    }
  }, [onExport]);

  return (
    <ErrorBoundary>
      <CustomCard
        elevation={1}
        fullHeight
        aria-label={ariaLabel || `Analytics card for ${title}`}
        role="region"
        sx={{
          transition: theme.transitions.create(['box-shadow', 'transform'], {
            duration: ANIMATION.DURATION_MEDIUM,
          }),
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <Box
          p={getPadding()}
          height={height}
          display="flex"
          flexDirection="column"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <Box mb={2}>
            <Typography
              variant="h6"
              component="h2"
              gutterBottom
              color="textPrimary"
              sx={{ fontWeight: 500 }}
            >
              <Tooltip
                title={title}
                placement="top"
                arrow
                enterDelay={500}
              >
                <span>{title}</span>
              </Tooltip>
            </Typography>
            
            {description && (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {description}
              </Typography>
            )}
          </Box>

          <Box flexGrow={1} minHeight={0}>
            <StatisticsChart
              data={data}
              title={title}
              description={description}
              loading={loading}
            />
          </Box>
        </Box>
      </CustomCard>
    </ErrorBoundary>
  );
};

// Default export
export default AnalyticsCard;