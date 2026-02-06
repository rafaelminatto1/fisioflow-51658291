/**
 * Tests for usePatientsPaginated hook
 */


// Mock Supabase (needed because the hook imports it)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePatientsPaginated } from '../usePatientCrud';

const { mockSupabase } = vi.hoisted(() => {
  return {
    mockSupabase: {
      from: vi.fn(() => ({
        select: vi.fn(), // just in case
      })),
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock useQuery
const mockRefetch = vi.fn();

// We need to hoist the mock for useQuery
const { mockUseQuery } = vi.hoisted(() => {
  return { mockUseQuery: vi.fn() };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useQuery: mockUseQuery,
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

describe('usePatientsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default default implementation for useQuery
    mockUseQuery.mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('should initialize with default values and loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => usePatientsPaginated());

    expect(result.current.currentPage).toBe(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.totalCount).toBe(0);
  });

  it('should return data when query succeeds', () => {
    const mockData = [
      { id: '1', full_name: 'Patient 1' },
      { id: '2', full_name: 'Patient 2' },
    ];

    mockUseQuery.mockReturnValue({
      data: { data: mockData, count: 2 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 10 })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.totalPages).toBe(1);
  });

  it('should calculate pagination correctly', () => {
    const mockData = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      full_name: `Patient ${i + 1}`,
    }));

    mockUseQuery.mockReturnValue({
      data: { data: mockData, count: 25 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 20 })
    );

    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should navigate to next page', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], count: 100 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 10 })
    );

    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should navigate to previous page', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], count: 100 },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1', pageSize: 10, currentPage: 2 })
    );

    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should handle errors', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Database error'),
      refetch: mockRefetch,
    });

    const { result } = renderHook(
      () => usePatientsPaginated({ organizationId: 'org-1' })
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Database error');
  });
});
