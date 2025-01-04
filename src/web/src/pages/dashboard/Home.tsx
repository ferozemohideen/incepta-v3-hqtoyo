import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Container, Typography, Box, useTheme } from '@mui/material';

// Internal components
import { QuickActions } from '../../components/dashboard/QuickActions';
import SavedItems from '../../components/dashboard/SavedItems';
import { RecentActivity, Activity } from '../../components/dashboard/RecentActivity';
import { AnalyticsCard, ChartDataPoint } from '../../components/dashboard/AnalyticsCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Hooks and utilities
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotification } from '../../hooks/useNotification';
import { SPACING, ANIMATION } from '../../constants/ui.constants';

// Types
import { Technology } from '../../interfaces/technology.interface';
import { IGrant } from '../../interfaces/grant.interface';

/**
 * Interface for dashboard state management
 */
interface DashboardState {
  activities: Activity[];
  savedTechnologies: Technology[];
  savedGrants: IGrant[];
  analyticsData: ChartDataPoint[];
  loading: {
    activities: boolean;
    saved: boolean;
    analytics: boolean;
  };
  error: Record<string, Error | null>;
}

/**
 * Main dashboard component implementing Material Design 3.0 principles
 * with real-time updates and enhanced accessibility
 */
const Home: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // Initialize WebSocket connection for real-time updates
  const { isConnected, sendMessage } = useWebSocket(
    import.meta.env['VITE_WS_URL'] || 'ws://localhost:8080',
    { autoConnect: true }
  );

  // Dashboard state management
  const [state, setState] = useState<DashboardState>({
    activities: [],
    savedTechnologies: [],
    savedGrants: [],
    analyticsData: [],
    loading: {
      activities: true,
      saved: true,
      analytics: true,
    },
    error: {},
  });

  /**
   * Fetches initial dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch recent activities
      const activitiesResponse = await fetch('/api/activities');
      const activities = await activitiesResponse.json();

      // Fetch saved items
      const [techResponse, grantsResponse] = await Promise.all([
        fetch('/api/technologies/saved'),
        fetch('/api/grants/saved')
      ]);
      const savedTechnologies = await techResponse.json();
      const savedGrants = await grantsResponse.json();

      // Fetch analytics data
      const analyticsResponse = await fetch('/api/analytics/dashboard');
      const analyticsData = await analyticsResponse.json();

      setState(prev => ({
        ...prev,
        activities,
        savedTechnologies,
        savedGrants,
        analyticsData,
        loading: {
          activities: false,
          saved: false,
          analytics: false,
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          ...prev.error,
          fetch: error as Error
        },
        loading: {
          activities: false,
          saved: false,
          analytics: false,
        }
      }));
      showNotification({
        message: 'Failed to load dashboard data',
        type: 'error'
      });
    }
  }, [showNotification]);

  /**
   * Handles removal of saved technologies
   */
  const handleRemoveTechnology = useCallback(async (id: string, title: string) => {
    try {
      await fetch(`/api/technologies/saved/${id}`, { method: 'DELETE' });
      setState(prev => ({
        ...prev,
        savedTechnologies: prev.savedTechnologies.filter(tech => tech.id !== id)
      }));
      showNotification({
        message: `Removed ${title} from saved technologies`,
        type: 'success'
      });
    } catch (error) {
      showNotification({
        message: `Failed to remove ${title}`,
        type: 'error'
      });
    }
  }, [showNotification]);

  /**
   * Handles removal of saved grants
   */
  const handleRemoveGrant = useCallback(async (id: string, title: string) => {
    try {
      await fetch(`/api/grants/saved/${id}`, { method: 'DELETE' });
      setState(prev => ({
        ...prev,
        savedGrants: prev.savedGrants.filter(grant => grant.id !== id)
      }));
      showNotification({
        message: `Removed ${title} from saved grants`,
        type: 'success'
      });
    } catch (error) {
      showNotification({
        message: `Failed to remove ${title}`,
        type: 'error'
      });
    }
  }, [showNotification]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle real-time activity updates
  useEffect(() => {
    if (isConnected) {
      const handleNewActivity = (activity: Activity) => {
        setState(prev => ({
          ...prev,
          activities: [activity, ...prev.activities].slice(0, 10)
        }));
      };

      // Subscribe to activity updates
      sendMessage({ type: 'SUBSCRIBE', channel: 'activities' });

      return () => {
        sendMessage({ type: 'UNSUBSCRIBE', channel: 'activities' });
      };
    }
  }, [isConnected, sendMessage]);

  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          py: { xs: SPACING.SCALE.md, md: SPACING.SCALE.lg },
          transition: theme.transitions.create('padding', {
            duration: ANIMATION.DURATION_MEDIUM
          })
        }}
      >
        <Grid container spacing={3}>
          {/* Welcome Message */}
          <Grid item xs={12}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome back, {user?.name}
            </Typography>
          </Grid>

          {/* Quick Actions Section */}
          <Grid item xs={12}>
            <ErrorBoundary>
              <QuickActions user={user} />
            </ErrorBoundary>
          </Grid>

          {/* Recent Activity Section */}
          <Grid item xs={12} md={6}>
            <ErrorBoundary>
              <RecentActivity
                initialActivities={state.activities}
                isLoading={state.loading.activities}
                onLoadMore={fetchDashboardData}
              />
            </ErrorBoundary>
          </Grid>

          {/* Saved Items Section */}
          <Grid item xs={12} md={6}>
            <ErrorBoundary>
              <SavedItems
                savedTechnologies={state.savedTechnologies}
                savedGrants={state.savedGrants}
                onRemoveTechnology={handleRemoveTechnology}
                onRemoveGrant={handleRemoveGrant}
                onViewTechnology={(id: string) => {/* Navigate to technology */}}
                onViewGrant={(id: string) => {/* Navigate to grant */}}
                isLoading={state.loading.saved}
              />
            </ErrorBoundary>
          </Grid>

          {/* Analytics Section */}
          <Grid item xs={12}>
            <ErrorBoundary>
              <AnalyticsCard
                title="Platform Activity"
                description="Overview of your recent platform engagement"
                data={state.analyticsData}
                loading={state.loading.analytics}
                height={400}
                ariaLabel="Dashboard analytics visualization"
              />
            </ErrorBoundary>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Home;