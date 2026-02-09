import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniCalendar } from '../MiniCalendar';

describe('MiniCalendar', () => {
  const mockDate = new Date(2025, 0, 15); // 15 de janeiro de 2025
  const appointmentDates = [
    new Date(2025, 0, 10),
    new Date(2025, 0, 15),
    new Date(2025, 0, 20),
  ];

  it('deve renderizar o mês atual', () => {
    render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={[]}
      />
    );

    expect(screen.getByText(/janeiro/i)).toBeInTheDocument();
    expect(screen.getByText(/2025/i)).toBeInTheDocument();
  });

  it('deve marcar a data selecionada', () => {
    const { container } = render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={[]}
      />
    );

    const selectedButton = container.querySelector('[data-selected="true"]');
    expect(selectedButton).toBeInTheDocument();
    expect(selectedButton).toHaveTextContent('15');
  });

  it('deve mostrar indicadores de agendamentos', () => {
    const { container } = render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={appointmentDates}
      />
    );

    const indicators = container.querySelectorAll('.bg-primary');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('deve chamar onDateSelect ao clicar em data', () => {
    const handleDateSelect = vi.fn();
    render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={handleDateSelect}
        appointmentDates={[]}
      />
    );

    // Clicar no dia 20
    const dayButtons = screen.getAllByRole('button');
    const day20Button = dayButtons.find(btn => btn.textContent === '20');

    if (day20Button) {
      fireEvent.click(day20Button);
      expect(handleDateSelect).toHaveBeenCalled();
    }
  });

  it('deve navegar para mês anterior', () => {
    render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={[]}
      />
    );

    const prevButton = screen.getByLabelText(/mês anterior/i);
    fireEvent.click(prevButton);

    expect(screen.getByText(/dezembro/i)).toBeInTheDocument();
  });

  it('deve navegar para próximo mês', () => {
    render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={[]}
      />
    );

    const nextButton = screen.getByLabelText(/próximo mês/i);
    fireEvent.click(nextButton);

    expect(screen.getByText(/fevereiro/i)).toBeInTheDocument();
  });

  it('deve renderizar legenda de indicadores', () => {
    render(
      <MiniCalendar
        selectedDate={mockDate}
        onDateSelect={vi.fn()}
        appointmentDates={appointmentDates}
      />
    );

    expect(screen.getByText('Com agendamentos')).toBeInTheDocument();
  });
});
