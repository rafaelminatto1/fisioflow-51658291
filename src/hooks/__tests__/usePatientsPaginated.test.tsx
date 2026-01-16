/**
 * Tests for usePatientsPaginated hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatientsPaginated, type PatientsQueryParams } from '../usePatientCrud';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('usePatientsPaginated', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 0,
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
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
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch patients with pagination', async () => {
    const mockData = [
      { id: '1', full_name: 'Patient 1', email: 'patient1@test.com' },
      { id: '2', full_name: 'Patient 2', email: 'patient2@test.com' },
    ];

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 10 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPages).toBe(1);
  });

  it('should calculate pagination correctly', async () => {
    const mockData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockData.slice(0, 20),
                error: null,
                count: 25,
              }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 20 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should navigate to next page', async () => {
    const mockDataPage1 = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    const mockDataPage2 = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 21),
      full_name: `Patient ${i + 21}`,
    }));

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn()
                .mockResolvedValueOnce({
                  data: mockDataPage1,
                  error: null,
                  count: 25,
                })
                .mockResolvedValueOnce({
                  data: mockDataPage2,
                  error: null,
                  count: 25,
                }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 20 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.nextPage();
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });
  });

  it('should navigate to previous page', async () => {
    const { result } = renderHook(
      () => usePatientsPaginated({
        organizationId: 'org-1',
        pageSize: 20,
        currentPage: 2,
      }),
      { wrapper }
    );

    // Mock page 1 data
    const mockDataPage1 = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockDataPage1,
                error: null,
                count: 25,
              }),
            }),
          }),
        }),
      }),
    });

    act(() => {
      result.current.previousPage();
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
    });
  });

  it('should navigate to specific page', async () => {
    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 20 }),
      { wrapper }
    );

    const mockData = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockData,
                error: null,
                count: 60,
              }),
            }),
          }),
        }),
      }),
    });

    act(() => {
      result.current.goToPage(3);
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(3);
    });
  });

  it('should filter by status', async () => {
    const mockData = [
      { id: '1', full_name: 'Patient 1', status: 'Em Tratamento' },
    ];

    const { supabase } = await import('@/integrations/supabase/client');

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
              count: 1,
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue(selectMock);

    renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', status: 'Em Tratamento' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalledWith(
        'id, full_name, name, email, phone, cpf, birth_date, gender, address, observations, status, incomplete_registration, created_at, updated_at',
        { count: 'exact' }
      );
      expect(vi.mocked(selectMock).mock.calls[1][1]).toEqual({ count: 'exact' });
    });
  });

  it('should search by term', async () => {
    const mockData = [
      { id: '1', full_name: 'John Doe', email: 'john@test.com' },
    ];

    const { supabase } = await import('@/integrations/supabase/client');

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
              count: 1,
            }),
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue(selectMock);

    renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', searchTerm: 'john' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });
  });

  it('should handle errors gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Database error');
    });
  });

  it('should return empty list for no results', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalPages).toBe(0);
  });
});
