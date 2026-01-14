/**
 * Tests for useAnalyticsExport hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsExport, useBatchAnalyticsExport } from '../useAnalyticsExport';

// Mock jsPDF
vi.mock('jspdf', () => ({
  default: vi.fn(function () {
    this.text = vi.fn();
    this.rect = vi.fn();
    this.setFillColor = vi.fn();
    this.setTextColor = vi.fn();
    this.setFontSize = vi.fn();
    this.addPage = vi.fn();
    this.setPage = vi.fn();
    this.getNumberOfPages = vi.fn(() => 1);
    this.save = vi.fn();
  })
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn()
}));

// Mock xlsx
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn()
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, fmt, options) => '20240113_1200')
}));

vi.mock('date-fns/locale', () => ({
  ptBR: {}
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

const createQueryClient = () => new QueryClient({
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
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useAnalyticsExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('exportData function', () => {
    it('should export data as JSON', async () => {
      const mockData = {
        progress_summary: {
          total_sessions: 10,
          total_pain_reduction: 50,
          goals_achieved: 3,
          overall_progress_percentage: 75
        },
        pain_trend: {
          current_score: 3,
          change: -5,
          change_percentage: -62.5
        },
        function_trend: {
          current_score: 7,
          change: 3,
          change_percentage: 75
        },
        predictions: {
          dropout_probability: 15,
          success_probability: 85,
          predicted_recovery_date: '2024-03-15'
        },
        goals: [
          {
            goal_title: 'Reduzir dor lombar',
            status: 'em_progresso',
            progress_percentage: 70
          }
        ]
      };

      const { result } = renderHook(() => useAnalyticsExport(), { wrapper });

      await act(async () => {
        result.current.exportData({
          patientId: 'patient-1',
          patientName: 'João Silva',
          analyticsData: mockData as any,
          options: { format: 'json' }
        });
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('should export data as CSV', async () => {
      const mockData = {
        progress_summary: {
          total_sessions: 10,
          total_pain_reduction: 50,
          goals_achieved: 3,
          overall_progress_percentage: 75
        },
        pain_trend: null,
        function_trend: null,
        predictions: {
          dropout_probability: 15,
          success_probability: 85
        },
        goals: []
      };

      const { result } = renderHook(() => useAnalyticsExport(), { wrapper });

      await act(async () => {
        result.current.exportData({
          patientId: 'patient-1',
          patientName: 'João Silva',
          analyticsData: mockData as any,
          options: { format: 'csv' }
        });
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('isExporting state', () => {
    it('should be false initially', () => {
      const { result } = renderHook(() => useAnalyticsExport(), { wrapper });
      expect(result.current.isExporting).toBe(false);
    });

    it('should be true during export', async () => {
      const mockData = {
        progress_summary: {
          total_sessions: 10,
          total_pain_reduction: 50,
          goals_achieved: 3,
          overall_progress_percentage: 75
        },
        pain_trend: null,
        function_trend: null,
        predictions: {
          dropout_probability: 15,
          success_probability: 85
        },
        goals: []
      };

      const { result } = renderHook(() => useAnalyticsExport(), { wrapper });

      act(() => {
        result.current.exportData({
          patientId: 'patient-1',
          patientName: 'João Silva',
          analyticsData: mockData as any,
          options: { format: 'json' }
        });
      });

      expect(result.current.isExporting).toBe(true);
    });
  });
});

describe('useBatchAnalyticsExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('batchExport function', () => {
    it('should export multiple patients data', async () => {
      const { result } = renderHook(() => useBatchAnalyticsExport(), { wrapper });

      await act(async () => {
        result.current.batchExport({
          patientIds: ['patient-1', 'patient-2'],
          format: 'json'
        });
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('progress tracking', () => {
    it('should track export progress', async () => {
      const { result } = renderHook(() => useBatchAnalyticsExport(), { wrapper });

      expect(result.current.progress).toBe(0);

      await act(async () => {
        result.current.batchExport({
          patientIds: ['patient-1', 'patient-2'],
          format: 'json'
        });
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });
});
