/**
 * Tests for usePatientsPaginated hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatientsPaginated } from '../usePatientCrud';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('usePatientsPaginated', () => {
  let queryClient: QueryClient;

  // Helper to create a chainable mock object
  const createSupabaseMock = (options: {
    data?: any[];
    error?: any;
    count?: number;
    delay?: number;
  } = {}) => {
    const { data = [], error = null, count = 0, delay = 0 } = options;

    // Create a Promise that we can control if needed, or just resolve immediately
    const resultPromise = async () => {
      if (delay) await new Promise(r => setTimeout(r, delay));
      if (error) throw error;
      return { data, error, count };
    };

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnValue(resultPromise()),
      // Also mock single() just in case, though not used in pagination list
      single: vi.fn().mockReturnValue(resultPromise()),
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(supabase.from).mockReturnValue(createSupabaseMock() as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePatientsPaginated(), { wrapper });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch patients with pagination', async () => {
    const mockData = [
      { id: '1', full_name: 'Patient 1', email: 'test1@example.com' },
      { id: '2', full_name: 'Patient 2', email: 'test2@example.com' },
    ];

    vi.mocked(supabase.from).mockReturnValue(createSupabaseMock({
      data: mockData,
      count: 2,
      // Add a tiny delay to ensure we test the loading state transition correctly in React 18
      delay: 10
    }) as any);

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 10 }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.totalCount).toBe(2);
  });

  it('should calculate pagination correctly', async () => {
    // 25 items total, page size 20 = 2 pages
    const mockData = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    vi.mocked(supabase.from).mockReturnValue(createSupabaseMock({
      data: mockData,
      count: 25,
      delay: 10
    }) as any);

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 20 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should navigate to next page', async () => {
    const page1Data = [{ id: '1', full_name: 'P1' }];
    const page2Data = [{ id: '2', full_name: 'P2' }];

    const rangeMock = vi.fn()
      .mockResolvedValueOnce({ data: page1Data, error: null, count: 2 })
      .mockResolvedValueOnce({ data: page2Data, error: null, count: 2 });

    const chainMock: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: rangeMock
    };

    vi.mocked(supabase.from).mockReturnValue(chainMock);

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 1 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentPage).toBe(1);
    });

    act(() => {
      result.current.nextPage();
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(supabase.from).mockReturnValue(createSupabaseMock({
      error: new Error('Database error'),
      delay: 10
    }) as any);

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Database error');
    });
  });
});
