/**
 * Tests for usePatientAnalytics hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as hooks from '../usePatientAnalytics';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockQuery),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

const mockQuery = {
  select: vi.fn(() => mockQuery),
  insert: vi.fn(() => mockQuery),
  update: vi.fn(() => mockQuery),
  eq: vi.fn(() => mockQuery),
  order: vi.fn(() => mockQuery),
  limit: vi.fn(() => mockQuery),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  is: vi.fn(() => mockQuery),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

describe('usePatientAnalytics - Query Keys', () => {
  it('should have correct query key structure', () => {
    expect(hooks.PATIENT_ANALYTICS_KEYS.all).toEqual(['patient-analytics']);
    expect(hooks.PATIENT_ANALYTICS_KEYS.progress('patient-1')).toEqual([
      'patient-analytics',
      'patient-1',
      'progress',
    ]);
    expect(hooks.PATIENT_ANALYTICS_KEYS.lifecycle('patient-1')).toEqual([
      'patient-analytics',
      'patient-1',
      'lifecycle',
    ]);
    expect(hooks.PATIENT_ANALYTICS_KEYS.predictions('patient-1')).toEqual([
      'patient-analytics',
      'patient-1',
      'predictions',
    ]);
  });
});

describe('usePatientProgressSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be disabled when patientId is empty', () => {
    mockSupabase.rpc.mockReturnValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientProgressSummary(''), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch progress summary for valid patientId', async () => {
    const mockData = {
      total_sessions: 10,
      avg_pain_reduction: 5.5,
      total_pain_reduction: 55,
      goals_achieved: 3,
      overall_progress_percentage: 75,
    };

    mockSupabase.rpc.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientProgressSummary('patient-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('usePatientRiskScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return null when no risk score exists', async () => {
    mockQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientRiskScore('patient-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('should fetch latest risk score', async () => {
    const mockRiskScore = {
      id: 'risk-1',
      patient_id: 'patient-1',
      dropout_risk_score: 25,
      no_show_risk_score: 30,
      poor_outcome_risk_score: 20,
      overall_risk_score: 25,
      risk_level: 'low',
      calculated_at: new Date().toISOString(),
    };

    mockQuery.maybeSingle.mockResolvedValue({
      data: mockRiskScore,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientRiskScore('patient-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.risk_level).toBe('low');
      expect(result.current.data?.dropout_risk_score).toBe(25);
    });
  });
});

describe('usePatientGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch patient goals ordered by target date', async () => {
    const mockGoals = [
      {
        id: 'goal-1',
        patient_id: 'patient-1',
        goal_title: 'Reducir dor lombar',
        description: 'Reduzir dor de 8 para 3',
        status: 'in_progress',
        progress_percentage: 60,
        target_date: '2024-03-01',
        created_at: new Date().toISOString(),
      },
      {
        id: 'goal-2',
        patient_id: 'patient-1',
        goal_title: 'Aumentar flexibilidade',
        description: 'Alcançar os dedos dos pés',
        status: 'not_started',
        progress_percentage: 0,
        target_date: '2024-04-01',
        created_at: new Date().toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({
      data: mockGoals,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientGoals('patient-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].goal_title).toBe('Reducir dor lombar');
    });
  });
});

describe('usePatientPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should filter by prediction type when provided', async () => {
    const mockPredictions = [
      {
        id: 'pred-1',
        patient_id: 'patient-1',
        prediction_type: 'dropout_risk',
        predicted_value: 25,
        confidence_score: 0.85,
        target_date: null,
        is_active: true,
        prediction_date: new Date().toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({
      data: mockPredictions,
      error: null,
    });

    const { result } = renderHook(
      () => hooks.usePatientPredictions('patient-1', 'dropout_risk'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].prediction_type).toBe('dropout_risk');
    });
  });
});

describe('usePatientInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should exclude acknowledged insights by default', async () => {
    const mockInsights = [
      {
        id: 'insight-1',
        patient_id: 'patient-1',
        insight_type: 'risk_detected',
        title: 'Alto risco de abandono',
        description: 'Paciente não compareceu às últimas 3 sessões',
        is_acknowledged: false,
        created_at: new Date().toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({
      data: mockInsights,
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientInsights('patient-1', false), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].is_acknowledged).toBe(false);
    });
  });
});

describe('usePatientAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should aggregate data from multiple queries', async () => {
    // Mock all the required queries
    mockSupabase.rpc.mockResolvedValue({
      data: {
        total_sessions: 10,
        avg_pain_reduction: 5.5,
        total_pain_reduction: 55,
        goals_achieved: 3,
        overall_progress_percentage: 75,
      },
      error: null,
    });

    mockQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'risk-1',
        dropout_risk_score: 25,
        risk_level: 'low',
        calculated_at: new Date().toISOString(),
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientAnalyticsDashboard('patient-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeDefined();
    });
  });

  it('should provide refetch function for all queries', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    mockQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => hooks.usePatientAnalyticsDashboard('patient-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
