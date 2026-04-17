import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SOAPEvolutionFormImproved from '../soap-improved/SOAPEvolutionFormImproved';

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
