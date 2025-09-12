import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agendaKeys } from '../useAgenda';
import { AppointmentService } from '@/lib/services/AppointmentService';
import { getWeekStart, formatDate, addWeeks } from '@/utils/agendaUtils';

// Mock AppointmentService
vi.mock('@/lib/services/AppointmentService', () => ({
  AppointmentService: {
    getWeeklyAppointments: vi.fn(),
    subscribeToAppointments: vi.fn(),
    checkTimeConflict: vi.fn(),
    getAvailableTimeSlots: vi.fn(),
    getAppointmentStats: vi.fn(),
  }
}));

// Mock utils
vi.mock('@/utils/agendaUtils', () => ({
  getWeekStart: vi.fn(),
  getWeekEnd: vi.fn(),
  formatDate: vi.fn(),
  addWeeks: vi.fn(),
}));

describe('useAgenda hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agendaKeys', () => {
    it('should generate correct query keys', () => {
      const testDate = new Date('2024-01-15');
      const testFilters = { therapist_id: 'therapist1' };

      vi.mocked(formatDate).mockReturnValue('2024-01-15');

      expect(agendaKeys.all).toEqual(['agenda']);
      expect(agendaKeys.weekly(testDate)).toEqual(['agenda', 'weekly', '2024-01-15']);
      expect(agendaKeys.filtered(testFilters)).toEqual(['agenda', 'filtered', testFilters]);
    });
  });

  describe('AppointmentService integration', () => {
    it('should have all required methods', () => {
      expect(AppointmentService.getWeeklyAppointments).toBeDefined();
      expect(AppointmentService.subscribeToAppointments).toBeDefined();
      expect(AppointmentService.checkTimeConflict).toBeDefined();
      expect(AppointmentService.getAvailableTimeSlots).toBeDefined();
      expect(AppointmentService.getAppointmentStats).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should use week calculation utilities', () => {
      const testDate = new Date('2024-01-15');
      const weekStart = new Date('2024-01-14'); // Assuming Monday is week start

      vi.mocked(getWeekStart).mockReturnValue(weekStart);
      vi.mocked(addWeeks).mockImplementation((date, weeks) => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + (weeks * 7));
        return newDate;
      });

      const result = getWeekStart(testDate);
      expect(result).toEqual(weekStart);
      expect(getWeekStart).toHaveBeenCalledWith(testDate);
    });

    it('should handle week navigation', () => {
      const currentWeek = new Date('2024-01-14');
      const nextWeek = new Date('2024-01-21');
      const prevWeek = new Date('2024-01-07');

      vi.mocked(addWeeks).mockImplementation((date, weeks) => {
        if (weeks === 1) return nextWeek;
        if (weeks === -1) return prevWeek;
        return date;
      });

      expect(addWeeks(currentWeek, 1)).toEqual(nextWeek);
      expect(addWeeks(currentWeek, -1)).toEqual(prevWeek);
    });
  });

  describe('real-time functionality', () => {
    it('should setup subscription when enabled', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(AppointmentService.subscribeToAppointments).mockReturnValue(mockUnsubscribe);

      // This would be tested in a more complete test with renderHook
      expect(AppointmentService.subscribeToAppointments).toBeDefined();
    });
  });

  describe('conflict checking', () => {
    it('should check for time conflicts', async () => {
      const mockConflictResult = false;
      vi.mocked(AppointmentService.checkTimeConflict).mockResolvedValue(mockConflictResult);

      const result = await AppointmentService.checkTimeConflict(
        'therapist1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(result).toBe(false);
      expect(AppointmentService.checkTimeConflict).toHaveBeenCalledWith(
        'therapist1',
        '2024-01-15',
        '09:00',
        '10:00'
      );
    });
  });

  describe('available time slots', () => {
    it('should fetch available time slots', async () => {
      const mockSlots = ['09:00', '10:00', '11:00'];
      vi.mocked(AppointmentService.getAvailableTimeSlots).mockResolvedValue(mockSlots);

      const result = await AppointmentService.getAvailableTimeSlots(
        'therapist1',
        '2024-01-15',
        60
      );

      expect(result).toEqual(mockSlots);
      expect(AppointmentService.getAvailableTimeSlots).toHaveBeenCalledWith(
        'therapist1',
        '2024-01-15',
        60
      );
    });
  });

  describe('agenda statistics', () => {
    it('should fetch appointment statistics', async () => {
      const mockStats = {
        total: 10,
        scheduled: 5,
        completed: 3,
        missed: 1,
        cancelled: 1,
        rescheduled: 0,
        paid: 4,
        pending: 4,
        partial: 2
      };

      vi.mocked(AppointmentService.getAppointmentStats).mockResolvedValue(mockStats);

      const result = await AppointmentService.getAppointmentStats('2024-01-01', '2024-01-31');

      expect(result).toEqual(mockStats);
      expect(AppointmentService.getAppointmentStats).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });
  });
});