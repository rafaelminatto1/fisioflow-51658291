import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveTable } from '../responsive-table';

describe('ResponsiveTable', () => {
  const mockData = [
    { id: '1', nome: 'João Silva', email: 'joao@example.com' },
    { id: '2', nome: 'Maria Santos', email: 'maria@example.com' },
  ];

  const mockColumns = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
  ];

  it('deve renderizar tabela com dados', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('deve mostrar mensagem quando vazio', () => {
    render(
      <ResponsiveTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        emptyMessage="Nenhum dado encontrado"
      />
    );

    expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument();
  });

  it('deve aplicar custom render quando fornecido', () => {
    const columnsWithRender = [
      {
        key: 'nome',
        label: 'Nome',
        render: (item: typeof mockData[0]) => <strong>{item.nome.toUpperCase()}</strong>,
      },
    ];

    render(
      <ResponsiveTable
        data={mockData}
        columns={columnsWithRender}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('JOÃO SILVA')).toBeInTheDocument();
  });

  it('deve ter labels de coluna visíveis', () => {
    render(
      <ResponsiveTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toBeInTheDocument();
  });
});
