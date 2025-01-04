// @mui/material v5.14.0
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Grid, Box, Typography, Alert, useTheme, useMediaQuery } from '@mui/material';
import DashboardLayout from '../../layouts/DashboardLayout';
import AnalyticsCard from '../../components/dashboard/AnalyticsCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { apiService } from '../../services/api.service';
import { API_ENDPOINTS } from '../../constants/api.constants';

// Interface for analytics data structure
interface AnalyticsData {
  userMetrics: ChartDataPoint[];
  technologyMetrics: ChartDataPoint[];
  grantMetrics: ChartDataPoint[];
  matchingMetrics: ChartDataPoint[];
}

// Interface for chart data points
interface ChartDataPoint {
  timestamp: string;
  value: number | number[];
  label: string;
  series?: string[];
}

// Refresh intervals in milliseconds
const REFRESH_INTERVALS = {
  REAL_TIME: 5000,
  STANDARD: 30000,
  SLOW: 60000,
} as const;

/**
 * Analytics Dashboard Page Component
 * Implements real-time data visualization with role-based access control
 */
const Analytics: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized role-based metrics configuration
  const metricsConfig = useMemo(() => ({
    userMetrics: {
      title: 'User Engagement',
      description: 'Active users, retention rates, and growth metrics',
      visible: ['admin', 'tto'].includes(user?.role || ''),
      refreshInterval: REFRESH_INTERVALS.STANDARD,
    },
    technologyMetrics: {
      title: 'Technology Performance',
      description: 'Listing views, matches, and licensing metrics',
      visible: true,
      refreshInterval: REFRESH_INTERVALS.REAL_TIME,
    },
    grantMetrics: {
      title: 'Grant Analytics',
      description: 'Application success rates and funding metrics',
      visible: true,
      refreshInterval: REFRESH_INTERVALS.STANDARD,
    },
    matchingMetrics: {
      title: 'Matching Analytics',
      description: 'Technology-entrepreneur matching success rates',
      visible: true,
      refreshInterval: REFRESH_INTERVALS.SLOW,
    },
  }), [user?.role]);

  // Fetch analytics data with error handling
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const response = await apiService.get<AnalyticsData>(
        API_ENDPOINTS.ANALYTICS.BASE,
        { role: user?.role }
      );
      setAnalyticsData(response);
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to fetch analytics data';
      setError(errorMessage);
      showNotification({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, showNotification]);

  // Initialize data and set up refresh intervals
  useEffect(() => {
    fetchAnalyticsData();

    // Set up different refresh intervals for different metrics
    const intervals = Object.values(metricsConfig)
      .filter(config => config.visible)
      .map(config => {
        return setInterval(fetchAnalyticsData, config.refreshInterval);
      });

    return () => intervals.forEach(interval => clearInterval(interval));
  }, [fetchAnalyticsData, metricsConfig]);

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h4" gutterBottom component="h1">
            Analytics Dashboard
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={isMobile ? 2 : 3}>
            {/* User Metrics */}
            {metricsConfig.userMetrics.visible && (
              <Grid item xs={12} md={6}>
                <AnalyticsCard
                  title={metricsConfig.userMetrics.title}
                  description={metricsConfig.userMetrics.description}
                  data={analyticsData?.userMetrics || []}
                  loading={loading}
                  refreshInterval={metricsConfig.userMetrics.refreshInterval}
                />
              </Grid>
            )}

            {/* Technology Metrics */}
            <Grid item xs={12} md={6}>
              <AnalyticsCard
                title={metricsConfig.technologyMetrics.title}
                description={metricsConfig.technologyMetrics.description}
                data={analyticsData?.technologyMetrics || []}
                loading={loading}
                refreshInterval={metricsConfig.technologyMetrics.refreshInterval}
              />
            </Grid>

            {/* Grant Metrics */}
            <Grid item xs={12} md={6}>
              <AnalyticsCard
                title={metricsConfig.grantMetrics.title}
                description={metricsConfig.grantMetrics.description}
                data={analyticsData?.grantMetrics || []}
                loading={loading}
                refreshInterval={metricsConfig.grantMetrics.refreshInterval}
              />
            </Grid>

            {/* Matching Metrics */}
            <Grid item xs={12} md={6}>
              <AnalyticsCard
                title={metricsConfig.matchingMetrics.title}
                description={metricsConfig.matchingMetrics.description}
                data={analyticsData?.matchingMetrics || []}
                loading={loading}
                refreshInterval={metricsConfig.matchingMetrics.refreshInterval}
              />
            </Grid>
          </Grid>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default Analytics;