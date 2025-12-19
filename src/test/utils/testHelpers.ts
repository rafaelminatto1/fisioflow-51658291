import { vi } from 'vitest';

// ============= Mock Data Generators =============

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateMockPatient = (overrides = {}) => ({
  id: generateUUID(),
  name: 'João Silva',
  email: 'joao.silva@email.com',
  phone: '11999887766',
  cpf: '12345678909',
  birth_date: '1990-05-15',
  gender: 'masculino',
  address: 'Rua das Flores, 123',
  notes: 'Paciente regular',
  status: 'ativo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockAppointment = (overrides = {}) => ({
  id: generateUUID(),
  patient_id: generateUUID(),
  therapist_id: generateUUID(),
  appointment_date: '2025-01-15',
  appointment_time: '09:00',
  duration: 60,
  type: 'consulta',
  status: 'agendado',
  notes: '',
  payment_status: 'pending',
  payment_amount: 150,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockTransaction = (overrides = {}) => ({
  id: generateUUID(),
  tipo: 'receita',
  descricao: 'Sessão de fisioterapia',
  valor: 150,
  data_vencimento: '2025-01-15',
  status: 'pendente',
  patient_id: generateUUID(),
  appointment_id: generateUUID(),
  forma_pagamento: 'pix',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockTherapist = (overrides = {}) => ({
  id: generateUUID(),
  user_id: generateUUID(),
  full_name: 'Dr. Maria Santos',
  email: 'maria.santos@clinica.com',
  phone: '11988776655',
  crefito: '12345-F',
  specialty: 'Ortopedia',
  organization_id: generateUUID(),
  created_at: new Date().toISOString(),
  ...overrides,
});

// ============= Mock Supabase Response Builders =============

export const createMockSupabaseResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : (data ? 1 : 0),
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

export const createMockSupabaseError = (message: string, code = 'PGRST116') => ({
  data: null,
  error: {
    message,
    code,
    details: null,
    hint: null,
  },
  count: null,
  status: 400,
  statusText: 'Bad Request',
});

// ============= Time Utilities =============

export const createFutureDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

export const createPastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const formatTimeSlot = (hours: number, minutes = 0): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// ============= Validation Test Helpers =============

export const validCPFs = [
  '529.982.247-25',
  '52998224725',
  '123.456.789-09',
  '12345678909',
];

export const invalidCPFs = [
  '111.111.111-11', // Repeated digits
  '000.000.000-00',
  '12345678901234', // Too long
  '1234567', // Too short
  'abcdefghijk', // Letters
  '123.456.789-00', // Invalid check digits
];

export const validEmails = [
  'test@example.com',
  'user.name@domain.com.br',
  'user+tag@subdomain.domain.org',
  'valid123@test.io',
];

export const invalidEmails = [
  'invalid',
  '@nodomain.com',
  'no@domain',
  'spaces in@email.com',
  '',
];

export const validPhones = [
  '11999887766',
  '(11) 99988-7766',
  '+55 11 99988-7766',
  '1199887766',
  '11 9988-7766',
];

export const invalidPhones = [
  '123',
  'abc',
  '',
  '1234567890123456789', // Too long
];

// ============= Mock Function Creators =============

export const createMockQueryChain = () => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  return chain;
};

// ============= Async Test Utilities =============

export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const flushPromises = (): Promise<void> => {
  return new Promise((resolve) => setImmediate(resolve));
};
