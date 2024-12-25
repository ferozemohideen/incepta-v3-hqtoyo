/**
 * @fileoverview Enterprise-grade utility functions for consistent data formatting
 * @version 1.0.0
 * @license MIT
 */

import { format as dateFormat } from 'date-fns'; // v2.30.0
import numeral from 'numeral'; // v2.0.6
import { IGrant } from '../interfaces/grant.interface';

/**
 * Memoization decorator for caching function results
 */
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();

  descriptor.value = function(...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };
  return descriptor;
}

/**
 * Interface for currency formatting options
 */
interface CurrencyFormatOptions {
  locale?: string;
  symbol?: string;
  decimals?: number;
  groupSeparator?: string;
  decimalSeparator?: string;
}

/**
 * Formats a number as currency with locale support and accessibility features
 * @param amount - The number to format as currency
 * @param options - Formatting options
 * @returns Formatted currency string with ARIA attributes
 * @throws {Error} If amount is not a finite number
 */
@memoize
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  if (!Number.isFinite(amount)) {
    throw new Error('Invalid amount provided for currency formatting');
  }

  const {
    locale = 'en-US',
    symbol = '$',
    decimals = 2,
    groupSeparator = ',',
    decimalSeparator = '.'
  } = options;

  numeral.locale(locale);
  const format = `${symbol}0,0${decimals > 0 ? '.' + '0'.repeat(decimals) : ''}`;
  const formatted = numeral(amount).format(format);

  return `<span role="text" aria-label="${amount} dollars">${formatted}</span>`;
}

/**
 * Interface for percentage formatting options
 */
interface PercentageFormatOptions {
  decimals?: number;
  locale?: string;
}

/**
 * Formats a decimal number as percentage with locale support
 * @param value - The decimal value to format as percentage
 * @param options - Formatting options
 * @returns Locale-aware formatted percentage string
 * @throws {Error} If value is not a finite number
 */
@memoize
export function formatPercentage(
  value: number,
  options: PercentageFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    throw new Error('Invalid value provided for percentage formatting');
  }

  const { decimals = 1, locale = 'en-US' } = options;
  const percentage = value * 100;
  
  numeral.locale(locale);
  const formatted = numeral(percentage).format(`0,0${decimals > 0 ? '.' + '0'.repeat(decimals) : ''}`) + '%';

  return `<span role="text" aria-label="${percentage} percent">${formatted}</span>`;
}

/**
 * Interface for number formatting options
 */
interface NumberFormatOptions {
  decimals?: number;
  locale?: string;
  format?: string;
}

/**
 * Formats numbers with locale-aware separators and decimal places
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Locale-formatted number string
 * @throws {Error} If value is not a finite number
 */
@memoize
export function formatNumber(
  value: number,
  options: NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    throw new Error('Invalid value provided for number formatting');
  }

  const { decimals = 0, locale = 'en-US', format = '0,0' } = options;
  
  numeral.locale(locale);
  const formatString = format + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
  const formatted = numeral(value).format(formatString);

  return `<span role="text" aria-label="${value}">${formatted}</span>`;
}

/**
 * Interface for text truncation options
 */
interface TruncateOptions {
  ellipsis?: string;
  preserveWords?: boolean;
}

/**
 * Truncates text with ellipsis and accessibility considerations
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text
 * @param options - Truncation options
 * @returns Truncated text with ARIA attributes
 */
export function truncateText(
  text: string,
  maxLength: number,
  options: TruncateOptions = {}
): string {
  if (!text || maxLength <= 0) {
    throw new Error('Invalid input for text truncation');
  }

  const { ellipsis = '...', preserveWords = true } = options;

  if (text.length <= maxLength) {
    return text;
  }

  let truncated = text.slice(0, maxLength - ellipsis.length);
  
  if (preserveWords) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
  }

  return `<span title="${text}" aria-label="${text}">${truncated}${ellipsis}</span>`;
}

/**
 * Interface for file size formatting options
 */
interface FileSizeOptions {
  locale?: string;
  binary?: boolean;
}

/**
 * Formats file size with appropriate units and localization
 * @param bytes - The file size in bytes
 * @param options - Formatting options
 * @returns Localized file size string
 * @throws {Error} If bytes is not a positive number
 */
@memoize
export function formatFileSize(
  bytes: number,
  options: FileSizeOptions = {}
): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error('Invalid file size provided');
  }

  const { locale = 'en-US', binary = true } = options;
  const base = binary ? 1024 : 1000;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) {
    return `<span role="text" aria-label="0 bytes">0 B</span>`;
  }

  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const size = bytes / Math.pow(base, exp);
  const unit = units[exp];

  const formatted = numeral(size).format('0,0.00');
  return `<span role="text" aria-label="${formatted} ${unit}">${formatted} ${unit}</span>`;
}

/**
 * Type guard to check if a value is a valid number
 * @param value - The value to check
 * @returns Boolean indicating if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}