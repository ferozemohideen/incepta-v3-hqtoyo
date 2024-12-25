// @mui/material v5.14.0
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'; // v2.7.0
import { CustomCard } from '../common/Card';

/**
 * Interface for individual data points in the chart
 */
export interface ChartDataPoint {
  timestamp: string;
  value: number | number[];
  label: string;
  series?: string[];
}

/**
 * Props interface for the StatisticsChart component
 */
export interface StatisticsChartProps {
  data: ChartDataPoint[];
  title: string;
  description?: string;
  loading?: boolean;
  height?: number | 'auto';
  showGrid?: boolean;
  updateInterval?: number;
  accessibilityLabel?: string;
}

/**
 * Custom hook for managing chart data and real-time updates
 */
const useChartData = (data: ChartDataPoint[], updateInterval: number = 5000) => {
  const formattedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp).toLocaleString(),
      // Handle multiple series data
      ...(Array.isArray(point.value) 
        ? point.series?.reduce((acc, series, idx) => ({
            ...acc,
            [series]: point.value[idx]
          }), {})
        : { value: point.value })
    }));
  }, [data]);

  const seriesConfig = useMemo(() => {
    const firstPoint = data[0];
    if (Array.isArray(firstPoint?.value) && firstPoint?.series) {
      return firstPoint.series.map((series, index) => ({
        name: series,
        dataKey: series,
        stroke: useTheme().palette.primary[index === 0 ? 'main' : 'light']
      }));
    }
    return [{
      name: 'Value',
      dataKey: 'value',
      stroke: useTheme().palette.primary.main
    }];
  }, [data]);

  return { formattedData, seriesConfig };
};

/**
 * StatisticsChart component for visualizing platform metrics
 * Implements accessibility features and responsive design
 */
export const StatisticsChart: React.FC<StatisticsChartProps> = ({
  data,
  title,
  description,
  loading = false,
  height = 'auto',
  showGrid = true,
  updateInterval = 5000,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { formattedData, seriesConfig } = useChartData(data, updateInterval);

  // Handle keyboard navigation for accessibility
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!chartRef.current) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
        // Handle horizontal navigation
        const currentIndex = parseInt(chartRef.current.getAttribute('data-focused-index') || '0');
        const newIndex = event.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < formattedData.length) {
          chartRef.current.setAttribute('data-focused-index', newIndex.toString());
          // Announce the data point for screen readers
          const point = formattedData[newIndex];
          const announcement = `Data point: ${point.label}, Value: ${point.value}`;
          chartRef.current.setAttribute('aria-label', announcement);
        }
        break;
    }
  }, [formattedData]);

  // Set up keyboard listeners
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.addEventListener('keydown', handleKeyboardNavigation);
      return () => chart.removeEventListener('keydown', handleKeyboardNavigation);
    }
  }, [handleKeyboardNavigation]);

  // Calculate responsive dimensions
  const chartHeight = height === 'auto' ? (isMobile ? 300 : 400) : height;

  return (
    <CustomCard
      elevation={1}
      aria-label={accessibilityLabel || `Chart showing ${title}`}
      role="figure"
    >
      <Box p={2}>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {description}
          </Typography>
        )}
        
        <Box
          ref={chartRef}
          height={chartHeight}
          position="relative"
          tabIndex={0}
          role="application"
          aria-label="Interactive chart"
        >
          {loading ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <CircularProgress />
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formattedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.palette.divider}
                  />
                )}
                <XAxis
                  dataKey="timestamp"
                  stroke={theme.palette.text.secondary}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis
                  stroke={theme.palette.text.secondary}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: theme.shape.borderRadius,
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: theme.spacing(2),
                  }}
                />
                {seriesConfig.map((config, index) => (
                  <Line
                    key={config.name}
                    type="monotone"
                    {...config}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>
    </CustomCard>
  );
};

export default StatisticsChart;