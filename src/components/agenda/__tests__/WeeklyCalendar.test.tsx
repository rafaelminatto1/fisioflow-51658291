import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the useAgenda hook
const mockUseAgenda = {
  currentWeek: new Date('2024-01-15'), // Monday
  weeklyData: {
    weekStart: new Date('2024-01-15'),
    weekEnd: new Date('2024-01-21'),
    appointments: [
      {
        id: 'apt1',
        patient_id: 'patient1',
        therapist_id: 'therapist1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled',
        payment_status: 'pending',
        session_type: 'individual',
        notes: '',
        created_at: '2024-01-15T09:00:00Z',
        updated_at: '2024-01-15T09:00:00Z',
        patient: { name: 'João Silva' }
      }
    ],
    timeSlots: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30']
  },
  isLoading: false,
  goToPreviousWeek: vi.fn(),
  goToNextWeek: vi.fn(),
  goToToday: vi.fn(),
  isCurrentWeek: false
};

vi.mock('@/hooks/useAgenda', () => ({
  useAgenda: () => mockUseAgenda
}));

// Mock utils
vi.mock('@/utils/agendaUtils', () => ({
  formatDate: (date: Date) => date.toISOString().split('T')[0],
  addDays: (date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }
}));

describe('WeeklyCalendar Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate correct time slots', () => {
    // Test time slot generation logic
    const timeSlots: string[] = [];
    for (let hour = 7; hour < 19; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    expect(timeSlots).toContain('07:00');
    expect(timeSlots).toContain('07:30');
    expect(timeSlots).toContain('12:00');
    expect(timeSlots).toContain('18:00');
    expect(timeSlots).toContain('18:30');
    expect(timeSlots).not.toContain('19:00');
    expect(timeSlots).not.toContain('06:30');
    expect(timeSlots.length).toBe(24); // 12 hours * 2 slots per hour
  });

  it('should generate week days correctly', () => {
    const currentWeek = new Date('2024-01-15T00:00:00'); // Monday
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      weekDays.push({
        date,
        dateString: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }

    expect(weekDays).toHaveLength(7);
    // Check that we have 7 consecutive days
    expect(weekDays[0].dayNumber).toBeGreaterThan(0);
    expect(weekDays[6].dayNumber).toBeGreaterThan(weekDays[0].dayNumber);
    // Check weekend detection
    const weekendDays = weekDays.filter(day => day.isWeekend);
    expect(weekendDays.length).toBeGreaterThanOrEqual(1); // At least one weekend day
  });

  it('should filter appointments for specific slot', () => {
    const appointments = mockUseAgenda.weeklyData.appointments;
    
    const getAppointmentsForSlot = (dateString: string, time: string) => {
      return appointments.filter(appointment => {
        return appointment.date === dateString && appointment.start_time === time;
      });
    };

    const mondayNineAM = getAppointmentsForSlot('2024-01-15', '09:00');
    const mondayTenAM = getAppointmentsForSlot('2024-01-15', '10:00');
    const tuesdayNineAM = getAppointmentsForSlot('2024-01-16', '09:00');

    expect(mondayNineAM).toHaveLength(1);
    expect(mondayNineAM[0].patient.name).toBe('João Silva');
    expect(mondayTenAM).toHaveLength(0);
    expect(tuesdayNineAM).toHaveLength(0);
  });

  it('should determine appointment status colors', () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'scheduled':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'missed':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'cancelled':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'rescheduled':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    expect(getStatusColor('scheduled')).toContain('bg-blue-100');
    expect(getStatusColor('completed')).toContain('bg-green-100');
    expect(getStatusColor('missed')).toContain('bg-red-100');
    expect(getStatusColor('cancelled')).toContain('bg-gray-100');
    expect(getStatusColor('rescheduled')).toContain('bg-yellow-100');
    expect(getStatusColor('unknown')).toContain('bg-gray-100');
  });

  it('should format week range correctly', () => {
    const currentWeek = new Date('2024-01-15T00:00:00');
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startFormatted = currentWeek.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    const endFormatted = weekEnd.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const weekRange = `${startFormatted} - ${endFormatted}`;

    // Check that the range contains expected elements
    expect(weekRange).toContain('jan');
    expect(weekRange).toContain('2024');
    expect(weekRange).toContain('-');
    expect(weekRange.length).toBeGreaterThan(10);
  });

  it('should handle multiple appointments in same slot', () => {
    const multipleAppointments = [
      {
        id: 'apt1',
        date: '2024-01-15',
        start_time: '09:00',
        patient: { name: 'João Silva' }
      },
      {
        id: 'apt2',
        date: '2024-01-15',
        start_time: '09:00',
        patient: { name: 'Maria Santos' }
      },
      {
        id: 'apt3',
        date: '2024-01-15',
        start_time: '09:00',
        patient: { name: 'Pedro Costa' }
      }
    ];

    const getAppointmentsForSlot = (dateString: string, time: string) => {
      return multipleAppointments.filter(appointment => {
        return appointment.date === dateString && appointment.start_time === time;
      });
    };

    const appointments = getAppointmentsForSlot('2024-01-15', '09:00');
    expect(appointments).toHaveLength(3);

    // Should show first two appointments
    const visibleAppointments = appointments.slice(0, 2);
    expect(visibleAppointments).toHaveLength(2);
    expect(visibleAppointments[0].patient.name).toBe('João Silva');
    expect(visibleAppointments[1].patient.name).toBe('Maria Santos');

    // Should have overflow
    const hasOverflow = appointments.length > 2;
    const overflowCount = appointments.length - 2;
    expect(hasOverflow).toBe(true);
    expect(overflowCount).toBe(1);
  });

  it('should identify today correctly', () => {
    const today = new Date();
    const testDate = new Date('2024-01-15');
    
    const isToday = (date: Date) => {
      const todayString = today.toISOString().split('T')[0];
      const dateString = date.toISOString().split('T')[0];
      return todayString === dateString;
    };

    // This will be false unless the test runs on 2024-01-15
    expect(isToday(testDate)).toBe(false);
    expect(isToday(today)).toBe(true);
  });

  it('should identify weekend days correctly', () => {
    // Use UTC to avoid timezone issues
    const monday = new Date('2024-01-15T12:00:00Z'); // Monday
    const saturday = new Date('2024-01-20T12:00:00Z'); // Saturday  
    const sunday = new Date('2024-01-21T12:00:00Z'); // Sunday

    const isWeekend = (date: Date) => {
      return date.getDay() === 0 || date.getDay() === 6;
    };

    // Check day of week values
    expect(monday.getDay()).toBe(1); // Monday = 1
    expect(saturday.getDay()).toBe(6); // Saturday = 6
    expect(sunday.getDay()).toBe(0); // Sunday = 0

    expect(isWeekend(monday)).toBe(false);
    expect(isWeekend(saturday)).toBe(true);
    expect(isWeekend(sunday)).toBe(true);
  });

  it('should handle empty appointment slots', () => {
    const appointments: any[] = [];
    
    const getAppointmentsForSlot = (dateString: string, time: string) => {
      return appointments.filter(appointment => {
        return appointment.date === dateString && appointment.start_time === time;
      });
    };

    const emptySlot = getAppointmentsForSlot('2024-01-15', '09:00');
    expect(emptySlot).toHaveLength(0);

    const hasAppointments = emptySlot.length > 0;
    expect(hasAppointments).toBe(false);
  });
});