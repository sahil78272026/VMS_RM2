import { format, isValid, parseISO } from 'date-fns';

/**
 * Standardize timestamp format everywhere in the app.
 * Expected format: DD MMM YYYY, hh:mm A
 * Example: 10 Aug 2026, 10:08 AM
 */
export const formatTimestamp = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) {
      // fallback if not ISO string
      const fallbackDate = new Date(dateStr);
      if (!isValid(fallbackDate)) return 'Invalid Date';
      return format(fallbackDate, 'dd MMM yyyy, hh:mm a');
    }
    return format(date, 'dd MMM yyyy, hh:mm a');
  } catch (err) {
    return 'Invalid Date';
  }
};

/**
 * Standardize date-only format everywhere in the app.
 * Expected format: DD MMM YYYY
 * Example: 10 Aug 2026
 */
export const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) {
      const fallbackDate = new Date(dateStr);
      if (!isValid(fallbackDate)) return 'Invalid Date';
      return format(fallbackDate, 'dd MMM yyyy');
    }
    return format(date, 'dd MMM yyyy');
  } catch (err) {
    return 'Invalid Date';
  }
};
