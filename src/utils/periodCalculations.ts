/**
 * Period Calculation Utilities
 * 
 * Provides functions to calculate date bounds for different calendar view types
 * (day, week, month) and to calculate adjacent periods for prefetching.
 * 
 * Used by the schedule performance optimization to load only appointments
 * within the visible time period.
 */

export type ViewType = 'day' | 'week' | 'month';

export interface PeriodQuery {
  viewType: ViewType;
  date: Date;
  organizationId: string;
  therapistId?: string;
}

export interface PeriodBounds {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculates the start and end dates for a given period based on view type.
 * 
 * - Day: Returns the same day (00:00:00 to 23:59:59)
 * - Week: Returns Monday to Sunday of the week containing the date
 * - Month: Returns first to last day of the month
 * 
 * @param query - Period query with view type and date
 * @returns Object with startDate and endDate
 * 
 * @example
 * // Day view
 * calculatePeriodBounds({ viewType: 'day', date: new Date('2024-01-15'), organizationId: '123' })
 * // Returns: { startDate: 2024-01-15 00:00:00, endDate: 2024-01-15 23:59:59 }
 * 
 * // Week view
 * calculatePeriodBounds({ viewType: 'week', date: new Date('2024-01-15'), organizationId: '123' })
 * // Returns: { startDate: 2024-01-15 (Monday) 00:00:00, endDate: 2024-01-21 (Sunday) 23:59:59 }
 * 
 * // Month view
 * calculatePeriodBounds({ viewType: 'month', date: new Date('2024-01-15'), organizationId: '123' })
 * // Returns: { startDate: 2024-01-01 00:00:00, endDate: 2024-01-31 23:59:59 }
 */
export function calculatePeriodBounds(query: PeriodQuery): PeriodBounds {
  const { viewType, date } = query;
  
  switch (viewType) {
    case 'day':
      return calculateDayBounds(date);
    case 'week':
      return calculateWeekBounds(date);
    case 'month':
      return calculateMonthBounds(date);
    default:
      // Fallback to day view
      return calculateDayBounds(date);
  }
}

/**
 * Calculates bounds for a single day (00:00:00 to 23:59:59)
 */
function calculateDayBounds(date: Date): PeriodBounds {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Calculates bounds for a week (Monday to Sunday)
 * Uses ISO week standard where Monday is the first day of the week
 */
function calculateWeekBounds(date: Date): PeriodBounds {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - daysToMonday);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Add 6 days to get to Sunday
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Calculates bounds for a month (first to last day)
 */
function calculateMonthBounds(date: Date): PeriodBounds {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);
  
  // Get last day of month by going to first day of next month and subtracting 1 day
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Calculates the adjacent period (next or previous) for prefetching.
 * 
 * @param query - Current period query
 * @param direction - 'forward' for next period, 'backward' for previous period
 * @returns New PeriodQuery for the adjacent period
 * 
 * @example
 * // Next day
 * calculateAdjacentPeriod(
 *   { viewType: 'day', date: new Date('2024-01-15'), organizationId: '123' },
 *   'forward'
 * )
 * // Returns: { viewType: 'day', date: 2024-01-16, organizationId: '123' }
 * 
 * // Previous week
 * calculateAdjacentPeriod(
 *   { viewType: 'week', date: new Date('2024-01-15'), organizationId: '123' },
 *   'backward'
 * )
 * // Returns: { viewType: 'week', date: 2024-01-08, organizationId: '123' }
 */
export function calculateAdjacentPeriod(
  query: PeriodQuery,
  direction: 'forward' | 'backward'
): PeriodQuery {
  const { viewType, date, organizationId, therapistId } = query;
  const multiplier = direction === 'forward' ? 1 : -1;
  
  let newDate: Date;
  
  switch (viewType) {
    case 'day':
      newDate = new Date(date);
      newDate.setDate(date.getDate() + (1 * multiplier));
      break;
      
    case 'week':
      newDate = new Date(date);
      newDate.setDate(date.getDate() + (7 * multiplier));
      break;
      
    case 'month':
      newDate = new Date(date);
      newDate.setMonth(date.getMonth() + (1 * multiplier));
      break;
      
    default:
      // Fallback to day
      newDate = new Date(date);
      newDate.setDate(date.getDate() + (1 * multiplier));
  }
  
  return {
    viewType,
    date: newDate,
    organizationId,
    therapistId,
  };
}

/**
 * Formats period bounds for display or logging
 */
export function formatPeriodBounds(bounds: PeriodBounds): string {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return `${formatDate(bounds.startDate)} to ${formatDate(bounds.endDate)}`;
}

/**
 * Checks if a date falls within the given period bounds
 */
export function isDateInPeriod(date: Date, bounds: PeriodBounds): boolean {
  const time = date.getTime();
  return time >= bounds.startDate.getTime() && time <= bounds.endDate.getTime();
}
