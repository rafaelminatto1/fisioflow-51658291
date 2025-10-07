import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('deve renderizar button com texto', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);
    
    fireEvent.click(screen.getByText('Clique'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar disabled quando prop disabled=true', () => {
    render(<Button disabled>Botão Desabilitado</Button>);
    
    const button = screen.getByText('Botão Desabilitado');
    expect(button).toBeDisabled();
  });

  it('deve aplicar variant corretamente', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    
    const button = container.querySelector('button');
    expect(button?.className).toContain('outline');
  });

  it('deve aplicar size corretamente', () => {
    const { container } = render(<Button size="sm">Pequeno</Button>);
    
    const button = container.querySelector('button');
    expect(button?.className).toContain('sm');
  });

  it('deve renderizar com ícone', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(
      <Button>
        <Icon />
        Texto
      </Button>
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Texto')).toBeInTheDocument();
  });

  it('não deve chamar onClick quando disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Clique</Button>);
    
    fireEvent.click(screen.getByText('Clique'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
