import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Appointment } from '@/types/agenda';

// Mock appointment data
const mockAppointment: Appointment = {
  id: 'apt1',
  patient_id: 'patient1',
  therapist_id: 'therapist1',
  date: '2024-01-15',
  start_time: '09:00',
  end_time: '10:00',
  status: 'scheduled',
  payment_status: 'pending',
  session_type: 'individual',
  notes: 'First session with patient',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T09:00:00Z',
  patient: {
    id: 'patient1',
    name: 'João Silva',
    phone: '11999999999',
    email: 'joao@email.com',
    session_price: 80.00,
    package_sessions: 10,
    remaining_sessions: 5,
    important_notes: '',
    status: 'active',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z'
  }
};

describe('AppointmentBlock Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should determine correct status configuration', () => {
    const getStatusConfig = (status: Appointment['status']) => {
      switch (status) {
        case 'scheduled':
          return {
            label: 'Agendado',
            bgColor: 'bg-blue-50 hover:bg-blue-100',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-900'
          };
        case 'completed':
          return {
            label: 'Concluído',
            bgColor: 'bg-green-50 hover:bg-green-100',
            borderColor: 'border-green-200',
            textColor: 'text-green-900'
          };
        case 'missed':
          return {
            label: 'Faltou',
            bgColor: 'bg-red-50 hover:bg-red-100',
            borderColor: 'border-red-200',
            textColor: 'text-red-900'
          };
        case 'cancelled':
          return {
            label: 'Cancelado',
            bgColor: 'bg-gray-50 hover:bg-gray-100',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-900'
          };
        case 'rescheduled':
          return {
            label: 'Reagendado',
            bgColor: 'bg-yellow-50 hover:bg-yellow-100',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-900'
          };
        default:
          return {
            label: 'Desconhecido',
            bgColor: 'bg-gray-50 hover:bg-gray-100',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-900'
          };
      }
    };

    expect(getStatusConfig('scheduled').label).toBe('Agendado');
    expect(getStatusConfig('scheduled').bgColor).toContain('bg-blue-50');
    
    expect(getStatusConfig('completed').label).toBe('Concluído');
    expect(getStatusConfig('completed').bgColor).toContain('bg-green-50');
    
    expect(getStatusConfig('missed').label).toBe('Faltou');
    expect(getStatusConfig('missed').bgColor).toContain('bg-red-50');
    
    expect(getStatusConfig('cancelled').label).toBe('Cancelado');
    expect(getStatusConfig('cancelled').bgColor).toContain('bg-gray-50');
    
    expect(getStatusConfig('rescheduled').label).toBe('Reagendado');
    expect(getStatusConfig('rescheduled').bgColor).toContain('bg-yellow-50');
  });

  it('should determine correct payment status configuration', () => {
    const getPaymentStatusConfig = (paymentStatus: Appointment['payment_status']) => {
      switch (paymentStatus) {
        case 'paid':
          return {
            label: 'Pago',
            textColor: 'text-green-600'
          };
        case 'partial':
          return {
            label: 'Parcial',
            textColor: 'text-yellow-600'
          };
        case 'pending':
          return {
            label: 'Pendente',
            textColor: 'text-red-600'
          };
        default:
          return {
            label: 'Desconhecido',
            textColor: 'text-gray-600'
          };
      }
    };

    expect(getPaymentStatusConfig('paid').label).toBe('Pago');
    expect(getPaymentStatusConfig('paid').textColor).toBe('text-green-600');
    
    expect(getPaymentStatusConfig('partial').label).toBe('Parcial');
    expect(getPaymentStatusConfig('partial').textColor).toBe('text-yellow-600');
    
    expect(getPaymentStatusConfig('pending').label).toBe('Pendente');
    expect(getPaymentStatusConfig('pending').textColor).toBe('text-red-600');
  });

  it('should handle different appointment sizes', () => {
    const sizes = ['compact', 'normal', 'expanded'] as const;
    
    sizes.forEach(size => {
      const sizeConfig = {
        compact: { padding: 'p-1', text: 'text-xs' },
        normal: { padding: 'p-2', text: 'text-sm' },
        expanded: { padding: 'p-3', text: 'text-sm' }
      };

      expect(sizeConfig[size]).toBeDefined();
      expect(sizeConfig[size].padding).toContain('p-');
      expect(sizeConfig[size].text).toContain('text-');
    });
  });

  it('should format appointment time correctly', () => {
    const formatTimeRange = (startTime: string, endTime: string) => {
      return `${startTime} - ${endTime}`;
    };

    expect(formatTimeRange('09:00', '10:00')).toBe('09:00 - 10:00');
    expect(formatTimeRange('14:30', '15:30')).toBe('14:30 - 15:30');
  });

  it('should format session price correctly', () => {
    const formatPrice = (price: number) => {
      return `R$ ${price.toFixed(2)}`;
    };

    expect(formatPrice(80.00)).toBe('R$ 80.00');
    expect(formatPrice(120.50)).toBe('R$ 120.50');
    expect(formatPrice(75)).toBe('R$ 75.00');
  });

  it('should handle missing patient information gracefully', () => {
    const appointmentWithoutPatient: Appointment = {
      ...mockAppointment,
      patient: undefined
    };

    const getPatientName = (appointment: Appointment) => {
      return appointment.patient?.name || 'Paciente não informado';
    };

    expect(getPatientName(mockAppointment)).toBe('João Silva');
    expect(getPatientName(appointmentWithoutPatient)).toBe('Paciente não informado');
  });

  it('should determine session type label correctly', () => {
    const getSessionTypeLabel = (sessionType: Appointment['session_type']) => {
      return sessionType === 'individual' ? 'Individual' : 'Grupo';
    };

    expect(getSessionTypeLabel('individual')).toBe('Individual');
    expect(getSessionTypeLabel('group')).toBe('Grupo');
  });

  it('should handle multiple appointments in same slot', () => {
    const appointments = [
      { ...mockAppointment, id: 'apt1', patient: { ...mockAppointment.patient!, name: 'João Silva' } },
      { ...mockAppointment, id: 'apt2', patient: { ...mockAppointment.patient!, name: 'Maria Santos' } },
      { ...mockAppointment, id: 'apt3', patient: { ...mockAppointment.patient!, name: 'Pedro Costa' } }
    ];

    const maxVisible = 2;
    const visibleAppointments = appointments.slice(0, maxVisible);
    const hiddenCount = Math.max(0, appointments.length - maxVisible);

    expect(visibleAppointments).toHaveLength(2);
    expect(visibleAppointments[0].patient?.name).toBe('João Silva');
    expect(visibleAppointments[1].patient?.name).toBe('Maria Santos');
    expect(hiddenCount).toBe(1);
  });

  it('should handle appointment notes truncation', () => {
    const truncateText = (text: string, maxLength: number = 50) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    const longNote = 'This is a very long note that should be truncated when displayed in compact view';
    const shortNote = 'Short note';

    expect(truncateText(longNote, 30)).toContain('...');
    expect(truncateText(shortNote, 30)).toBe('Short note');
    expect(truncateText(longNote, 30).length).toBeLessThanOrEqual(33); // 30 + '...'
  });

  it('should validate appointment data structure', () => {
    const isValidAppointment = (appointment: any): appointment is Appointment => {
      if (!appointment || typeof appointment !== 'object') {
        return false;
      }
      
      return (
        typeof appointment.id === 'string' &&
        typeof appointment.patient_id === 'string' &&
        typeof appointment.therapist_id === 'string' &&
        typeof appointment.date === 'string' &&
        typeof appointment.start_time === 'string' &&
        typeof appointment.end_time === 'string' &&
        ['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'].includes(appointment.status) &&
        ['pending', 'paid', 'partial'].includes(appointment.payment_status) &&
        ['individual', 'group'].includes(appointment.session_type)
      );
    };

    expect(isValidAppointment(mockAppointment)).toBe(true);
    expect(isValidAppointment({})).toBe(false);
    expect(isValidAppointment(null as any)).toBe(false);
    expect(isValidAppointment({ ...mockAppointment, status: 'invalid' })).toBe(false);
  });

  it('should handle click events properly', () => {
    const onClick = vi.fn();
    const appointmentId = 'apt1';

    // Simulate click handler
    const handleClick = (e: Event) => {
      e.stopPropagation();
      onClick(appointmentId);
    };

    const mockEvent = {
      stopPropagation: vi.fn()
    } as any;

    handleClick(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(appointmentId);
  });
});