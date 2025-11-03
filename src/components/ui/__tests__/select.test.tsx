import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

describe('Select', () => {
  it('deve renderizar select com trigger', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Opção 1</SelectItem>
          <SelectItem value="2">Opção 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByText('Selecione')).toBeInTheDocument();
  });

  it('deve renderizar múltiplas opções', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="opt1">Opção 1</SelectItem>
          <SelectItem value="opt2">Opção 2</SelectItem>
          <SelectItem value="opt3">Opção 3</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
  });
});
