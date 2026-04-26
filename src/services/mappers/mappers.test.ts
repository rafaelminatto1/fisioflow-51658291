/**
 * Tests for mapper functions
 *
 * Sub-task 5.1 — Unit tests for mapPatientRow and mapAppointmentRow
 * Sub-task 5.2 — Property 6: Mapper determinism (fast-check)
 *
 * Validates: Requirements 9.1, 9.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { mapPatientRow } from "./patient.mapper";
import { mapAppointmentRow } from "./appointment.mapper";
import type { PatientRow, AppointmentRow } from "@/types/workers";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePatientRow(overrides: Partial<PatientRow> = {}): PatientRow {
  return {
    id: "patient-1",
    organization_id: "org-1",
    full_name: "Maria Silva",
    name: null,
    email: "maria@example.com",
    phone: "11999999999",
    cpf: "123.456.789-00",
    birth_date: "1990-05-15",
    date_of_birth: null,
    gender: "feminino",
    nickname: null,
    social_name: null,
    address: null,
    status: "active",
    main_condition: "Lombalgia",
    is_active: true,
    progress: 50,
    notes: "Observações do paciente",
    avatar_url: null,
    created_at: "2024-01-01T10:00:00.000Z",
    updated_at: "2024-06-01T12:00:00.000Z",
    ...overrides,
  };
}

function makeAppointmentRow(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: "appt-1",
    patient_id: "patient-1",
    therapist_id: "therapist-1",
    date: "2026-07-10",
    start_time: "09:00",
    end_time: "10:00",
    status: "scheduled",
    notes: "Primeira sessão",
    payment_status: "pending",
    organization_id: "org-1",
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
    ...overrides,
  };
}

// ─── mapPatientRow unit tests ────────────────────────────────────────────────

describe("mapPatientRow", () => {
  it("maps full_name to both name and full_name", () => {
    const row = makePatientRow({ full_name: "João Souza" });
    const patient = mapPatientRow(row);
    expect(patient.name).toBe("João Souza");
    expect(patient.full_name).toBe("João Souza");
  });

  it("maps birth_date (snake_case) to birthDate (camelCase)", () => {
    const row = makePatientRow({ birth_date: "1985-03-20" });
    const patient = mapPatientRow(row);
    expect(patient.birthDate).toBe("1985-03-20");
  });

  it("maps date_of_birth when birth_date is null", () => {
    const row = makePatientRow({ birth_date: null, date_of_birth: "1985-03-20" });
    const patient = mapPatientRow(row);
    expect(patient.birthDate).toBe("1985-03-20");
  });

  it("maps created_at to createdAt", () => {
    const row = makePatientRow({ created_at: "2024-01-01T10:00:00.000Z" });
    const patient = mapPatientRow(row);
    expect(patient.createdAt).toBe("2024-01-01T10:00:00.000Z");
  });

  it("maps updated_at to updatedAt", () => {
    const row = makePatientRow({ updated_at: "2024-06-01T12:00:00.000Z" });
    const patient = mapPatientRow(row);
    expect(patient.updatedAt).toBe("2024-06-01T12:00:00.000Z");
  });

  it("maps main_condition to mainCondition", () => {
    const row = makePatientRow({ main_condition: "Cervicalgia" });
    const patient = mapPatientRow(row);
    expect(patient.mainCondition).toBe("Cervicalgia");
  });

  it("maps notes to observations", () => {
    const row = makePatientRow({ notes: "Paciente alérgico a ibuprofeno" });
    const patient = mapPatientRow(row);
    expect(patient.observations).toBe("Paciente alérgico a ibuprofeno");
  });

  it("normalizes gender 'f' to 'feminino'", () => {
    const patient = mapPatientRow(makePatientRow({ gender: "f" }));
    expect(patient.gender).toBe("feminino");
  });

  it("normalizes gender 'm' to 'masculino'", () => {
    const patient = mapPatientRow(makePatientRow({ gender: "m" }));
    expect(patient.gender).toBe("masculino");
  });

  it("normalizes unknown gender to 'outro'", () => {
    const patient = mapPatientRow(makePatientRow({ gender: "unknown" }));
    expect(patient.gender).toBe("outro");
  });

  it("normalizes status 'active' to 'Em Tratamento'", () => {
    const patient = mapPatientRow(makePatientRow({ status: "active" }));
    expect(patient.status).toBe("Em Tratamento");
  });

  it("normalizes status 'completed' to 'Concluído'", () => {
    const patient = mapPatientRow(makePatientRow({ status: "completed" }));
    expect(patient.status).toBe("Concluído");
  });

  it("coerces progress to 0 when null", () => {
    const patient = mapPatientRow(makePatientRow({ progress: null }));
    expect(patient.progress).toBe(0);
  });

  it("preserves numeric progress value", () => {
    const patient = mapPatientRow(makePatientRow({ progress: 75 }));
    expect(patient.progress).toBe(75);
  });

  it("returns empty string for birthDate when both birth_date and date_of_birth are null", () => {
    const patient = mapPatientRow(makePatientRow({ birth_date: null, date_of_birth: null }));
    expect(patient.birthDate).toBe("");
  });

  it("returns null for email when null", () => {
    const patient = mapPatientRow(makePatientRow({ email: null }));
    expect(patient.email).toBeNull();
  });

  it("returns null for phone when null", () => {
    const patient = mapPatientRow(makePatientRow({ phone: null }));
    expect(patient.phone).toBeNull();
  });

  it("returns null for cpf when null", () => {
    const patient = mapPatientRow(makePatientRow({ cpf: null }));
    expect(patient.cpf).toBeNull();
  });

  it("does not throw when all optional fields are null/undefined", () => {
    const minimalRow: PatientRow = {
      id: "x",
      organization_id: "org",
      full_name: "Test",
      name: null,
      email: null,
      phone: null,
      cpf: null,
      birth_date: null,
      date_of_birth: null,
      gender: null,
      nickname: null,
      social_name: null,
      address: null,
      status: "active",
      main_condition: null,
      is_active: true,
      progress: null,
      notes: null,
      avatar_url: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    expect(() => mapPatientRow(minimalRow)).not.toThrow();
  });
});

// ─── mapAppointmentRow unit tests ────────────────────────────────────────────

describe("mapAppointmentRow", () => {
  it("maps patient_id to patientId", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ patient_id: "p-42" }));
    expect(appt.patientId).toBe("p-42");
  });

  it("maps date field correctly", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ date: "2026-08-20" }));
    expect(appt.date).toBe("2026-08-20");
  });

  it("maps start_time to time", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ start_time: "14:30" }));
    expect(appt.time).toBe("14:30");
  });

  it("maps created_at to createdAt", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ created_at: "2026-07-01T08:00:00.000Z" }));
    expect(appt.createdAt).toBe("2026-07-01T08:00:00.000Z");
  });

  it("maps updated_at to updatedAt", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ updated_at: "2026-07-02T09:00:00.000Z" }));
    expect(appt.updatedAt).toBe("2026-07-02T09:00:00.000Z");
  });

  it("maps notes field", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ notes: "Trazer exames" }));
    expect(appt.notes).toBe("Trazer exames");
  });

  it("normalizes status 'scheduled' to 'Pendente'", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ status: "scheduled" }));
    expect(appt.status).toBe("Pendente");
  });

  it("normalizes status 'confirmed' to 'Confirmado'", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ status: "confirmed" }));
    expect(appt.status).toBe("Confirmado");
  });

  it("normalizes status 'cancelled' to 'Cancelado'", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ status: "cancelled" }));
    expect(appt.status).toBe("Cancelado");
  });

  it("normalizes status 'completed' to 'Realizado'", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ status: "completed" }));
    expect(appt.status).toBe("Realizado");
  });

  it("defaults time to '00:00' when start_time is invalid", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ start_time: "invalid" }));
    expect(appt.time).toBe("00:00");
  });

  it("returns empty string for notes when null", () => {
    const appt = mapAppointmentRow(makeAppointmentRow({ notes: null }));
    expect(appt.notes).toBe("");
  });

  it("uses 'Desconhecido' for patientName when patient_name is undefined", () => {
    const row = makeAppointmentRow();
    // patient_name is not in AppointmentRow base type but can be present
    const appt = mapAppointmentRow(row);
    expect(appt.patientName).toBe("Desconhecido");
  });

  it("does not throw when all optional fields are null/undefined", () => {
    const minimalRow: AppointmentRow = {
      id: "a1",
      patient_id: "p1",
      therapist_id: "t1",
      date: "2026-01-01",
      start_time: "08:00",
      end_time: "09:00",
      status: "scheduled",
      notes: null,
      payment_status: null,
      organization_id: "org-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    expect(() => mapAppointmentRow(minimalRow)).not.toThrow();
  });
});

// ─── Property 6: Mapper determinism ─────────────────────────────────────────
// **Validates: Requirements 9.1**

describe("Property 6: Mapper determinism", () => {
  // Safe ISO datetime generator using integer timestamps to avoid NaN Date issues
  const isoDateTimeArb = fc
    .integer({ min: new Date("2020-01-01").getTime(), max: new Date("2030-01-01").getTime() })
    .map((ms) => new Date(ms).toISOString());

  const isoDateArb = fc
    .integer({ min: new Date("1900-01-01").getTime(), max: new Date("2010-01-01").getTime() })
    .map((ms) => new Date(ms).toISOString().split("T")[0]);

  /**
   * Arbitrary for PatientRow — generates valid-ish rows with varied field values.
   */
  const patientRowArb = fc.record<PatientRow>({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    organization_id: fc.string({ minLength: 1, maxLength: 36 }),
    full_name: fc.string({ minLength: 0, maxLength: 100 }),
    name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
    email: fc.option(fc.emailAddress(), { nil: null }),
    phone: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: null }),
    cpf: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: null }),
    birth_date: fc.option(isoDateArb, { nil: null }),
    date_of_birth: fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: null }),
    gender: fc.option(
      fc.oneof(
        fc.constant("masculino"),
        fc.constant("feminino"),
        fc.constant("m"),
        fc.constant("f"),
        fc.constant("outro"),
        fc.string({ minLength: 0, maxLength: 10 }),
      ),
      { nil: null },
    ),
    nickname: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: null }),
    social_name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
    address: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    status: fc.oneof(
      fc.constant("active"),
      fc.constant("inactive"),
      fc.constant("completed"),
      fc.string({ minLength: 1, maxLength: 20 }),
    ),
    main_condition: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
    is_active: fc.boolean(),
    progress: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    avatar_url: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    created_at: isoDateTimeArb,
    updated_at: isoDateTimeArb,
  });

  it("mapPatientRow always returns the same output for the same input", () => {
    fc.assert(
      fc.property(patientRowArb, (row) => {
        const result1 = mapPatientRow(row);
        const result2 = mapPatientRow(row);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 200 },
    );
  });

  it("mapPatientRow never throws for any PatientRow input", () => {
    fc.assert(
      fc.property(patientRowArb, (row) => {
        expect(() => mapPatientRow(row)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Arbitrary for AppointmentRow
   */
  const appointmentRowArb = fc.record<AppointmentRow>({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    patient_id: fc.string({ minLength: 1, maxLength: 36 }),
    therapist_id: fc.string({ minLength: 1, maxLength: 36 }),
    date: isoDateArb,
    start_time: fc.oneof(
      fc.constant("08:00"),
      fc.constant("09:30"),
      fc.constant("14:00"),
      fc.string({ minLength: 0, maxLength: 10 }),
    ),
    end_time: fc.oneof(
      fc.constant("09:00"),
      fc.constant("10:30"),
      fc.constant("15:00"),
      fc.string({ minLength: 0, maxLength: 10 }),
    ),
    status: fc.oneof(
      fc.constant("scheduled"),
      fc.constant("confirmed"),
      fc.constant("cancelled"),
      fc.constant("completed"),
      fc.string({ minLength: 1, maxLength: 20 }),
    ),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    payment_status: fc.option(
      fc.oneof(
        fc.constant("pending" as const),
        fc.constant("paid" as const),
        fc.constant("partial" as const),
        fc.constant("refunded" as const),
      ),
      { nil: null },
    ),
    organization_id: fc.string({ minLength: 1, maxLength: 36 }),
    created_at: isoDateTimeArb,
    updated_at: isoDateTimeArb,
  });

  it("mapAppointmentRow always returns the same output for the same input", () => {
    fc.assert(
      fc.property(appointmentRowArb, (row) => {
        const result1 = mapAppointmentRow(row);
        const result2 = mapAppointmentRow(row);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 200 },
    );
  });

  it("mapAppointmentRow never throws for any AppointmentRow input", () => {
    fc.assert(
      fc.property(appointmentRowArb, (row) => {
        expect(() => mapAppointmentRow(row)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });
});
