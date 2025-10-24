import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Calendar } from 'lucide-react';
import { ScheduleStatsCard } from '../ScheduleStatsCard';

describe('ScheduleStatsCard', () => {
  it('deve renderizar com props básicas', () => {
    render(
      <ScheduleStatsCard
        title="Teste"
        value={10}
        description="Descrição de teste"
        icon={Calendar}
        iconColor="bg-primary/10 text-primary"
        bgGradient="bg-gradient-to-br from-primary/5 to-primary/[0.02]"
      />
    );

    expect(screen.getByText('Teste')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Descrição de teste')).toBeInTheDocument();
  });

  it('deve aplicar valueColor quando fornecido', () => {
    render(
      <ScheduleStatsCard
        title="Confirmados"
        value={5}
        description="Pacientes"
        icon={Calendar}
        iconColor="bg-success/10 text-success"
        bgGradient="bg-gradient-to-br from-success/5"
        valueColor="text-success"
      />
    );

    const valueElement = screen.getByText('5');
    expect(valueElement).toHaveClass('text-success');
  });

  it('deve aplicar animationDelay quando fornecido', () => {
    const { container } = render(
      <ScheduleStatsCard
        title="Pendentes"
        value={3}
        description="Aguardando"
        icon={Calendar}
        iconColor="bg-warning/10"
        bgGradient="bg-gradient-to-br from-warning/5"
        animationDelay="0.2s"
      />
    );

    const card = container.querySelector('.animate-bounce-in');
    expect(card).toHaveStyle({ animationDelay: '0.2s' });
  });

  it('deve ter classes de hover e transição', () => {
    const { container } = render(
      <ScheduleStatsCard
        title="Total"
        value={20}
        description="Agendamentos"
        icon={Calendar}
        iconColor="bg-primary/10"
        bgGradient="bg-gradient-to-br from-primary/5"
      />
    );

    const card = container.querySelector('.hover-lift');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('transition-all', 'duration-300');
  });

  it('deve renderizar ícone corretamente', () => {
    const { container } = render(
      <ScheduleStatsCard
        title="Teste"
        value={1}
        description="Item"
        icon={Calendar}
        iconColor="bg-primary/10 text-primary"
        bgGradient="bg-gradient-to-br from-primary/5"
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
