/**
 * Tests for Zod schemas.
 *
 * Sub-task 8.1 — Round-trip property tests
 *   Property 5: Zod schema round-trip consistency
 *   schema.parse(schema.parse(entity)) equals schema.parse(entity)
 *   Validates: Requirements 9.5
 *
 * Sub-task 8.2 — Unit tests for schema validation
 *   Validates: Requirements 5.3, 5.4, 5.5
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  PatientCreateSchema,
  PatientUpdateSchema,
  PatientResponseSchema,
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  AppointmentResponseSchema,
} from "./index";

// ============================================================================
// PatientResponseSchema — Unit Tests (8.2)
// ============================================================================

describe("PatientResponseSchema — unit tests", () => {
  const validPatient = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    full_name: "Maria Silva",
    status: "active" as const,
    progress: 50,
    incomplete_registration: false,
  };

  it("accepts a valid patient response", () => {
    const result = PatientResponseSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const { id: _id, ...withoutId } = validPatient;
    const result = PatientResponseSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path.join("."));
      expect(fields).toContain("id");
    }
  });

  it("rejects invalid UUID for id", () => {
    const result = PatientResponseSchema.safeParse({ ...validPatient, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts extra fields (passthrough)", () => {
    const withExtra = { ...validPatient, organization_name: "Clínica ABC", extra_field: true };
    const result = PatientResponseSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      // Extra fields should be preserved
      expect((result.data as Record<string, unknown>).organization_name).toBe("Clínica ABC");
    }
  });

  it("accepts null for optional fields", () => {
    const result = PatientResponseSchema.safeParse({
      ...validPatient,
      email: null,
      phone: null,
      cpf: null,
      birth_date: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid ISO 8601 date for birth_date", () => {
    const result = PatientResponseSchema.safeParse({
      ...validPatient,
      birth_date: "1990-05-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format for birth_date", () => {
    const result = PatientResponseSchema.safeParse({
      ...validPatient,
      birth_date: "15/05/1990", // DD/MM/YYYY not accepted
    });
    expect(result.success).toBe(false);
  });
});

describe("PatientCreateSchema — unit tests", () => {
  it("accepts a valid create payload without id", () => {
    const result = PatientCreateSchema.safeParse({
      full_name: "João Santos",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("strips extra fields (strip mode)", () => {
    const result = PatientCreateSchema.safeParse({
      full_name: "João Santos",
      id: "should-be-stripped",
      created_at: "should-be-stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
      expect((result.data as Record<string, unknown>).created_at).toBeUndefined();
    }
  });

  it("rejects full_name shorter than 2 characters", () => {
    const result = PatientCreateSchema.safeParse({ full_name: "A" });
    expect(result.success).toBe(false);
  });
});

describe("PatientUpdateSchema — unit tests", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = PatientUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only email", () => {
    const result = PatientUpdateSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// AppointmentResponseSchema — Unit Tests (8.2)
// ============================================================================

describe("AppointmentResponseSchema — unit tests", () => {
  const validAppointment = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    patient_id: "550e8400-e29b-41d4-a716-446655440002",
    status: "scheduled" as const,
  };

  it("accepts a valid appointment response", () => {
    const result = AppointmentResponseSchema.safeParse(validAppointment);
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const { id: _id, ...withoutId } = validAppointment;
    const result = AppointmentResponseSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path.join("."));
      expect(fields).toContain("id");
    }
  });

  it("rejects invalid UUID for id", () => {
    const result = AppointmentResponseSchema.safeParse({ ...validAppointment, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects duration below 15 minutes", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      duration: 14,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration above 480 minutes", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      duration: 481,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration of 15 minutes (minimum)", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      duration: 15,
    });
    expect(result.success).toBe(true);
  });

  it("accepts duration of 480 minutes (maximum)", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      duration: 480,
    });
    expect(result.success).toBe(true);
  });

  it("rejects pain_level below 0", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      pain_level: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects pain_level above 10", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      pain_level: 11,
    });
    expect(result.success).toBe(false);
  });

  it("accepts pain_level 0 and 10", () => {
    expect(AppointmentResponseSchema.safeParse({ ...validAppointment, pain_level: 0 }).success).toBe(true);
    expect(AppointmentResponseSchema.safeParse({ ...validAppointment, pain_level: 10 }).success).toBe(true);
  });

  it("accepts extra fields (passthrough)", () => {
    const withExtra = { ...validAppointment, extra_join_field: "value" };
    const result = AppointmentResponseSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
  });

  it("accepts valid ISO 8601 date", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      date: "2026-07-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      date: "15/07/2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid HH:MM time", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      start_time: "09:30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid time format", () => {
    const result = AppointmentResponseSchema.safeParse({
      ...validAppointment,
      start_time: "9:30am",
    });
    expect(result.success).toBe(false);
  });
});

describe("AppointmentCreateSchema — unit tests", () => {
  it("accepts a valid create payload", () => {
    const result = AppointmentCreateSchema.safeParse({
      patient_id: "patient-123",
      date: "2026-08-01",
      duration: 60,
    });
    expect(result.success).toBe(true);
  });

  it("strips id and timestamps", () => {
    const result = AppointmentCreateSchema.safeParse({
      patient_id: "patient-123",
      id: "should-be-stripped",
      created_at: "should-be-stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
      expect((result.data as Record<string, unknown>).created_at).toBeUndefined();
    }
  });

  it("rejects missing patient_id", () => {
    const result = AppointmentCreateSchema.safeParse({ date: "2026-08-01", duration: 60 });
    expect(result.success).toBe(false);
  });
});

describe("AppointmentUpdateSchema — unit tests", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = AppointmentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    const result = AppointmentUpdateSchema.safeParse({ status: "confirmed" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Property 5: Zod schema round-trip consistency (8.1)
// schema.parse(schema.parse(entity)) equals schema.parse(entity)
// Validates: Requirements 9.5
// ============================================================================

describe("Property 5: Zod schema round-trip consistency", () => {
  // ── Patient schemas ───────────────────────────────────────────────────────

  // Use a simple valid email that Zod's strict validator accepts
  const validEmailArb = fc.option(
    fc.tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/),
      fc.constantFrom("com", "org", "net", "io"),
    ).map(([user, domain, tld]) => `${user}@${domain}.${tld}`),
    { nil: null },
  );

  const validPatientArb = fc.record({
    id: fc.uuid(),
    full_name: fc.string({ minLength: 2, maxLength: 100 }),
    email: validEmailArb,
    phone: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
    status: fc.constantFrom(
      "active" as const,
      "inactive" as const,
      "Em Tratamento" as const,
      "Inicial" as const,
    ),
    progress: fc.integer({ min: 0, max: 100 }),
    incomplete_registration: fc.boolean(),
  });

  it("PatientResponseSchema.parse is idempotent (round-trip)", () => {
    fc.assert(
      fc.property(validPatientArb, (patient) => {
        const first = PatientResponseSchema.parse(patient);
        const second = PatientResponseSchema.parse(first);
        expect(second).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });

  it("PatientCreateSchema.parse is idempotent (round-trip)", () => {
    const createArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      status: fc.constantFrom("active" as const, "inactive" as const),
      progress: fc.integer({ min: 0, max: 100 }),
      incomplete_registration: fc.boolean(),
    });

    fc.assert(
      fc.property(createArb, (patient) => {
        const first = PatientCreateSchema.parse(patient);
        const second = PatientCreateSchema.parse(first);
        expect(second).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });

  // ── Appointment schemas ───────────────────────────────────────────────────

  const validAppointmentArb = fc.record({
    id: fc.uuid(),
    patient_id: fc.string({ minLength: 1, maxLength: 36 }),
    status: fc.constantFrom(
      "scheduled" as const,
      "confirmed" as const,
      "completed" as const,
      "cancelled" as const,
    ),
    duration: fc.option(fc.integer({ min: 15, max: 480 }), { nil: null }),
    pain_level: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  });

  it("AppointmentResponseSchema.parse is idempotent (round-trip)", () => {
    fc.assert(
      fc.property(validAppointmentArb, (appointment) => {
        const first = AppointmentResponseSchema.parse(appointment);
        const second = AppointmentResponseSchema.parse(first);
        expect(second).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });

  it("AppointmentCreateSchema.parse is idempotent (round-trip)", () => {
    const createArb = fc.record({
      patient_id: fc.string({ minLength: 1, maxLength: 36 }),
      status: fc.constantFrom("scheduled" as const, "confirmed" as const),
      duration: fc.option(fc.integer({ min: 15, max: 480 }), { nil: null }),
    });

    fc.assert(
      fc.property(createArb, (appointment) => {
        const first = AppointmentCreateSchema.parse(appointment);
        const second = AppointmentCreateSchema.parse(first);
        expect(second).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });
});
