// @mui/material v5.14.0
import { Typography, Stack, Chip, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { memo, useMemo } from 'react';

// Internal imports
import { CustomCard, CustomCardProps } from '../common/Card';
import { IGrant } from '../../interfaces/grant.interface';
import { formatDeadline } from '../../utils/date.utils';

/**
 * Props interface for the GrantCard component
 */
interface GrantCardProps {
  grant: IGrant;
  matchScore?: number;
  onSave?: () => void;
  onApply?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
  error?: Error;
}

/**
 * Styled wrapper for CustomCard with enhanced accessibility
 */
const StyledGrantCard = styled(CustomCard)<CustomCardProps>(({ theme }) => ({
  width: '100%',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
  },
}));

/**
 * Styled match score chip with proper contrast
 */
const MatchScoreChip = styled(Chip)(({ theme }) => ({
  backgroundColor: theme.palette.success.main,
  color: theme.palette.success.contrastText,
  fontWeight: 500,
  height: 24,
  '& .MuiChip-label': {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

/**
 * Formats currency amount with proper localization
 */
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * GrantCard component displays grant information in an accessible card format
 */
const GrantCard = memo(({
  grant,
  matchScore,
  onSave,
  onApply,
  onClick,
  isLoading,
  error,
}: GrantCardProps) => {
  // Format deadline with countdown
  const deadlineInfo = useMemo(() => {
    try {
      return formatDeadline(grant.deadline);
    } catch (error) {
      console.error('Error formatting deadline:', error);
      return null;
    }
  }, [grant.deadline]);

  // Handle loading state
  if (isLoading) {
    return (
      <StyledGrantCard elevation={1}>
        <Stack spacing={2} sx={{ p: 2 }}>
          <Typography variant="h6" component="div" sx={{ height: 24, bgcolor: 'grey.200', width: '60%' }} />
          <Typography sx={{ height: 20, bgcolor: 'grey.200', width: '40%' }} />
          <Typography sx={{ height: 20, bgcolor: 'grey.200', width: '30%' }} />
        </Stack>
      </StyledGrantCard>
    );
  }

  // Handle error state
  if (error) {
    return (
      <StyledGrantCard elevation={1}>
        <Typography color="error" align="center">
          Error loading grant information
        </Typography>
      </StyledGrantCard>
    );
  }

  return (
    <StyledGrantCard
      elevation={1}
      clickable={Boolean(onClick)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Grant: ${grant.title} from ${grant.agency}`}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        {/* Header with match score */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {grant.title}
          </Typography>
          {matchScore !== undefined && (
            <MatchScoreChip
              label={`${Math.round(matchScore)}% Match`}
              size="small"
              aria-label={`Match score: ${Math.round(matchScore)}%`}
            />
          )}
        </Stack>

        {/* Grant details */}
        <Stack spacing={1}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <strong>Agency:</strong> {grant.agency}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <strong>Amount:</strong> {formatAmount(grant.amount)}
          </Typography>
          {deadlineInfo && (
            <Typography
              variant="body2"
              color={deadlineInfo.urgencyLevel === 'urgent' ? 'error.main' : 'text.secondary'}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              aria-label={deadlineInfo.ariaLabel}
            >
              <strong>Deadline:</strong> {deadlineInfo.relativeDate}
            </Typography>
          )}
        </Stack>

        {/* Grant type chip */}
        <Chip
          label={grant.type}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        />

        {/* Action buttons */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 'auto' }}
        >
          {onSave && (
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              aria-label={`Save ${grant.title}`}
            >
              Save
            </Button>
          )}
          {onApply && (
            <Button
              variant="contained"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              aria-label={`Apply for ${grant.title}`}
            >
              Apply Now
            </Button>
          )}
        </Stack>
      </Stack>
    </StyledGrantCard>
  );
});

GrantCard.displayName = 'GrantCard';

export default GrantCard;
export type { GrantCardProps };