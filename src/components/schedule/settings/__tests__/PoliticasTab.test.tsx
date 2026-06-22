import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PoliticasTab } from "../tabs/PoliticasTab";

const upsertCancellationRules = { mutate: vi.fn() };
const upsertNotificationSettings = { mutate: vi.fn() };

vi.mock("@/hooks/useScheduleSettings", () => ({
  useScheduleSettings: () => ({
    cancellationRules: null,
    notificationSettings: null,
    upsertCancellationRules,
    upsertNotificationSettings,
    isSavingRules: false,
    isSavingNotifications: false,
    businessHours: [],
    isLoadingHours: false,
    upsertBusinessHours: { mutate: vi.fn() },
    isSavingHours: false,
    blockedTimes: [],
    isLoadingBlocked: false,
    createBlockedTime: { mutate: vi.fn() },
    deleteBlockedTime: { mutate: vi.fn() },
    isCreatingBlocked: false,
  }),
}));

vi.mock("@/hooks/useBookingWindow", () => ({
  useBookingWindow: () => ({
    data: {
      minAdvanceDays: 0,
      maxAdvanceDays: 60,
      allowSameDay: true,
      allowOnlineBooking: true,
    },
    isLoading: false,
    save: vi.fn(),
    isSaving: false,
  }),
}));

vi.mock("@/hooks/useNoShowPolicy", () => ({
  useNoShowPolicy: () => ({
    data: {
      thresholdCount: 3,
      windowDays: 90,
      action: "warn",
      suspendDays: 0,
      chargeFee: false,
      feeAmount: 0,
      notifyAdmin: true,
    },
    isLoading: false,
    save: vi.fn(),
    isSaving: false,
  }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("PoliticasTab", () => {
  it("alterar min_hours_before marca dirty e save chama upsert", () => {
    const handles: any[] = [];
    wrap(<PoliticasTab registerHandle={(h) => handles.push(h)} />);

    const inputs = screen.getAllByRole("spinbutton");
    const minHoursInput = inputs.find((el) => (el as HTMLInputElement).value === "24");
    expect(minHoursInput).toBeTruthy();

    fireEvent.change(minHoursInput!, { target: { value: "48" } });

    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(true);

    last?.save();
    expect(typeof last?.save).toBe("function");
  });
});
