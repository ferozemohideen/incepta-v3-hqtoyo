/**
 * @fileoverview RecentActivity component for displaying chronological feed of user activities
 * with real-time WebSocket updates and accessibility support.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'; // v18.0.0
import { formatDistanceToNow } from 'date-fns'; // v2.30.0
import { 
  Card,
  List,
  ListItem,
  Typography,
  Skeleton,
  IconButton
} from '@mui/material'; // v5.0.0

// Internal imports
import { Technology } from '../../interfaces/technology.interface';
import { IGrant } from '../../interfaces/grant.interface';
import { Message, MessageType } from '../../interfaces/message.interface';
import { useWebSocket } from '../../hooks/useWebSocket';

/**
 * Enum defining types of activities that can be displayed
 */
export enum ActivityType {
  TECHNOLOGY_MATCH = 'TECHNOLOGY_MATCH',
  GRANT_DEADLINE = 'GRANT_DEADLINE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION'
}

/**
 * Interface for unified activity items
 */
export interface Activity {
  id: string;
  type: ActivityType;
  data: Technology | IGrant | Message;
  timestamp: Date;
  metadata: Record<string, unknown>;
  read: boolean;
  priority: number;
}

/**
 * Props interface for RecentActivity component
 */
interface RecentActivityProps {
  /** Maximum number of activities to display */
  limit?: number;
  /** Callback for activity item click */
  onActivityClick?: (activity: Activity) => void;
  /** Callback for loading more activities */
  onLoadMore?: () => void;
  /** Initial activities to display */
  initialActivities?: Activity[];
}

/**
 * RecentActivity component displays a chronological feed of user activities
 * with real-time updates via WebSocket connection.
 */
export const RecentActivity: React.FC<RecentActivityProps> = ({
  limit = 10,
  onActivityClick,
  onLoadMore,
  initialActivities = []
}) => {
  // State management
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const activitiesRef = useRef<Activity[]>(activities);

  // WebSocket connection for real-time updates
  const { isConnected, connectionState, connect } = useWebSocket(
    process.env.REACT_APP_WS_URL || 'ws://localhost:8080',
    {
      autoConnect: true,
      secure: process.env.NODE_ENV === 'production'
    }
  );

  /**
   * Formats activity data into accessible readable message
   */
  const formatActivityMessage = useCallback((activity: Activity): string => {
    switch (activity.type) {
      case ActivityType.TECHNOLOGY_MATCH: {
        const tech = activity.data as Technology;
        return `New technology match: ${tech.title} from ${tech.university}`;
      }
      case ActivityType.GRANT_DEADLINE: {
        const grant = activity.data as IGrant;
        return `Upcoming deadline: ${grant.title} - ${formatDistanceToNow(grant.deadline)} remaining`;
      }
      case ActivityType.NEW_MESSAGE: {
        const message = activity.data as Message;
        return message.type === MessageType.SYSTEM 
          ? message.content 
          : `New message received regarding ${message.metadata.subject || 'your inquiry'}`;
      }
      default:
        return 'New notification received';
    }
  }, []);

  /**
   * Handles new activity received via WebSocket
   */
  const handleNewActivity = useCallback((newActivity: Activity) => {
    setActivities(prevActivities => {
      const updated = [newActivity, ...prevActivities].slice(0, limit);
      activitiesRef.current = updated;
      return updated;
    });
  }, [limit]);

  /**
   * Fetches initial activities from API
   */
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/activities', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.slice(0, limit));
      activitiesRef.current = data.slice(0, limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  /**
   * Handles activity item click
   */
  const handleActivityClick = useCallback((activity: Activity) => {
    // Mark activity as read
    setActivities(prevActivities =>
      prevActivities.map(a =>
        a.id === activity.id ? { ...a, read: true } : a
      )
    );

    // Call external click handler if provided
    if (onActivityClick) {
      onActivityClick(activity);
    }
  }, [onActivityClick]);

  // Initial data fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // WebSocket event listeners
  useEffect(() => {
    if (isConnected) {
      const socket = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8080');

      socket.addEventListener('message', (event) => {
        const activity = JSON.parse(event.data) as Activity;
        handleNewActivity(activity);
      });

      return () => {
        socket.close();
      };
    }
  }, [isConnected, handleNewActivity]);

  // Error display component
  if (error) {
    return (
      <Card>
        <Typography color="error" align="center" padding={2}>
          {error}
        </Typography>
      </Card>
    );
  }

  return (
    <Card>
      <Typography variant="h6" component="h2" padding={2}>
        Recent Activity
        {!isConnected && (
          <Typography variant="caption" color="error" component="span" marginLeft={1}>
            (Offline)
          </Typography>
        )}
      </Typography>

      <List>
        {loading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <ListItem key={`skeleton-${index}`}>
              <Skeleton variant="text" width="100%" height={60} />
            </ListItem>
          ))
        ) : (
          // Activity items
          activities.map((activity) => (
            <ListItem
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              sx={{
                cursor: 'pointer',
                bgcolor: activity.read ? 'transparent' : 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected'
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={formatActivityMessage(activity)}
            >
              <Typography
                variant="body1"
                component="div"
                sx={{ flexGrow: 1 }}
              >
                {formatActivityMessage(activity)}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {formatDistanceToNow(activity.timestamp)} ago
                </Typography>
              </Typography>
            </ListItem>
          ))
        )}
      </List>

      {activities.length >= limit && (
        <Typography
          align="center"
          padding={1}
          sx={{ cursor: 'pointer' }}
          onClick={onLoadMore}
          role="button"
          tabIndex={0}
        >
          Load More
        </Typography>
      )}
    </Card>
  );
};

export default RecentActivity;