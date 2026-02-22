/**
 * Tests for period calculation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePeriodBounds,
  calculateAdjacentPeriod,
  isDateInPeriod,
  formatPeriodBounds,
  type PeriodQuery,
} from '../periodCalculations';

describe('periodCalculations', () => {
  const organizationId = 'test-org-123';

  describe('calculatePeriodBounds', () => {
    it('should calculate day bounds correctly', () => {
      const query: PeriodQuery = {
        viewType: 'day',
        date: new Date('2024-01-15T14:30:00'),
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      expect(bounds.startDate.getFullYear()).toBe(2024);
      expect(bounds.startDate.getMonth()).toBe(0); // January
      expect(bounds.startDate.getDate()).toBe(15);
      expect(bounds.startDate.getHours()).toBe(0);
      expect(bounds.startDate.getMinutes()).toBe(0);

      expect(bounds.endDate.getFullYear()).toBe(2024);
      expect(bounds.endDate.getMonth()).toBe(0);
      expect(bounds.endDate.getDate()).toBe(15);
      expect(bounds.endDate.getHours()).toBe(23);
      expect(bounds.endDate.getMinutes()).toBe(59);
    });

    it('should calculate week bounds correctly (Monday to Sunday)', () => {
      // January 15, 2024 is a Monday
      const query: PeriodQuery = {
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      // Should start on Monday (Jan 15)
      expect(bounds.startDate.getDate()).toBe(15);
      expect(bounds.startDate.getDay()).toBe(1); // Monday

      // Should end on Sunday (Jan 21)
      expect(bounds.endDate.getDate()).toBe(21);
      expect(bounds.endDate.getDay()).toBe(0); // Sunday
    });

    it('should calculate week bounds for mid-week date', () => {
      // January 17, 2024 is a Wednesday
      const query: PeriodQuery = {
        viewType: 'week',
        date: new Date('2024-01-17T12:00:00'),
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      // Should start on Monday (Jan 15)
      expect(bounds.startDate.getDate()).toBe(15);
      expect(bounds.startDate.getDay()).toBe(1); // Monday

      // Should end on Sunday (Jan 21)
      expect(bounds.endDate.getDate()).toBe(21);
      expect(bounds.endDate.getDay()).toBe(0); // Sunday
    });

    it('should calculate week bounds for Sunday', () => {
      // January 21, 2024 is a Sunday
      const query: PeriodQuery = {
        viewType: 'week',
        date: new Date('2024-01-21T12:00:00'),
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      // Should start on Monday (Jan 15)
      expect(bounds.startDate.getDate()).toBe(15);
      expect(bounds.startDate.getDay()).toBe(1); // Monday

      // Should end on Sunday (Jan 21)
      expect(bounds.endDate.getDate()).toBe(21);
      expect(bounds.endDate.getDay()).toBe(0); // Sunday
    });

    it('should calculate month bounds correctly', () => {
      const query: PeriodQuery = {
        viewType: 'month',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      // Should start on first day of month
      expect(bounds.startDate.getDate()).toBe(1);
      expect(bounds.startDate.getMonth()).toBe(0); // January

      // Should end on last day of month (January has 31 days)
      expect(bounds.endDate.getDate()).toBe(31);
      expect(bounds.endDate.getMonth()).toBe(0); // January
    });

    it('should handle February correctly (leap year)', () => {
      const query: PeriodQuery = {
        viewType: 'month',
        date: new Date('2024-02-15'), // 2024 is a leap year
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      expect(bounds.startDate.getDate()).toBe(1);
      expect(bounds.endDate.getDate()).toBe(29); // Leap year
    });

    it('should handle February correctly (non-leap year)', () => {
      const query: PeriodQuery = {
        viewType: 'month',
        date: new Date('2023-02-15'), // 2023 is not a leap year
        organizationId,
      };

      const bounds = calculatePeriodBounds(query);

      expect(bounds.startDate.getDate()).toBe(1);
      expect(bounds.endDate.getDate()).toBe(28); // Non-leap year
    });
  });

  describe('calculateAdjacentPeriod', () => {
    it('should calculate next day', () => {
      const query: PeriodQuery = {
        viewType: 'day',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const next = calculateAdjacentPeriod(query, 'forward');

      expect(next.viewType).toBe('day');
      expect(next.date.getDate()).toBe(16);
      expect(next.organizationId).toBe(organizationId);
    });

    it('should calculate previous day', () => {
      const query: PeriodQuery = {
        viewType: 'day',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const prev = calculateAdjacentPeriod(query, 'backward');

      expect(prev.viewType).toBe('day');
      expect(prev.date.getDate()).toBe(14);
    });

    it('should calculate next week', () => {
      const query: PeriodQuery = {
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const next = calculateAdjacentPeriod(query, 'forward');

      expect(next.viewType).toBe('week');
      expect(next.date.getDate()).toBe(22);
    });

    it('should calculate previous week', () => {
      const query: PeriodQuery = {
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      };

      const prev = calculateAdjacentPeriod(query, 'backward');

      expect(prev.viewType).toBe('week');
      expect(prev.date.getDate()).toBe(8);
    });

    it('should calculate next month', () => {
      const query: PeriodQuery = {
        viewType: 'month',
        date: new Date('2024-01-15'),
        organizationId,
      };

      const next = calculateAdjacentPeriod(query, 'forward');

      expect(next.viewType).toBe('month');
      expect(next.date.getMonth()).toBe(1); // February
    });

    it('should calculate previous month', () => {
      const query: PeriodQuery = {
        viewType: 'month',
        date: new Date('2024-01-15'),
        organizationId,
      };

      const prev = calculateAdjacentPeriod(query, 'backward');

      expect(prev.viewType).toBe('month');
      expect(prev.date.getMonth()).toBe(11); // December
      expect(prev.date.getFullYear()).toBe(2023); // Previous year
    });

    it('should preserve therapistId when calculating adjacent period', () => {
      const query: PeriodQuery = {
        viewType: 'day',
        date: new Date('2024-01-15'),
        organizationId,
        therapistId: 'therapist-123',
      };

      const next = calculateAdjacentPeriod(query, 'forward');

      expect(next.therapistId).toBe('therapist-123');
    });
  });

  describe('isDateInPeriod', () => {
    it('should return true for date within day bounds', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'day',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      });

      const dateInPeriod = new Date('2024-01-15T14:30:00');
      expect(isDateInPeriod(dateInPeriod, bounds)).toBe(true);
    });

    it('should return false for date outside day bounds', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'day',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      });

      const dateOutside = new Date('2024-01-16T00:00:01');
      expect(isDateInPeriod(dateOutside, bounds)).toBe(false);
    });

    it('should return true for date within week bounds', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'), // Monday
        organizationId,
      });

      const wednesday = new Date('2024-01-17T10:00:00');
      expect(isDateInPeriod(wednesday, bounds)).toBe(true);
    });

    it('should return false for date outside week bounds', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'), // Monday
        organizationId,
      });

      const nextMonday = new Date('2024-01-22T00:00:01');
      expect(isDateInPeriod(nextMonday, bounds)).toBe(false);
    });
  });

  describe('formatPeriodBounds', () => {
    it('should format period bounds correctly', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'week',
        date: new Date('2024-01-15T12:00:00'),
        organizationId,
      });

      const formatted = formatPeriodBounds(bounds);
      expect(formatted).toBe('2024-01-15 to 2024-01-21');
    });

    it('should format month bounds correctly', () => {
      const bounds = calculatePeriodBounds({
        viewType: 'month',
        date: new Date('2024-02-15'),
        organizationId,
      });

      const formatted = formatPeriodBounds(bounds);
      expect(formatted).toBe('2024-02-01 to 2024-02-29');
    });
  });
});
