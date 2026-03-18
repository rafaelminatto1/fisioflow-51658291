/**
 * @fisioflow/shared-api — Shared types and API client
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
// We'll import from @fisioflow/db if it's set up correctly, 
// but for now, we'll define some base types.

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  perPage?: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

// Patient Types (Shared across apps and workers)
export interface Patient {
  id: string;
  organization_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Client
export * from './client';
