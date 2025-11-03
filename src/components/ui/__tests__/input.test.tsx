import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('deve renderizar input', () => {
    render(<Input placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument();
  });

  it('deve chamar onChange quando valor muda', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'teste' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar disabled quando prop disabled=true', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('deve aceitar diferentes tipos', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    
    rerender(<Input type="password" />);
    expect(screen.getByLabelText('')).toHaveAttribute('type', 'password');
  });

  it('deve aplicar className customizado', () => {
    const { container } = render(<Input className="custom-class" />);
    const input = container.querySelector('.custom-class');
    expect(input).toBeInTheDocument();
  });
});
