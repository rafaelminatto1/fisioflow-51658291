/**
 * Tests for AIAssistantPanel component
 */


// Mock dependencies

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIAssistantPanel, AIAssistantMini } from '../AIAssistantPanel';
import * as useAIInsightsModule from '@/hooks/useAIInsights';

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

// Import mocked module
vi.mocked(useAIInsightsModule);

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AIAssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return values
    vi.mocked(useAIInsightsModule.useAIPatientAssistant).mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'Olá! Como posso ajudar com a análise do paciente?',
        },
      ],
      isLoading: false,
      error: null,
      append: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
    });
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
    vi.mocked(useAIInsightsModule.useAIPatientAssistant).mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'Olá! Como posso ajudar com a análise do paciente?',
        },
        {
          id: '2',
          role: 'user' as const,
          content: 'Qual é o progresso do paciente?',
        },
      ],
      isLoading: false,
      error: null,
      append: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
    });

    render(<AIAssistantPanel patientId="patient-1" patientName="João Silva" />);

    expect(screen.getByText('Qual é o progresso do paciente?')).toBeInTheDocument();
  });

  it('should show loading indicator when chat is loading', () => {
    vi.mocked(useAIInsightsModule.useAIPatientAssistant).mockReturnValue({
      messages: [],
      isLoading: true,
      error: null,
      append: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
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
    vi.mocked(useAIInsightsModule.useAIPatientAssistant).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      append: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
    });
  });

  it('should render floating button when closed', () => {
    render(<AIAssistantMini patientId="patient-1" patientName="João Silva" />);

    // Floating button should be present with sparkles icon
    const sparklesIcon = document.querySelector('svg');
    expect(sparklesIcon).toBeTruthy();
  });
});
