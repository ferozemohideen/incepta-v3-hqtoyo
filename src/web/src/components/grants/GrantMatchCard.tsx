// @mui/material v5.14.0
import React, { useCallback } from 'react';
import { Typography, Box, Chip, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next'; // v12.0.0
import { CustomCard } from '../common/Card';
import { CustomButton } from '../common/Button';
import { IGrant } from '../../interfaces/grant.interface';

/**
 * Props interface for the GrantMatchCard component
 */
export interface GrantMatchCardProps {
  grant: IGrant;
  matchScore: number;
  onViewDetails: (grantId: string) => Promise<void>;
  onSave: (grantId: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/**
 * Formats currency amount according to locale
 * @param amount - Number to format as currency
 * @param locale - Locale string for formatting
 */
const formatCurrency = (amount: number, locale = 'en-US'): string => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Returns semantic color based on match score
 * @param score - Match percentage (0-100)
 */
const getMatchScoreColor = (score: number): 'success' | 'warning' | 'error' | 'default' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

/**
 * GrantMatchCard component displays AI-matched grant opportunities with match scores
 * Implements Material Design 3.0 and WCAG 2.1 AA compliance
 */
export const GrantMatchCard = React.memo<GrantMatchCardProps>(({
  grant,
  matchScore,
  onViewDetails,
  onSave,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation();

  // Memoized callback handlers
  const handleViewDetails = useCallback(async () => {
    await onViewDetails(grant.id.toString());
  }, [grant.id, onViewDetails]);

  const handleSave = useCallback(async () => {
    await onSave(grant.id.toString());
  }, [grant.id, onSave]);

  // Loading state
  if (isLoading) {
    return (
      <CustomCard elevation={1} className={className}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" height={24} width={120} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={20} width="60%" sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={100} height={36} />
            <Skeleton variant="rectangular" width={100} height={36} />
          </Box>
        </Box>
      </CustomCard>
    );
  }

  // Error state
  if (!grant) {
    return (
      <CustomCard elevation={1} className={className}>
        <Box sx={{ p: 2 }}>
          <Typography color="error">
            {t('grants.error.loadFailed')}
          </Typography>
        </Box>
      </CustomCard>
    );
  }

  const formattedDeadline = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(grant.deadline));

  return (
    <CustomCard
      elevation={1}
      className={className}
      aria-label={t('grants.card.ariaLabel', { title: grant.title })}
    >
      <Box sx={{ p: 2 }}>
        {/* Match Score */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Chip
            label={t('grants.matchScore', { score: matchScore })}
            color={getMatchScoreColor(matchScore)}
            size="small"
            sx={{
              fontWeight: 500,
              height: 24,
            }}
            aria-label={t('grants.matchScore.aria', { score: matchScore })}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            aria-label={t('grants.deadline.aria', { date: formattedDeadline })}
          >
            {t('grants.deadline', { date: formattedDeadline })}
          </Typography>
        </Box>

        {/* Grant Title */}
        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          sx={{
            fontWeight: 500,
            lineHeight: 1.3,
            mb: 0.5,
          }}
        >
          {grant.title}
        </Typography>

        {/* Agency and Amount */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            {grant.agency}
          </Typography>
          <Typography
            variant="subtitle1"
            color="primary"
            sx={{ fontWeight: 500 }}
          >
            {formatCurrency(grant.amount)}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomButton
            variant="contained"
            color="primary"
            onClick={handleViewDetails}
            aria-label={t('grants.actions.view.aria', { title: grant.title })}
          >
            {t('grants.actions.view')}
          </CustomButton>
          <CustomButton
            variant="outlined"
            color="primary"
            onClick={handleSave}
            aria-label={t('grants.actions.save.aria', { title: grant.title })}
          >
            {t('grants.actions.save')}
          </CustomButton>
        </Box>
      </Box>
    </CustomCard>
  );
});

GrantMatchCard.displayName = 'GrantMatchCard';

export default GrantMatchCard;