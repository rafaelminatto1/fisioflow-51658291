import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('deve renderizar card corretamente', () => {
      render(<Card data-testid="card">Conteúdo do Card</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('deve aplicar className customizado', () => {
      const { container } = render(<Card className="custom-class">Card</Card>);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('deve renderizar header do card', () => {
      render(
        <Card>
          <CardHeader data-testid="header">Header Content</CardHeader>
        </Card>
      );
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('deve renderizar título do card', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Título do Card</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Título do Card')).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('deve renderizar descrição do card', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Descrição detalhada</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Descrição detalhada')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('deve renderizar conteúdo do card', () => {
      render(
        <Card>
          <CardContent>Conteúdo principal</CardContent>
        </Card>
      );
      expect(screen.getByText('Conteúdo principal')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('deve renderizar footer do card', () => {
      render(
        <Card>
          <CardFooter>Footer com botões</CardFooter>
        </Card>
      );
      expect(screen.getByText('Footer com botões')).toBeInTheDocument();
    });
  });

  describe('Card completo', () => {
    it('deve renderizar estrutura completa do card', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Título</CardTitle>
            <CardDescription>Descrição</CardDescription>
          </CardHeader>
          <CardContent>Conteúdo</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Descrição')).toBeInTheDocument();
      expect(screen.getByText('Conteúdo')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});
