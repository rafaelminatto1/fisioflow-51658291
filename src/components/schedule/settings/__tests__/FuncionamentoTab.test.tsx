import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FuncionamentoTab } from "../tabs/FuncionamentoTab";

vi.mock("@/hooks/useScheduleSettings", () => ({
  useScheduleSettings: () => ({
    businessHours: [],
    isLoadingHours: false,
    upsertBusinessHours: { mutate: vi.fn() },
    isSavingHours: false,
    blockedTimes: [],
    isLoadingBlocked: false,
    createBlockedTime: { mutate: vi.fn() },
    deleteBlockedTime: { mutate: vi.fn() },
    isCreatingBlocked: false,
    cancellationRules: null,
    notificationSettings: null,
    upsertCancellationRules: { mutate: vi.fn() },
    upsertNotificationSettings: { mutate: vi.fn() },
    isSavingRules: false,
    isSavingNotifications: false,
  }),
}));

vi.mock("@/hooks/useScheduleCapacity", () => ({
  useScheduleCapacity: () => ({
    capacityGroups: [],
    capacities: [],
    isLoading: false,
    createMultipleCapacities: { mutate: vi.fn() },
    replaceCapacityGroup: { mutate: vi.fn() },
    deleteCapacityGroup: vi.fn(),
    checkConflicts: () => ({ hasConflict: false, conflicts: [] }),
    isCreating: false,
    isReplacing: false,
    isDeleting: false,
  }),
}));

vi.mock("@/hooks/useAppointmentTypes", () => ({
  useAppointmentTypes: () => ({
    types: [],
    isLoading: false,
    addType: vi.fn(),
    updateType: vi.fn(),
    removeType: vi.fn(),
    toggleActive: vi.fn(),
    duplicateType: vi.fn(),
  }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("FuncionamentoTab", () => {
  it("registra um handle e fica dirty ao alterar um horário", () => {
    const handles: any[] = [];
    wrap(<FuncionamentoTab registerHandle={(h) => handles.push(h)} />);
    const firstSwitch = screen.getAllByRole("switch")[0];
    fireEvent.click(firstSwitch);
    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(true);
    expect(typeof last?.save).toBe("function");
  });
});
