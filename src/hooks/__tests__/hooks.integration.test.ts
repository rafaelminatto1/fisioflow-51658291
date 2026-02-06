
// Mock do Supabase

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('QueryClient Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar instância do QueryClient', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it('deve configurar opções padrão corretamente', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 5000,
        },
      },
    });

    const options = queryClient.getDefaultOptions();
    expect(options.queries?.retry).toBe(false);
    expect(options.queries?.staleTime).toBe(5000);
  });
});
