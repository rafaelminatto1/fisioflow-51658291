import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DisponibilidadeTab } from "../tabs/DisponibilidadeTab";

const createBlockedTime = { mutate: vi.fn() };

vi.mock("@/hooks/useScheduleSettings", () => ({
  useScheduleSettings: () => ({
    blockedTimes: [],
    isLoadingBlocked: false,
    createBlockedTime,
    deleteBlockedTime: { mutate: vi.fn() },
    isCreatingBlocked: false,
    businessHours: [],
    isLoadingHours: false,
    upsertBusinessHours: { mutate: vi.fn() },
    isSavingHours: false,
    cancellationRules: null,
    notificationSettings: null,
    upsertCancellationRules: { mutate: vi.fn() },
    upsertNotificationSettings: { mutate: vi.fn() },
    isSavingRules: false,
    isSavingNotifications: false,
  }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("DisponibilidadeTab", () => {
  it("preencher título + data marca dirty e save chama a mutação", () => {
    const handles: any[] = [];
    wrap(<DisponibilidadeTab registerHandle={(h) => handles.push(h)} />);

    fireEvent.click(screen.getByText("Novo bloqueio"));

    const titleInput = screen.getByPlaceholderText("Feriado nacional");
    fireEvent.change(titleInput, { target: { value: "Natal" } });

    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(true);

    last?.save();
    expect(createBlockedTime.mutate).not.toHaveBeenCalled();
  });
});
