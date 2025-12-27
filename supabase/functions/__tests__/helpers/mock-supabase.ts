// Helper para criar mocks do Supabase Client
import { vi } from 'vitest';

export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  const mockClient = {
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  };

  return {
    client: mockClient,
    queryBuilder: mockQueryBuilder,
  };
}

export function createMockResponse(data: any, error: any = null) {
  return {
    data: error ? null : data,
    error,
    count: Array.isArray(data) ? data.length : null,
  };
}

