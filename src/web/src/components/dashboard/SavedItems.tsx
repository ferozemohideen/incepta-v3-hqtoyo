// @mui/material v5.14.0
import React, { useState, useCallback, useRef } from 'react';
import {
  List,
  ListItem,
  Typography,
  IconButton,
  Collapse,
  CircularProgress,
  Tooltip,
  Box,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useVirtualizer } from '@tanstack/react-virtual';

// Internal imports
import { CustomCard } from '../common/Card';
import { Technology } from '../../interfaces/technology.interface';
import { IGrant } from '../../interfaces/grant.interface';
import ErrorBoundary from '../common/ErrorBoundary';
import { useNotification } from '../../hooks/useNotification';
import { ANIMATION, SPACING } from '../../constants/ui.constants';

// Props interface
interface SavedItemsProps {
  savedTechnologies: Technology[];
  savedGrants: IGrant[];
  onRemoveTechnology: (id: string, title: string) => Promise<void>;
  onRemoveGrant: (id: string, title: string) => Promise<void>;
  onViewTechnology: (id: string) => Promise<void>;
  onViewGrant: (id: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Formats a deadline date with localization support
 */
const formatDeadline = (date: Date, locale: string = 'en-US'): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * SavedItems component displays user's saved technologies and grants
 * in a collapsible card format with enhanced accessibility
 */
const SavedItems: React.FC<SavedItemsProps> = ({
  savedTechnologies,
  savedGrants,
  onRemoveTechnology,
  onRemoveGrant,
  onViewTechnology,
  onViewGrant,
  isLoading,
}) => {
  // State for section expansion
  const [techExpanded, setTechExpanded] = useState(true);
  const [grantsExpanded, setGrantsExpanded] = useState(true);

  // Refs for virtualization
  const techParentRef = useRef<HTMLDivElement>(null);
  const grantsParentRef = useRef<HTMLDivElement>(null);

  // Notification hook
  const { showNotification } = useNotification();

  // Virtualization for technologies list
  const techVirtualizer = useVirtualizer({
    count: savedTechnologies.length,
    getScrollElement: () => techParentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5,
  });

  // Virtualization for grants list
  const grantsVirtualizer = useVirtualizer({
    count: savedGrants.length,
    getScrollElement: () => grantsParentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Handlers for expanding/collapsing sections
  const handleTechExpand = () => setTechExpanded(!techExpanded);
  const handleGrantsExpand = () => setGrantsExpanded(!grantsExpanded);

  // Handler for removing items with confirmation
  const handleRemove = useCallback(async (
    id: string,
    title: string,
    type: 'technology' | 'grant'
  ) => {
    try {
      if (type === 'technology') {
        await onRemoveTechnology(id, title);
      } else {
        await onRemoveGrant(id, title);
      }
      showNotification({
        message: `${title} removed from saved items`,
        type: 'success',
      });
    } catch (error) {
      showNotification({
        message: `Failed to remove ${title}`,
        type: 'error',
      });
    }
  }, [onRemoveTechnology, onRemoveGrant, showNotification]);

  return (
    <ErrorBoundary>
      <CustomCard
        elevation={1}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: theme => theme.transitions.create(['height']),
        }}
      >
        {/* Technologies Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.SCALE.sm,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
            }}
          >
            <Typography variant="h6" component="h2">
              Saved Technologies ({savedTechnologies.length})
            </Typography>
            <IconButton
              onClick={handleTechExpand}
              aria-expanded={techExpanded}
              aria-label="Toggle technologies section"
              sx={{
                transform: techExpanded ? 'rotate(180deg)' : 'none',
                transition: theme =>
                  theme.transitions.create('transform', {
                    duration: ANIMATION.DURATION_SHORT,
                  }),
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={techExpanded} timeout={ANIMATION.DURATION_MEDIUM}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                ref={techParentRef}
                style={{
                  height: Math.min(savedTechnologies.length * 72, 300),
                  overflow: 'auto',
                }}
              >
                <List style={{ height: techVirtualizer.getTotalSize() }}>
                  {techVirtualizer.getVirtualItems().map(virtualRow => {
                    const tech = savedTechnologies[virtualRow.index];
                    return (
                      <ListItem
                        key={tech.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        secondaryAction={
                          <Box>
                            <Tooltip title="View details">
                              <IconButton
                                edge="end"
                                onClick={() => onViewTechnology(tech.id.toString())}
                                aria-label={`View ${tech.title}`}
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove from saved">
                              <IconButton
                                edge="end"
                                onClick={() => handleRemove(
                                  tech.id.toString(),
                                  tech.title,
                                  'technology'
                                )}
                                aria-label={`Remove ${tech.title}`}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <Box sx={{ pr: 8 }}>
                          <Typography variant="subtitle1" noWrap>
                            {tech.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {tech.university}
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}
          </Collapse>
        </Box>

        {/* Grants Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.SCALE.sm,
            mt: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
            }}
          >
            <Typography variant="h6" component="h2">
              Saved Grants ({savedGrants.length})
            </Typography>
            <IconButton
              onClick={handleGrantsExpand}
              aria-expanded={grantsExpanded}
              aria-label="Toggle grants section"
              sx={{
                transform: grantsExpanded ? 'rotate(180deg)' : 'none',
                transition: theme =>
                  theme.transitions.create('transform', {
                    duration: ANIMATION.DURATION_SHORT,
                  }),
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={grantsExpanded} timeout={ANIMATION.DURATION_MEDIUM}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                ref={grantsParentRef}
                style={{
                  height: Math.min(savedGrants.length * 72, 300),
                  overflow: 'auto',
                }}
              >
                <List style={{ height: grantsVirtualizer.getTotalSize() }}>
                  {grantsVirtualizer.getVirtualItems().map(virtualRow => {
                    const grant = savedGrants[virtualRow.index];
                    return (
                      <ListItem
                        key={grant.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        secondaryAction={
                          <Box>
                            <Tooltip title="View details">
                              <IconButton
                                edge="end"
                                onClick={() => onViewGrant(grant.id)}
                                aria-label={`View ${grant.title}`}
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove from saved">
                              <IconButton
                                edge="end"
                                onClick={() => handleRemove(
                                  grant.id,
                                  grant.title,
                                  'grant'
                                )}
                                aria-label={`Remove ${grant.title}`}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <Box sx={{ pr: 8 }}>
                          <Typography variant="subtitle1" noWrap>
                            {grant.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {grant.agency} • Due {formatDeadline(grant.deadline)}
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}
          </Collapse>
        </Box>
      </CustomCard>
    </ErrorBoundary>
  );
};

export default SavedItems;