import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentSearch } from '../AppointmentSearch';

describe('AppointmentSearch', () => {
  it('deve renderizar com valor inicial', () => {
    render(
      <AppointmentSearch
        value="João Silva"
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    expect(input).toHaveValue('João Silva');
  });

  it('deve chamar onChange quando digitar', () => {
    const handleChange = vi.fn();
    render(
      <AppointmentSearch
        value=""
        onChange={handleChange}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(input, { target: { value: 'Maria' } });
    
    expect(handleChange).toHaveBeenCalledWith('Maria');
  });

  it('deve mostrar botão de limpar quando tem valor', () => {
    render(
      <AppointmentSearch
        value="Teste"
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('não deve mostrar botão de limpar quando não tem valor', () => {
    render(
      <AppointmentSearch
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const clearButton = screen.queryByRole('button');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('deve chamar onClear quando clicar no botão', () => {
    const handleClear = vi.fn();
    render(
      <AppointmentSearch
        value="Teste"
        onChange={vi.fn()}
        onClear={handleClear}
      />
    );

    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(handleClear).toHaveBeenCalled();
  });

  it('deve ter ícone de busca', () => {
    const { container } = render(
      <AppointmentSearch
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const searchIcon = container.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });
});
