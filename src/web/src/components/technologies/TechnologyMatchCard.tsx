import React, { useState, useCallback } from 'react';
import { Typography, Stack, Chip, Skeleton, Tooltip } from '@mui/material';
import { useAnalytics } from '@mixpanel/browser';
import CustomCard from '../common/Card';
import CustomButton from '../common/Button';
import { Technology } from '../../interfaces/technology.interface';
import ErrorBoundary from '../common/ErrorBoundary';

// Props interface with comprehensive type safety
export interface TechnologyMatchCardProps {
  /** Technology data object with complete information */
  technology: Technology;
  /** AI-generated match score (0-100) with validation */
  matchScore: number;
  /** Async handler for view details action with loading state */
  onView: (id: string) => Promise<void>;
  /** Async handler for save technology action with loading state */
  onSave: (id: string) => Promise<void>;
  /** Async handler for contact TTO action with loading state */
  onContact: (id: string) => Promise<void>;
  /** Loading state for initial data fetch */
  isLoading?: boolean;
  /** Optional CSS class for custom styling */
  className?: string;
}

/**
 * Determines the accessible color for match score display
 * @param score - Match score between 0-100
 * @returns WCAG compliant color code
 */
const getMatchScoreColor = (score: number): string => {
  if (score >= 90) return '#2e7d32'; // success
  if (score >= 70) return '#ed6c02'; // warning
  return '#d32f2f'; // error
};

/**
 * A specialized card component that displays technology matches with AI-powered scores
 * Implements Material Design principles and WCAG 2.1 Level AA accessibility standards
 */
export const TechnologyMatchCard: React.FC<TechnologyMatchCardProps> = ({
  technology,
  matchScore,
  onView,
  onSave,
  onContact,
  isLoading = false,
  className,
}) => {
  // Track loading states for async actions
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);

  // Analytics tracking
  const analytics = useAnalytics();

  // Action handlers with loading states
  const handleView = useCallback(async () => {
    try {
      setIsViewLoading(true);
      analytics.track('Technology Viewed', {
        technologyId: technology.id,
        matchScore,
      });
      await onView(technology.id);
    } finally {
      setIsViewLoading(false);
    }
  }, [technology.id, matchScore, onView, analytics]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaveLoading(true);
      analytics.track('Technology Saved', {
        technologyId: technology.id,
        matchScore,
      });
      await onSave(technology.id);
    } finally {
      setIsSaveLoading(false);
    }
  }, [technology.id, matchScore, onSave, analytics]);

  const handleContact = useCallback(async () => {
    try {
      setIsContactLoading(true);
      analytics.track('TTO Contacted', {
        technologyId: technology.id,
        university: technology.university,
      });
      await onContact(technology.id);
    } finally {
      setIsContactLoading(false);
    }
  }, [technology.id, technology.university, onContact, analytics]);

  // Render loading skeleton
  if (isLoading) {
    return (
      <CustomCard elevation={1} className={className}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={24} width={100} />
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={24} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rectangular" height={36} width={80} />
            <Skeleton variant="rectangular" height={36} width={80} />
            <Skeleton variant="rectangular" height={36} width={80} />
          </Stack>
        </Stack>
      </CustomCard>
    );
  }

  return (
    <ErrorBoundary>
      <CustomCard 
        elevation={1}
        className={className}
        aria-label={`Technology match: ${technology.title}`}
      >
        <Stack spacing={2}>
          {/* Match Score */}
          <Tooltip title="AI-powered match score based on your profile">
            <Chip
              label={`${matchScore}% Match`}
              sx={{
                bgcolor: getMatchScoreColor(matchScore),
                color: '#fff',
                fontWeight: 500,
                width: 'fit-content',
              }}
              aria-label={`Match score: ${matchScore}%`}
            />
          </Tooltip>

          {/* Technology Title */}
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 500 }}
          >
            {technology.title}
          </Typography>

          {/* University and Patent Status */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {technology.university}
            </Typography>
            <Typography variant="body2" color="text.secondary">•</Typography>
            <Tooltip title={`Patent Status: ${technology.patentStatus}`}>
              <Chip
                label={technology.patentStatus}
                size="small"
                variant="outlined"
                sx={{ height: 24 }}
              />
            </Tooltip>
          </Stack>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {technology.description}
          </Typography>

          {/* Action Buttons */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 2 }}
          >
            <CustomButton
              variant="outlined"
              size="small"
              onClick={handleView}
              loading={isViewLoading}
              aria-label="View technology details"
            >
              View Details
            </CustomButton>
            <CustomButton
              variant="outlined"
              size="small"
              onClick={handleSave}
              loading={isSaveLoading}
              aria-label="Save technology"
            >
              Save
            </CustomButton>
            <CustomButton
              variant="contained"
              size="small"
              onClick={handleContact}
              loading={isContactLoading}
              aria-label="Contact technology transfer office"
            >
              Contact TTO
            </CustomButton>
          </Stack>
        </Stack>
      </CustomCard>
    </ErrorBoundary>
  );
};

export default TechnologyMatchCard;