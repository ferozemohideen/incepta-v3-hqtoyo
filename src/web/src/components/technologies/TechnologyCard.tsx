// @mui/material v5.14.0
import { styled } from '@mui/material/styles';
import { Typography, Chip, IconButton, Tooltip, Box } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';

// Internal imports
import CustomCard from '../common/Card';
import { Technology, PatentStatus } from '../../interfaces/technology.interface';

/**
 * Props interface for TechnologyCard component
 */
export interface TechnologyCardProps {
  technology: Technology;
  onSave?: (id: string) => Promise<void>;
  onShare?: (id: string) => Promise<void>;
  onView?: (id: string) => void;
  matchScore?: number;
  showActions?: boolean;
}

/**
 * Styled components for card layout
 */
const StyledContent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  minHeight: 200,
  '@media (max-width: 600px)': {
    padding: theme.spacing(1.5),
  },
}));

const ActionBar = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 'auto',
  paddingTop: theme.spacing(1),
}));

const MetadataContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  alignItems: 'center',
}));

const TruncatedTypography = styled(Typography)(({ theme }) => ({
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

/**
 * Helper function to get patent status color
 */
const getPatentStatusColor = (status: PatentStatus): string => {
  const statusColors = {
    [PatentStatus.GRANTED]: 'success',
    [PatentStatus.PENDING]: 'warning',
    [PatentStatus.PROVISIONAL]: 'info',
    [PatentStatus.NOT_PATENTED]: 'default',
  };
  return statusColors[status];
};

/**
 * TechnologyCard component for displaying technology listings
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
export const TechnologyCard: React.FC<TechnologyCardProps> = ({
  technology,
  onSave,
  onShare,
  onView,
  matchScore,
  showActions = true,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Handle save action with loading state
  const handleSave = async () => {
    if (onSave && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(technology.id.toString());
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Handle share action with loading state
  const handleShare = async () => {
    if (onShare && !isSharing) {
      setIsSharing(true);
      try {
        await onShare(technology.id.toString());
      } finally {
        setIsSharing(false);
      }
    }
  };

  return (
    <CustomCard
      elevation={1}
      clickable={Boolean(onView)}
      onClick={onView ? () => onView(technology.id.toString()) : undefined}
      aria-label={`Technology: ${technology.title}`}
      fullHeight
    >
      <StyledContent>
        {/* Title */}
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {technology.title}
        </Typography>

        {/* Metadata */}
        <MetadataContainer>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            component="span"
          >
            {technology.university}
          </Typography>
          <Chip
            label={technology.patentStatus.toLowerCase()}
            size="small"
            color={getPatentStatusColor(technology.patentStatus)}
            sx={{ height: 24 }}
          />
          {matchScore !== undefined && (
            <Tooltip title="AI Match Score" arrow>
              <Chip
                label={`${matchScore}% Match`}
                size="small"
                color="primary"
                sx={{ height: 24 }}
              />
            </Tooltip>
          )}
        </MetadataContainer>

        {/* Description */}
        <TruncatedTypography
          variant="body2"
          color="text.secondary"
          paragraph
          component="p"
        >
          {technology.description}
        </TruncatedTypography>

        {/* TRL Level */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            TRL Level:
          </Typography>
          <Tooltip title={`Technology Readiness Level: ${technology.trl}/9`} arrow>
            <Box
              sx={{
                width: 100,
                height: 4,
                bgcolor: 'grey.200',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(technology.trl / 9) * 100}%`,
                  height: '100%',
                  bgcolor: 'primary.main',
                }}
              />
            </Box>
          </Tooltip>
        </Box>

        {/* Action Bar */}
        {showActions && (
          <ActionBar>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {onSave && (
                <Tooltip title="Save Technology" arrow>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave();
                    }}
                    disabled={isSaving}
                    aria-label="Save technology"
                    size="small"
                  >
                    <BookmarkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onShare && (
                <Tooltip title="Share Technology" arrow>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    disabled={isSharing}
                    aria-label="Share technology"
                    size="small"
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onView && (
                <Tooltip title="View Details" arrow>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(technology.id.toString());
                    }}
                    aria-label="View technology details"
                    size="small"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </ActionBar>
        )}
      </StyledContent>
    </CustomCard>
  );
};

export default TechnologyCard;