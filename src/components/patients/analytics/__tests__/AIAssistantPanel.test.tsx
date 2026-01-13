/**
 * Tests for AIAssistantPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIAssistantPanel } from '../AIAssistantPanel';

// Mock dependencies
vi.mock('@/hooks/usePatientAnalytics', () => ({
  usePatientAnalyticsDashboard: vi.fn(() => ({
    data: {
      progress_summary: {
        total_sessions: 10,
        overall_progress_percentage: 75,
      },
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useAIInsights', () => ({
  useAIPatientAssistant: vi.fn(() => ({
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: 'Olá! Como posso ajudar com a análise do paciente?',
      },
    ],
    isLoading: false,
    error: null,
    append: vi.fn(),
    reload: vi.fn(),
    stop: vi.fn(),
  })),
  useAIInsights: vi.fn(() => ({
    completion: null,
    isGenerating: false,
    generate: vi.fn(),
  })),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AIAssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the panel with patient context', () => {
    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    expect(screen.getByText('Assistente IA')).toBeInTheDocument();
    expect(screen.getByText('Análise inteligente do paciente')).toBeInTheDocument();
  });

  it('should toggle expand/collapse', () => {
    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    // Should be expanded by default
    expect(screen.getByText('Chat')).toBeInTheDocument();

    // Click collapse button
    const collapseButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg')
    );
    if (collapseButton) {
      fireEvent.click(collapseButton);
    }

    // After collapse, quick actions should not be visible
    expect(screen.queryByText('Analisar Progresso')).not.toBeInTheDocument();
  });

  it('should switch between chat and insights tabs', () => {
    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    // Chat tab should be active by default
    expect(screen.getByText('Chat')).toBeInTheDocument();

    // Click on Insights tab
    const insightsTab = screen.getByText('Insights');
    fireEvent.click(insightsTab);

    expect(screen.getByText('Análise Clínica Gerada por IA')).toBeInTheDocument();
  });

  it('should display quick action buttons', () => {
    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    expect(screen.getByText('Analisar Progresso')).toBeInTheDocument();
    expect(screen.getByText('Identificar Riscos')).toBeInTheDocument();
    expect(screen.getByText('Recomendações')).toBeInTheDocument();
    expect(screen.getByText('Predições')).toBeInTheDocument();
  });

  it('should have input field for chat', () => {
    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    const input = screen.getByPlaceholderText('Pergunte sobre o paciente...');
    expect(input).toBeInTheDocument();
  });

  it('should display assistant messages', () => {
    const { useAIPatientAssistant } = require('@/hooks/useAIInsights');

    useAIPatientAssistant.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Olá! Como posso ajudar com a análise do paciente?',
        },
        {
          id: '2',
          role: 'user',
          content: 'Qual é o progresso do paciente?',
        },
      ],
      isLoading: false,
      error: null,
      append: vi.fn(),
    });

    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    expect(screen.getByText('Qual é o progresso do paciente?')).toBeInTheDocument();
  });

  it('should show loading indicator when chat is loading', () => {
    const { useAIPatientAssistant } = require('@/hooks/useAIInsights');

    useAIPatientAssistant.mockReturnValue({
      messages: [],
      isLoading: true,
      error: null,
      append: vi.fn(),
    });

    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    // Loading dots should be present
    const loadingDots = screen.getAllByRole('generic').find(el =>
      el.classList.contains('animate-bounce')
    );
    expect(loadingDots).toBeTruthy();
  });
});

describe('AIAssistantMini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render floating button when closed', async () => {
    const { AIAssistantMini } = await import('../AIAssistantPanel');

    render(<AIAssistantMini patientId="patient-1" patientName="João Silva" />);

    // Floating button should be present with sparkles icon
    const sparklesIcon = document.querySelector('svg');
    expect(sparklesIcon).toBeTruthy();
  });
});
