// @mui/material v5.14.0
import React, { useMemo } from 'react';
import { Typography, Box, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import CustomCard from '../common/Card';
import { IGrant } from '../../interfaces/grant.interface';
import { formatDeadline } from '../../utils/date.utils';

/**
 * Props interface for the GrantDeadlineCard component
 */
interface GrantDeadlineCardProps {
  grant: IGrant;
  onClick?: (grantId: string) => void;
}

/**
 * Styled components for custom visual elements
 */
const StyledProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[200],
  '.MuiLinearProgress-bar': {
    borderRadius: theme.shape.borderRadius,
  },
}));

const AmountText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 500,
}));

/**
 * GrantDeadlineCard component displays grant deadline information in a card format
 * Implements Material Design 3.0 principles with accessibility features
 * 
 * @param {GrantDeadlineCardProps} props - Component props
 * @returns {JSX.Element} Rendered card component
 */
export const GrantDeadlineCard: React.FC<GrantDeadlineCardProps> = React.memo(({ grant, onClick }) => {
  // Format currency amount
  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(grant.amount);
  }, [grant.amount]);

  // Format deadline and calculate progress
  const deadlineInfo = useMemo(() => {
    return formatDeadline(grant.deadline, { urgent: 7, warning: 14 });
  }, [grant.deadline]);

  // Calculate progress bar value and color
  const progressProps = useMemo(() => {
    const maxDays = 30; // Show progress for up to 30 days
    const progress = Math.max(0, Math.min(100, (deadlineInfo.daysRemaining / maxDays) * 100));
    
    const colorMap = {
      urgent: 'error',
      warning: 'warning',
      normal: 'primary',
    } as const;

    return {
      value: progress,
      color: colorMap[deadlineInfo.urgencyLevel],
    };
  }, [deadlineInfo]);

  // Handle card click
  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick(grant.id);
    }
  }, [grant.id, onClick]);

  return (
    <CustomCard
      clickable={!!onClick}
      onClick={handleClick}
      elevation={1}
      aria-label={`Grant deadline card for ${grant.title}`}
      data-testid="grant-deadline-card"
    >
      <Box sx={{ p: 2 }}>
        {/* Grant Title */}
        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {grant.title}
        </Typography>

        {/* Agency and Amount */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
          >
            {grant.agency}
          </Typography>
          <AmountText variant="subtitle1">
            {formattedAmount}
          </AmountText>
        </Box>

        {/* Deadline Information */}
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="body2"
            color={deadlineInfo.urgencyLevel === 'urgent' ? 'error.main' : 'text.primary'}
            sx={{ fontWeight: deadlineInfo.urgencyLevel === 'urgent' ? 500 : 400 }}
          >
            {deadlineInfo.relativeDate}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Due: {deadlineInfo.formattedDate}
          </Typography>
        </Box>

        {/* Progress Bar */}
        <StyledProgressBar
          variant="determinate"
          {...progressProps}
          aria-label={`Deadline progress: ${deadlineInfo.relativeDate}`}
        />
      </Box>
    </CustomCard>
  );
});

// Display name for debugging
GrantDeadlineCard.displayName = 'GrantDeadlineCard';

// Default export
export default GrantDeadlineCard;