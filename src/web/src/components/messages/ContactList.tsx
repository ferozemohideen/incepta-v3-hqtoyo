/**
 * ContactList Component
 * Displays a list of contacts with real-time status updates, accessibility features,
 * infinite scrolling, and Material Design 3.0 principles.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  CircularProgress,
  Alert,
  Typography,
  Skeleton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import useInfiniteScroll from 'react-infinite-scroll-hook';

import { CustomCard, CustomCardProps } from '../common/Card';
import { User } from '../../interfaces/user.interface';
import { messageService } from '../../services/message.service';

// Enhanced styled components with Material Design 3.0
const StyledListItem = styled(ListItem, {
  shouldForwardProp: (prop) => !['isSelected', 'isOnline'].includes(prop as string),
})<{ isSelected?: boolean; isOnline?: boolean }>(({ theme, isSelected, isOnline }) => ({
  borderRadius: theme.spacing(1),
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  marginBottom: theme.spacing(0.5),
  cursor: 'pointer',
  
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  
  ...(isSelected && {
    backgroundColor: theme.palette.primary.light,
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
    },
  }),

  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const OnlineBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: '1px solid currentColor',
      content: '""',
    },
  },
}));

const TypingIndicator = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  fontStyle: 'italic',
}));

// Component interfaces
export interface ContactListProps {
  onContactSelect: (contact: User) => void;
  selectedContactId: string | null;
  pageSize?: number;
  className?: string;
  ariaLabel?: string;
}

interface ContactItemProps {
  user: User;
  unreadCount: number;
  isOnline: boolean;
  isSelected: boolean;
  onClick: () => void;
  isTyping: boolean;
  lastSeen?: Date;
  ariaLabel?: string;
}

// Contact item component with memoization
const ContactItem = React.memo<ContactItemProps>(({
  user,
  unreadCount,
  isOnline,
  isSelected,
  onClick,
  isTyping,
  lastSeen,
  ariaLabel
}) => {
  const getStatusText = () => {
    if (isTyping) return 'Typing...';
    if (isOnline) return 'Online';
    if (lastSeen) return `Last seen ${new Date(lastSeen).toLocaleString()}`;
    return 'Offline';
  };

  return (
    <StyledListItem
      isSelected={isSelected}
      isOnline={isOnline}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      aria-label={ariaLabel || `Contact ${user.name}`}
    >
      <ListItemAvatar>
        <OnlineBadge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          invisible={!isOnline}
        >
          <Avatar
            alt={user.name}
            src={user.profile.avatar}
            aria-label={`${user.name}'s avatar`}
          />
        </OnlineBadge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography variant="subtitle1" component="span">
            {user.name}
          </Typography>
        }
        secondary={
          <>
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              display="block"
            >
              {user.profile.organization}
            </Typography>
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {getStatusText()}
            </Typography>
          </>
        }
      />
      {unreadCount > 0 && (
        <Badge
          badgeContent={unreadCount}
          color="primary"
          aria-label={`${unreadCount} unread messages`}
        />
      )}
      {isTyping && (
        <TypingIndicator aria-live="polite">
          Typing...
        </TypingIndicator>
      )}
    </StyledListItem>
  );
});

// Main ContactList component with enhanced features
export const ContactList: React.FC<ContactListProps> = React.memo(({
  onContactSelect,
  selectedContactId,
  pageSize = 20,
  className,
  ariaLabel
}) => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [page, setPage] = useState(1);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Refs for cleanup and optimization
  const statusSubscription = useRef<any>(null);

  // Load contacts with infinite scroll
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await messageService.getThreads(page, pageSize);
      
      setContacts(prevContacts => [
        ...prevContacts,
        ...response.threads
      ]);
      setHasNextPage(response.threads.length === pageSize);
      setPage(prev => prev + 1);
    } catch (err) {
      setError('Failed to load contacts. Please try again.');
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Infinite scroll hook implementation
  const [infiniteRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadContacts,
    disabled: !!error,
    rootMargin: '0px 0px 200px 0px',
  });

  // Initialize real-time status updates
  useEffect(() => {
    statusSubscription.current = messageService.subscribeToStatus(
      (updates) => {
        setOnlineStatus(prev => ({ ...prev, ...updates.online }));
        setTypingStatus(prev => ({ ...prev, ...updates.typing }));
      },
      { interval: 30000 }
    );

    return () => {
      if (statusSubscription.current) {
        statusSubscription.current.unsubscribe();
      }
    };
  }, []);

  // Load initial unread counts
  useEffect(() => {
    const loadUnreadCounts = async () => {
      try {
        const counts = await messageService.getUnreadCount();
        setUnreadCounts(prev => ({ ...prev, ...counts }));
      } catch (err) {
        console.error('Error loading unread counts:', err);
      }
    };

    loadUnreadCounts();
  }, []);

  // Error handling and retry mechanism
  const handleRetry = () => {
    setError(null);
    setPage(1);
    setContacts([]);
    loadContacts();
  };

  return (
    <CustomCard
      className={className}
      elevation={1}
      noPadding
      aria-label={ariaLabel || 'Contact list'}
    >
      {error ? (
        <Alert
          severity="error"
          action={
            <button onClick={handleRetry}>Retry</button>
          }
        >
          {error}
        </Alert>
      ) : (
        <List ref={infiniteRef} role="listbox">
          {contacts.map((contact) => (
            <ContactItem
              key={contact.id}
              user={contact}
              unreadCount={unreadCounts[contact.id] || 0}
              isOnline={onlineStatus[contact.id] || false}
              isSelected={contact.id === selectedContactId}
              isTyping={typingStatus[contact.id] || false}
              onClick={() => onContactSelect(contact)}
              lastSeen={contact.security.lastLogin}
              ariaLabel={`Contact ${contact.name}, ${onlineStatus[contact.id] ? 'online' : 'offline'}`}
            />
          ))}
          {loading && (
            [...Array(3)].map((_, index) => (
              <ListItem key={`skeleton-${index}`}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton width="60%" />}
                  secondary={<Skeleton width="40%" />}
                />
              </ListItem>
            ))
          )}
        </List>
      )}
    </CustomCard>
  );
});

ContactList.displayName = 'ContactList';
ContactItem.displayName = 'ContactItem';

export default ContactList;