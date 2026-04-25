import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMock, getMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@/api/v2/appointments", () => ({
  appointmentsApi: {
    update: updateMock,
    get: getMock,
  },
}));

vi.mock("@/lib/debug/agentIngest", () => ({
  agentIngest: vi.fn(),
}));

vi.mock("@/lib/errors/logger", () => ({
  fisioLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/utils/appointmentValidation", () => ({
  checkAppointmentConflict: vi.fn(),
}));

vi.mock("@/services/financialService", () => ({
  FinancialService: {},
}));

import { AppointmentService } from "@/services/appointmentService";

describe("AppointmentService.updateAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends recalculated end_time when appointment_time and duration change together", async () => {
    updateMock.mockResolvedValue({
      data: {
        id: "apt-1",
        patient_id: "patient-1",
        therapist_id: "therapist-1",
        organization_id: "org-1",
        date: "2026-03-12",
        appointment_date: "2026-03-12",
        start_time: "10:30",
        appointment_time: "10:30",
        end_time: "11:15",
        duration_minutes: 45,
        status: "scheduled",
        type: "session",
        notes: null,
        created_at: "2026-03-12T12:00:00.000Z",
        updated_at: "2026-03-12T12:05:00.000Z",
        patient_name: "Paciente Teste",
      },
    });

    getMock.mockResolvedValue({
      data: {
        patient_name: "Paciente Teste",
        patient_phone: "11999999999",
      },
    });

    const result = await AppointmentService.updateAppointment(
      "apt-1",
      {
        appointment_time: "10:30",
        duration: 45,
      },
      "org-1",
    );

    expect(updateMock).toHaveBeenCalledWith(
      "apt-1",
      expect.objectContaining({
        appointment_time: "10:30",
        start_time: "10:30",
        duration: 45,
        end_time: "11:15",
      }),
    );

    expect(result.time).toBe("10:30");
    expect(result.duration).toBe(45);
  });
});
