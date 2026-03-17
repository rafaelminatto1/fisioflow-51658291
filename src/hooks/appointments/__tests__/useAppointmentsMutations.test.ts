import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { organization_id: 'org-001' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/errors/logger', () => ({
  fisioLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    startTimer: () => vi.fn(),
  },
}));

const mockCreatedAppointment = {
  id: 'server-id-123',
  patientId: 'p1',
  patientName: 'Paciente Teste',
  date: new Date(),
  time: '09:00',
  duration: 60,
  type: 'Fisioterapia',
  status: 'scheduled',
  notes: '',
  phone: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/services/appointmentService', () => ({
  AppointmentService: {
    createAppointment: vi.fn().mockResolvedValue(mockCreatedAppointment),
    updateAppointment: vi.fn().mockResolvedValue({ ...mockCreatedAppointment, status: 'confirmed' }),
    deleteAppointment: vi.fn().mockResolvedValue(undefined),
    fetchAppointments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/errors/ErrorHandler', () => ({
  ErrorHandler: { handle: vi.fn() },
}));

vi.mock('@/utils/appointmentErrors', () => ({
  isAppointmentConflictError: vi.fn().mockReturnValue(false),
}));

vi.mock('@/utils/cacheInvalidation', () => ({
  invalidateAffectedPeriods: vi.fn(),
}));

vi.mock('@/utils/dateUtils', () => ({
  formatDateToLocalISO: (d: Date) => d.toISOString().split('T')[0],
}));

vi.mock('@/utils/userHelpers', () => ({
  requireUserOrganizationId: vi.fn().mockResolvedValue('org-001'),
}));

vi.mock('@/lib/services/AppointmentNotificationService', () => ({
  AppointmentNotificationService: { scheduleReminder: vi.fn() },
}));

vi.mock('../appointmentOptimistic', () => ({
  parseUpdatesToAppointment: vi.fn((_existing, updates) => ({ ...updates })),
}));

vi.mock('./useAppointmentsData', () => ({
  appointmentKeys: {
    all: ['appointments_v2'],
    lists: () => ['appointments_v2', 'list'],
    list: (orgId?: string) => ['appointments_v2', 'list', orgId],
    details: () => ['appointments_v2', 'detail'],
    detail: (id: string) => ['appointments_v2', 'detail', id],
  },
}));

vi.mock('./useAppointmentsCache', () => ({}));

vi.mock('../useAppointmentsByPeriod', () => ({
  appointmentPeriodKeys: { list: () => ['period'] },
}));

vi.mock('../useFilteredAppointments', () => ({
  filteredAppointmentKeys: { list: () => ['filtered'] },
}));

// ── Helper ─────────────────────────────────────────────────────────────────

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useCreateAppointment', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  it('aplica optimistic update antes da resposta do servidor', async () => {
    const { useCreateAppointment } = await import('../useAppointmentsMutations');

    // Seed query cache with existing data
    queryClient.setQueryData(['appointments_v2', 'list', 'org-001'], {
      data: [],
      isFromCache: false,
      cacheTimestamp: null,
      source: 'server',
    });

    const { result } = renderHook(() => useCreateAppointment(), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        patient_id: 'p1',
        patient_name: 'Paciente Teste',
        appointment_date: new Date().toISOString(),
        appointment_time: '09:00',
        duration: 60,
        type: 'Fisioterapia',
        status: 'scheduled',
      } as any);
    });

    // Optimistic update should add a temp item immediately
    const cacheAfterMutate = queryClient.getQueryData<any>(['appointments_v2', 'list', 'org-001']);
    expect(cacheAfterMutate?.data?.some((a: any) => a.id?.startsWith('temp-'))).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('faz rollback ao erro', async () => {
    const { AppointmentService } = await import('@/services/appointmentService');
    vi.mocked(AppointmentService.createAppointment).mockRejectedValueOnce(new Error('Conflict'));

    const { useCreateAppointment } = await import('../useAppointmentsMutations');
    const originalData = { data: [{ id: 'existing-1' }], isFromCache: false, cacheTimestamp: null, source: 'server' };
    queryClient.setQueryData(['appointments_v2', 'list', 'org-001'], originalData);

    const { result } = renderHook(() => useCreateAppointment(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ patient_id: 'p1', appointment_date: new Date().toISOString() } as any);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to original data
    const afterError = queryClient.getQueryData<any>(['appointments_v2', 'list', 'org-001']);
    expect(afterError).toEqual(originalData);
  });
});
