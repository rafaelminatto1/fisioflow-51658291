
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivePatients } from '../usePatients';
import { PatientService } from '@/services/patientService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/services/patientService', () => ({
  PatientService: {
    getActivePatients: vi.fn(),
    mapPatientsFromDB: vi.fn((data) => data || []),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { organization_id: 'org-123' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/ably/client', () => ({
  getAblyClient: vi.fn(() => ({
    channels: {
      get: vi.fn(() => ({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      })),
    },
  })),
  ABLY_CHANNELS: {
    patients: (id: string) => `patients:${id}`,
  },
  ABLY_EVENTS: {
    update: 'update',
  },
}));

vi.mock('@/lib/offline/PatientsCacheService', () => ({
  patientsCacheService: {
    getFromCache: vi.fn(() => Promise.resolve({ data: [] })),
    saveToCache: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/utils/query-helpers', () => ({
  isOnline: () => true,
  isNetworkError: () => false,
}));

describe('useActivePatients', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('should fetch patients using PatientService', async () => {
    const mockPatients = [{ id: '1', name: 'John Doe' }];

    // Setup mock return
    (PatientService.getActivePatients as any).mockResolvedValue({
      data: mockPatients,
      error: null
    });
    (PatientService.mapPatientsFromDB as any).mockReturnValue(mockPatients);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useActivePatients(), { wrapper });

    // Wait for data to load
    // Passing container explicitly to avoid testing-library error
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { container: document.body });

    expect(result.current.data).toEqual(mockPatients);
    expect(PatientService.getActivePatients).toHaveBeenCalledWith('org-123');

    // Verify optimization: Ensure ONLY getActivePatients was called on the service
    // and no other "stats" fetching happened (which was the bottleneck).
    expect(PatientService.getActivePatients).toHaveBeenCalledTimes(1);
  });
});
