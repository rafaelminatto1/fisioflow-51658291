import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SOAPEvolutionFormImproved from '../soap-improved/SOAPEvolutionFormImproved';

// Mock Lucide icons to prevent "Element type is invalid" if they are undefined in test env
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Activity: (props: any) => <div data-testid="icon-activity" {...props} />,
    Smile: (props: any) => <div data-testid="icon-smile" {...props} />,
    Meh: (props: any) => <div data-testid="icon-meh" {...props} />,
    Frown: (props: any) => <div data-testid="icon-frown" {...props} />,
    Grimace: (props: any) => <div data-testid="icon-grimace" {...props} />,
    Zap: (props: any) => <div data-testid="icon-zap" {...props} />,
    Dumbbell: (props: any) => <div data-testid="icon-dumbbell" {...props} />,
    Plus: (props: any) => <div data-testid="icon-plus" {...props} />,
    X: (props: any) => <div data-testid="icon-x" {...props} />,
    CheckCircle2: (props: any) => <div data-testid="icon-check" {...props} />,
    Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
    ChevronDown: (props: any) => <div data-testid="icon-chevron-down" {...props} />,
    ChevronUp: (props: any) => <div data-testid="icon-chevron-up" {...props} />,
    Calendar: (props: any) => <div data-testid="icon-calendar" {...props} />,
    Clock: (props: any) => <div data-testid="icon-clock" {...props} />,
    MoreVertical: (props: any) => <div data-testid="icon-more" {...props} />,
    User: (props: any) => <div data-testid="icon-user" {...props} />,
    Eye: (props: any) => <div data-testid="icon-eye" {...props} />,
    Brain: (props: any) => <div data-testid="icon-brain" {...props} />,
    ClipboardList: (props: any) => <div data-testid="icon-clipboard" {...props} />,
  };
});

// Mock dependências visuais e hooks para não quebrar o teste do componente complexo
vi.mock('@/hooks/ai/usePeerReview', () => ({
  usePeerReview: () => ({
    reviewSoap: vi.fn(),
    reviewResult: null,
    loading: false,
    clearReview: vi.fn()
  })
}));

describe('SOAPEvolutionFormImproved Component', () => {
  it('should render the AI Peer Review button', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    // The form takes props like patientId, defaultValues, etc.
    // Providing minimal mocks to prevent crash
    render(
      <SOAPEvolutionFormImproved
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSubmitting={false}
      />
    );

    // Verify the AI widget button is present
    const aiButton = screen.getByText('Pedir Revisão por Pares da IA');
    expect(aiButton).toBeInTheDocument();
  });
});
