/**
 * useMemoizedDateFormat - Memoized date formatting hook
 * Caches formatted date strings to avoid repeated formatting operations
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Hook for memoized date formatting
 * Caches the formatted string until date or format pattern changes
 * 
 * @param date - Date to format
 * @param formatStr - Format string (date-fns format)
 * @param locale - Optional locale (defaults to ptBR)
 * @returns Formatted date string
 */
export function useMemoizedDateFormat(
  date: Date | null | undefined,
  formatStr: string,
  locale: Locale = ptBR
): string {
  return useMemo(() => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    try {
      return format(date, formatStr, { locale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }, [date?.getTime(), formatStr, locale]);
}

/**
 * Hook for formatting multiple dates at once
 * Useful when you need to format several dates with the same pattern
 * 
 * @param dates - Array of dates to format
 * @param formatStr - Format string (date-fns format)
 * @param locale - Optional locale (defaults to ptBR)
 * @returns Array of formatted date strings
 */
export function useMemoizedDateFormats(
  dates: (Date | null | undefined)[],
  formatStr: string,
  locale: Locale = ptBR
): string[] {
  return useMemo(() => {
    return dates.map(date => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      
      try {
        return format(date, formatStr, { locale });
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    });
  }, [dates.map(d => d?.getTime()).join(','), formatStr, locale]);
}
