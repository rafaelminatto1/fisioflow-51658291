import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../loading-skeleton';

describe('LoadingSkeleton Component', () => {
  it('deve renderizar skeleton tipo table', () => {
    const { container } = render(<LoadingSkeleton type="table" rows={3} />);
    const skeletons = container.querySelectorAll('[class*="h-"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve renderizar skeleton tipo card', () => {
    const { container } = render(<LoadingSkeleton type="card" rows={2} />);
    const cards = container.querySelectorAll('[class*="grid"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('deve renderizar skeleton tipo list', () => {
    const { container } = render(<LoadingSkeleton type="list" rows={4} />);
    const items = container.querySelectorAll('[class*="flex"]');
    expect(items.length).toBeGreaterThan(0);
  });

  it('deve renderizar skeleton tipo form', () => {
    const { container } = render(<LoadingSkeleton type="form" rows={3} />);
    const formFields = container.querySelectorAll('[class*="space-y"]');
    expect(formFields.length).toBeGreaterThan(0);
  });

  it('deve usar tipo card como padrão', () => {
    const { container } = render(<LoadingSkeleton />);
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('deve renderizar quantidade correta de linhas', () => {
    const rows = 5;
    const { container } = render(<LoadingSkeleton type="list" rows={rows} />);
    const items = container.querySelectorAll('[class*="flex items-center"]');
    expect(items.length).toBe(rows);
  });

  it('deve aplicar className customizado', () => {
    const { container } = render(
      <LoadingSkeleton type="table" className="custom-skeleton" />
    );
    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});
