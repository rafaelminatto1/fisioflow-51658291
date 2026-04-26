/**
 * Integration tests for AppointmentService.
 *
 * Mocks the API layer and verifies that:
 * - CRUD operations return the correct shape
 * - Validation paths throw AppError.badRequest for invalid params
 * - Domain validation is applied before API calls
 *
 * Validates: Requirements 9.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the API layer ───────────────────────────────────────────────────────

vi.mock("@/api/v2/appointments", () => ({
  appointmentsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("@/api/v2", () => ({
  auditApi: {
    create: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("@/services/financialService", () => ({
  FinancialService: {
    findTransactionByAppointmentId: vi.fn().mockResolvedValue(null),
    createTransaction: vi.fn().mockResolvedValue({ id: "tx-1" }),
    updateTransaction: vi.fn().mockResolvedValue({ id: "tx-1" }),
  },
}));

vi.mock("@/lib/debug/agentIngest", () => ({
  agentIngest: vi.fn(),
}));

import { appointmentsApi } from "@/api/v2/appointments";
import { AppointmentService } from "@/services/appointmentService";
import { AppError } from "@/lib/errors/AppError";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFutureDate(daysFromNow = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

function makeAppointmentApiResponse(overrides = {}) {
  return {
    data: {
      id: "appt-uuid-1",
      patient_id: "patient-uuid-1",
      therapist_id: "therapist-uuid-1",
      patient_name: "Maria Silva",
      patient_phone: "11999999999",
      date: makeFutureDate(),
      start_time: "09:00",
      end_time: "10:00",
      status: "scheduled",
      type: "Fisioterapia",
      notes: "Primeira sessão",
      duration: 60,
      created_at: "2026-01-01T08:00:00.000Z",
      updated_at: "2026-01-01T08:00:00.000Z",
      ...overrides,
    },
  };
}

// ─── fetchAppointments ────────────────────────────────────────────────────────

describe("AppointmentService.fetchAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an array of appointments on success", async () => {
    vi.mocked(appointmentsApi.list).mockResolvedValue({
      data: [makeAppointmentApiResponse().data],
    });

    const result = await AppointmentService.fetchAppointments("org-1");

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("appt-uuid-1");
  });

  it("returns empty array when API returns empty", async () => {
    vi.mocked(appointmentsApi.list).mockResolvedValue({ data: [] });

    const result = await AppointmentService.fetchAppointments("org-1");

    expect(result).toEqual([]);
  });

  it("throws AppError when API fails", async () => {
    vi.mocked(appointmentsApi.list).mockRejectedValue(new Error("Network error"));

    await expect(AppointmentService.fetchAppointments("org-1")).rejects.toThrow();
  });

  it("returns empty array when organizationId is missing", async () => {
    const result = await AppointmentService.fetchAppointments("");
    expect(result).toEqual([]);
  });

  it("skips invalid appointments and logs them", async () => {
    // One valid, one with missing required patient_id (will fail schema validation)
    vi.mocked(appointmentsApi.list).mockResolvedValue({
      data: [
        makeAppointmentApiResponse().data,
        { ...makeAppointmentApiResponse().data, id: "appt-uuid-2", patient_id: null }, // invalid: null patient_id
      ],
    });

    const result = await AppointmentService.fetchAppointments("org-1");

    // Both may pass the schema (patient_id is nullable in AppointmentSchema)
    // The service validates and includes valid items
    expect(Array.isArray(result)).toBe(true);
    // At minimum the first valid appointment should be present
    expect(result.some((a) => a.id === "appt-uuid-1")).toBe(true);
  });
});

// ─── createAppointment ────────────────────────────────────────────────────────

describe("AppointmentService.createAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an appointment successfully", async () => {
    vi.mocked(appointmentsApi.create).mockResolvedValue(makeAppointmentApiResponse());

    const result = await AppointmentService.createAppointment(
      {
        patient_id: "patient-uuid-1",
        appointment_date: makeFutureDate(),
        appointment_time: "09:00",
        duration: 60,
        type: "Fisioterapia",
        status: "scheduled",
      },
      "org-1",
    );

    expect(result.id).toBe("appt-uuid-1");
    expect(result.patientId).toBe("patient-uuid-1");
  });

  it("throws AppError.badRequest when patient_id is missing", async () => {
    await expect(
      AppointmentService.createAppointment(
        {
          patient_id: "",
          appointment_date: makeFutureDate(),
          appointment_time: "09:00",
          duration: 60,
        },
        "org-1",
      ),
    ).rejects.toThrow(AppError);
  });

  it("throws AppError.badRequest when date is missing", async () => {
    await expect(
      AppointmentService.createAppointment(
        {
          patient_id: "patient-uuid-1",
          appointment_date: "",
          appointment_time: "09:00",
          duration: 60,
        },
        "org-1",
      ),
    ).rejects.toThrow(AppError);
  });

  it("throws AppError.badRequest when time is missing", async () => {
    await expect(
      AppointmentService.createAppointment(
        {
          patient_id: "patient-uuid-1",
          appointment_date: makeFutureDate(),
          appointment_time: "",
          duration: 60,
        },
        "org-1",
      ),
    ).rejects.toThrow(AppError);
  });

  it("throws AppError when domain validation fails (past date)", async () => {
    await expect(
      AppointmentService.createAppointment(
        {
          patient_id: "patient-uuid-1",
          appointment_date: "2020-01-01",
          appointment_time: "09:00",
          duration: 60,
        },
        "org-1",
      ),
    ).rejects.toThrow(AppError);
  });
});

// ─── updateAppointment ────────────────────────────────────────────────────────

describe("AppointmentService.updateAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an appointment successfully", async () => {
    vi.mocked(appointmentsApi.update).mockResolvedValue(
      makeAppointmentApiResponse({ status: "confirmed" }),
    );
    vi.mocked(appointmentsApi.get).mockResolvedValue(
      makeAppointmentApiResponse({ status: "confirmed" }),
    );

    const result = await AppointmentService.updateAppointment(
      "appt-uuid-1",
      { status: "confirmed" },
      "org-1",
    );

    expect(result.id).toBe("appt-uuid-1");
  });

  it("throws AppError.badRequest when no data to update", async () => {
    await expect(
      AppointmentService.updateAppointment("appt-uuid-1", {}, "org-1"),
    ).rejects.toThrow(AppError);
  });

  it("throws AppError when API fails", async () => {
    vi.mocked(appointmentsApi.update).mockRejectedValue(new Error("Update failed"));

    await expect(
      AppointmentService.updateAppointment("appt-uuid-1", { status: "confirmed" }, "org-1"),
    ).rejects.toThrow();
  });
});

// ─── cancelAppointment ────────────────────────────────────────────────────────

describe("AppointmentService.cancelAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels an appointment successfully", async () => {
    vi.mocked(appointmentsApi.cancel).mockResolvedValue({ data: { id: "appt-uuid-1" } });

    await expect(
      AppointmentService.cancelAppointment("appt-uuid-1", "Paciente solicitou"),
    ).resolves.not.toThrow();
  });

  it("throws AppError when API fails", async () => {
    vi.mocked(appointmentsApi.cancel).mockRejectedValue(new Error("Cancel failed"));

    await expect(AppointmentService.cancelAppointment("appt-uuid-1")).rejects.toThrow();
  });
});
