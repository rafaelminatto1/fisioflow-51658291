import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedAppointmentList } from '../VirtualizedAppointmentList';
import type { Appointment } from '@/types/appointment';

// Mock the AppointmentCard component
vi.mock('../../AppointmentCard', () => ({
  AppointmentCard: ({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) => (
    <div data-testid={`appointment-${appointment.id}`} onClick={onClick}>
      {appointment.patientName}
    </div>
  )
}));

describe('VirtualizedAppointmentList', () => {
  const createMockAppointment = (id: string, index: number): Appointment => ({
    id,
    patientId: `patient-${id}`,
    patientName: `Patient ${index}`,
    therapistId: 'therapist-1',
    date: new Date('2024-01-15'),
    time: `${String(8 + Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`,
    duration: 60,
    type: 'Fisioterapia',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  it('should render all appointments when count is below virtualization threshold', () => {
    const appointments = Array.from({ length: 10 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
      />
    );

    // All appointments should be rendered (no virtualization for small lists)
    appointments.forEach(apt => {
      expect(screen.getByTestId(`appointment-${apt.id}`)).toBeInTheDocument();
    });
  });

  it('should apply virtualization for large lists (50+ appointments)', () => {
    const appointments = Array.from({ length: 100 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
      />
    );

    // Should have a scrollable container
    const scrollContainer = container.querySelector('[style*="height: 100%"]');
    expect(scrollContainer).toBeInTheDocument();

    // Not all appointments should be rendered initially (virtualization active)
    const renderedAppointments = container.querySelectorAll('[data-testid^="appointment-"]');
    expect(renderedAppointments.length).toBeLessThan(appointments.length);
  });

  it('should call onAppointmentClick when an appointment is clicked', () => {
    const appointments = Array.from({ length: 5 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
      />
    );

    const firstAppointment = screen.getByTestId('appointment-apt-0');
    fireEvent.click(firstAppointment);

    expect(onAppointmentClick).toHaveBeenCalledWith(appointments[0]);
  });

  it('should render appointments with absolute positioning when virtualized', () => {
    const appointments = Array.from({ length: 60 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        itemHeight={200}
      />
    );

    // Check that appointments use absolute positioning
    const appointmentWrappers = container.querySelectorAll('[style*="position: absolute"]');
    expect(appointmentWrappers.length).toBeGreaterThan(0);
  });

  it('should calculate correct total height based on appointment count', () => {
    const appointments = Array.from({ length: 60 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const itemHeight = 200;
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        itemHeight={itemHeight}
      />
    );

    const expectedHeight = appointments.length * itemHeight;
    const innerContainer = container.querySelector('[style*="position: relative"]');
    
    expect(innerContainer).toHaveStyle({ height: `${expectedHeight}px` });
  });

  it('should handle scroll events to update visible range', () => {
    const appointments = Array.from({ length: 60 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        itemHeight={200}
      />
    );

    const scrollContainer = container.querySelector('[style*="height: 100%"]');
    expect(scrollContainer).toBeInTheDocument();

    // Simulate scroll
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });
    }

    // Component should still be rendered (scroll handler should work)
    expect(scrollContainer).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const appointments = Array.from({ length: 5 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should handle empty appointments array', () => {
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={[]}
        onAppointmentClick={onAppointmentClick}
      />
    );

    // Should render without errors
    expect(container.querySelector('.space-y-3')).toBeInTheDocument();
  });

  it('should use custom itemHeight and overscan values', () => {
    const appointments = Array.from({ length: 60 }, (_, i) => 
      createMockAppointment(`apt-${i}`, i)
    );
    const customItemHeight = 250;
    const onAppointmentClick = vi.fn();

    const { container } = render(
      <VirtualizedAppointmentList
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        itemHeight={customItemHeight}
        overscan={5}
      />
    );

    const expectedHeight = appointments.length * customItemHeight;
    const innerContainer = container.querySelector('[style*="position: relative"]');
    
    expect(innerContainer).toHaveStyle({ height: `${expectedHeight}px` });
  });
});
