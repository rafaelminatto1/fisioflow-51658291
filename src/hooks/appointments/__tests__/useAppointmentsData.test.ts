import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() =>
  vi.fn(() => ({
    profile: { organization_id: "org-test-001" },
  })),
);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("../useAppointmentsCache", () => ({
  getFromCacheWithMetadata: vi.fn().mockResolvedValue({
    data: [{ id: "cached-1", patientId: "p1", status: "scheduled" }],
    isFromCache: true,
    cacheTimestamp: new Date().toISOString(),
    source: "storage",
  }),
}));

vi.mock("@/lib/offline/AppointmentsCacheService", () => ({
  appointmentsCacheService: {
    saveToCache: vi.fn(),
    loadFromCache: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../useRealtimeAppointments", () => ({
  useRealtimeAppointments: vi.fn(),
}));

vi.mock("../useAppointmentsByPeriod", () => ({
  appointmentPeriodKeys: { list: () => ["period"] },
}));

vi.mock("./appointmentHelpers", async () => {
  const actual = await vi.importActual("./appointmentHelpers");
  return actual;
});

const mockAppointments = [
  {
    id: "a1",
    patientId: "p1",
    date: new Date(),
    status: "scheduled",
    time: "09:00",
    duration: 60,
    type: "Fisioterapia",
    createdAt: new Date(),
    updatedAt: new Date(),
    phone: "",
    notes: "",
  },
  {
    id: "a2",
    patientId: "p2",
    date: new Date(),
    status: "confirmed",
    time: "10:00",
    duration: 60,
    type: "Fisioterapia",
    createdAt: new Date(),
    updatedAt: new Date(),
    phone: "",
    notes: "",
  },
];

vi.mock("@/services/appointmentService", () => ({
  AppointmentService: {
    fetchAppointments: vi.fn().mockResolvedValue(mockAppointments),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useAppointmentsData", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { organization_id: "org-test-001" },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("retorna dados do servidor quando online", async () => {
    const { AppointmentService } = await import("@/services/appointmentService");
    const { useAppointmentsData } = await import("../useAppointmentsData");

    const { result } = renderHook(() => useAppointmentsData(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(AppointmentService.fetchAppointments).toHaveBeenCalledWith(
      "org-test-001",
      expect.objectContaining({ limit: 500 }),
    );
    expect(result.current.data.length).toBe(2);
    expect(result.current.isFromCache).toBe(false);
  });

  it("usa cache quando offline", async () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const { useAppointmentsData } = await import("../useAppointmentsData");
    const { getFromCacheWithMetadata } = await import("../useAppointmentsCache");

    const { result } = renderHook(() => useAppointmentsData(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getFromCacheWithMetadata).toHaveBeenCalled();
    expect(result.current.isFromCache).toBe(true);

    if (originalOnLine) {
      Object.defineProperty(navigator, "onLine", originalOnLine);
    }
  });

  it("salva backup de emergência após fetch bem-sucedido", async () => {
    const { appointmentsCacheService } = await import("@/lib/offline/AppointmentsCacheService");
    const { useAppointmentsData } = await import("../useAppointmentsData");

    const { result } = renderHook(() => useAppointmentsData(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(appointmentsCacheService.saveToCache).toHaveBeenCalledWith(
      mockAppointments,
      "org-test-001",
    );
  });

  it("desabilitado quando sem organization_id", async () => {
    mockUseAuth.mockReturnValue({
      profile: { organization_id: null },
    } as any);

    const { useAppointmentsData } = await import("../useAppointmentsData");
    const { AppointmentService } = await import("@/services/appointmentService");

    renderHook(() => useAppointmentsData(), {
      wrapper: makeWrapper(queryClient),
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(AppointmentService.fetchAppointments).not.toHaveBeenCalled();
  });
});
