import { format, isValid, parseISO, differenceInDays } from 'date-fns'; // v2.30.0

/**
 * Interface for deadline threshold configuration
 */
interface DeadlineThresholds {
  urgent: number;  // Days threshold for urgent status
  warning: number; // Days threshold for warning status
}

/**
 * Interface for deadline formatting response
 */
interface DeadlineInfo {
  formattedDate: string;      // Full formatted date
  daysRemaining: number;      // Days until deadline
  urgencyLevel: 'urgent' | 'warning' | 'normal';  // Current urgency status
  relativeDate: string;       // Relative date description
  ariaLabel: string;         // Accessibility label
}

/**
 * Error messages for date utilities
 */
const DATE_ERRORS = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid format string',
  INVALID_TIMEZONE: 'Invalid timezone specified',
} as const;

/**
 * Default format strings for different date display contexts
 */
const DEFAULT_FORMATS = {
  FULL_DATE: 'MMMM d, yyyy',
  SHORT_DATE: 'MMM d, yyyy',
  TIME_12H: 'h:mm a',
  TIME_24H: 'HH:mm',
  DATETIME: 'MMM d, yyyy h:mm a',
} as const;

/**
 * Formats a date object or ISO string into a standardized display format
 * with support for timezone and locale preferences
 * 
 * @param date - Date to format (Date object or ISO string)
 * @param formatString - Optional format string (defaults to full date)
 * @param timezone - Optional timezone (defaults to user's local timezone)
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted date string with ARIA attributes
 * @throws Error if date is invalid
 */
export const formatDate = (
  date: Date | string,
  formatString: string = DEFAULT_FORMATS.FULL_DATE,
  timezone?: string,
  locale: string = 'en-US'
): string => {
  try {
    // Convert string dates to Date objects
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Validate date
    if (!isValid(dateObj)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    // Format the date
    const formattedDate = format(dateObj, formatString, {
      locale: require(`date-fns/locale/${locale}`),
    });

    // Add ARIA attributes for accessibility
    return `<time datetime="${dateObj.toISOString()}" aria-label="${formattedDate}">${formattedDate}</time>`;
  } catch (error) {
    console.error('Date formatting error:', error);
    throw error;
  }
};

/**
 * Formats grant deadline with countdown and urgency level indicators
 * 
 * @param deadline - Grant deadline date
 * @param thresholds - Custom urgency thresholds
 * @param timezone - Optional timezone
 * @returns Object containing formatted deadline information
 * @throws Error if deadline is invalid
 */
export const formatDeadline = (
  deadline: Date | string,
  thresholds: DeadlineThresholds = { urgent: 7, warning: 14 },
  timezone?: string
): DeadlineInfo => {
  try {
    // Convert and validate deadline
    const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
    if (!isValid(deadlineDate)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    // Calculate days remaining
    const today = new Date();
    const daysRemaining = differenceInDays(deadlineDate, today);

    // Determine urgency level
    let urgencyLevel: DeadlineInfo['urgencyLevel'] = 'normal';
    if (daysRemaining <= thresholds.urgent) {
      urgencyLevel = 'urgent';
    } else if (daysRemaining <= thresholds.warning) {
      urgencyLevel = 'warning';
    }

    // Format dates
    const formattedDate = formatDate(deadlineDate, DEFAULT_FORMATS.FULL_DATE, timezone);
    const relativeDate = daysRemaining === 0 
      ? 'Due today'
      : daysRemaining < 0 
        ? `Overdue by ${Math.abs(daysRemaining)} days`
        : `${daysRemaining} days remaining`;

    // Create accessibility label
    const ariaLabel = `Grant deadline: ${formattedDate}, ${relativeDate}`;

    return {
      formattedDate,
      daysRemaining,
      urgencyLevel,
      relativeDate,
      ariaLabel,
    };
  } catch (error) {
    console.error('Deadline formatting error:', error);
    throw error;
  }
};

/**
 * Formats message timestamps with smart display logic and user preferences
 * 
 * @param timestamp - Message timestamp
 * @param use24Hour - Whether to use 24-hour format
 * @param timezone - Optional timezone
 * @returns Formatted time string with accessibility support
 * @throws Error if timestamp is invalid
 */
export const formatMessageTime = (
  timestamp: Date | string,
  use24Hour: boolean = false,
  timezone?: string
): string => {
  try {
    // Convert and validate timestamp
    const timestampDate = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    if (!isValid(timestampDate)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    const now = new Date();
    const timeFormat = use24Hour ? DEFAULT_FORMATS.TIME_24H : DEFAULT_FORMATS.TIME_12H;
    let formattedTime: string;

    // Determine display format based on date
    if (isSameDay(timestampDate, now)) {
      // Today: show only time
      formattedTime = format(timestampDate, timeFormat);
    } else if (isYesterday(timestampDate, now)) {
      // Yesterday: show "Yesterday" + time
      formattedTime = `Yesterday at ${format(timestampDate, timeFormat)}`;
    } else if (isWithinWeek(timestampDate, now)) {
      // Within last week: show day name + time
      formattedTime = format(timestampDate, `EEEE 'at' ${timeFormat}`);
    } else {
      // Older: show full date and time
      formattedTime = format(timestampDate, DEFAULT_FORMATS.DATETIME);
    }

    // Add ARIA attributes for accessibility
    return `<time datetime="${timestampDate.toISOString()}" aria-label="${formattedTime}">${formattedTime}</time>`;
  } catch (error) {
    console.error('Message time formatting error:', error);
    throw error;
  }
};

/**
 * Helper function to check if two dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Helper function to check if a date is yesterday
 */
const isYesterday = (date: Date, now: Date): boolean => {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

/**
 * Helper function to check if a date is within the last week
 */
const isWithinWeek = (date: Date, now: Date): boolean => {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
};