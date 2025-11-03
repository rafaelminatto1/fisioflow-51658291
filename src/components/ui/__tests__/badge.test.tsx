import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  it('deve renderizar badge com texto', () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('deve aplicar variant default', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('[class*="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar variant secondary', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    const badge = container.querySelector('[class*="secondary"]');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar variant destructive', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    const badge = container.querySelector('[class*="destructive"]');
    expect(badge).toBeInTheDocument();
  });

  it('deve aplicar variant outline', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    const badge = container.querySelector('[class*="outline"]');
    expect(badge).toBeInTheDocument();
  });
});
