import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';
import { Calendar } from 'lucide-react';

describe('EmptyState Component', () => {
  it('deve renderizar título', () => {
    render(<EmptyState title="Nenhum item encontrado" />);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('deve renderizar descrição quando fornecida', () => {
    render(
      <EmptyState 
        title="Sem eventos" 
        description="Crie seu primeiro evento"
      />
    );
    expect(screen.getByText('Crie seu primeiro evento')).toBeInTheDocument();
  });

  it('deve renderizar ícone quando fornecido', () => {
    const { container } = render(
      <EmptyState 
        title="Vazio" 
        icon={Calendar}
      />
    );
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('deve renderizar botão de ação quando fornecido', () => {
    const onClick = vi.fn();
    render(
      <EmptyState 
        title="Vazio" 
        action={{ label: 'Criar novo', onClick }}
      />
    );
    expect(screen.getByText('Criar novo')).toBeInTheDocument();
  });

  it('não deve renderizar botão quando action não fornecida', () => {
    render(<EmptyState title="Vazio" />);
    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });

  it('deve aplicar className customizado', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
