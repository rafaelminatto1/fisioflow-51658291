import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentSearch } from '../AppointmentSearch';

describe('AppointmentSearch', () => {
  it('deve renderizar com valor inicial', () => {
    render(
      <AppointmentSearch
        searchTerm="João Silva"
        onSearchChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    expect(input).toHaveValue('João Silva');
  });

  it('deve chamar onChange quando digitar', () => {
    const handleChange = vi.fn();
    render(
      <AppointmentSearch
        searchTerm=""
        onSearchChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(input, { target: { value: 'Maria' } });

    expect(handleChange).toHaveBeenCalledWith('Maria');
  });

  it('deve mostrar botão de limpar quando tem valor', () => {
    render(
      <AppointmentSearch
        searchTerm="Teste"
        onSearchChange={vi.fn()}
      />
    );

    const clearButton = screen.getByRole('button', { name: /limpar/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('não deve mostrar botão de limpar quando não tem valor', () => {
    render(
      <AppointmentSearch
        searchTerm=""
        onSearchChange={vi.fn()}
      />
    );

    const clearButton = screen.queryByRole('button', { name: /limpar/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('deve chamar onClear quando clicar no botão', () => {
    const handleClear = vi.fn();
    render(
      <AppointmentSearch
        searchTerm="Teste"
        onSearchChange={handleClear}
      />
    );

    const clearButton = screen.getByRole('button', { name: /limpar/i });
    fireEvent.click(clearButton);

    expect(handleClear).toHaveBeenCalledWith('');
  });

  it('deve ter ícone de busca', () => {
    const { container } = render(
      <AppointmentSearch
        searchTerm=""
        onSearchChange={vi.fn()}
      />
    );

    const searchIcon = container.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });
});
