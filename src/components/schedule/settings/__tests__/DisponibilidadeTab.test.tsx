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
  it("apenas título não dispara a mutação (data obrigatória)", () => {
    const handles: any[] = [];
    wrap(<DisponibilidadeTab registerHandle={(h) => handles.push(h)} />);

    fireEvent.click(screen.getByText("Novo bloqueio"));
    fireEvent.change(screen.getByPlaceholderText("Feriado nacional"), {
      target: { value: "Natal" },
    });

    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(true);

    last?.save();
    expect(createBlockedTime.mutate).not.toHaveBeenCalled();
  });

  it("título + data preenchidos: save chama createBlockedTime.mutate", () => {
    const handles: any[] = [];
    wrap(<DisponibilidadeTab registerHandle={(h) => handles.push(h)} />);

    fireEvent.click(screen.getByText("Novo bloqueio"));
    fireEvent.change(screen.getByPlaceholderText("Feriado nacional"), {
      target: { value: "Natal" },
    });
    const startDate = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(startDate, { target: { value: "2026-12-25" } });

    const last = handles.filter(Boolean).pop();
    last?.save();
    expect(createBlockedTime.mutate).toHaveBeenCalledTimes(1);
    expect(createBlockedTime.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Natal", start_date: "2026-12-25" }),
      expect.anything(),
    );
  });
});
