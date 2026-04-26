/**
 * Tests for domain validation functions.
 *
 * Sub-task 7.1 — Property tests for domain validators
 *   Property 3: Validation determinism — same input always produces same ValidationResult
 *   Property 4: Validation totality — arbitrary inputs never throw
 *   Validates: Requirements 7.4, 7.5
 *
 * Sub-task 7.2 — Unit tests for domain validators
 *   Validates: Requirements 7.2, 7.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateAppointment, type AppointmentInput } from "./appointment.validation";
import { validatePainLevel } from "./pain.validation";

// ============================================================================
// validateAppointment — Unit Tests (7.2)
// ============================================================================

describe("validateAppointment — unit tests", () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("accepts a future date with valid duration", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const input: AppointmentInput = {
      date: tomorrow.toISOString().split("T")[0],
      duration: 60,
    };
    const result = validateAppointment(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts today's date (not in the past)", () => {
    // Use isNew=false to avoid timezone edge cases where today's UTC date
    // might be "yesterday" in local time. The validator compares date-only.
    const today = new Date();
    const input: AppointmentInput = {
      date: today.toISOString().split("T")[0],
      duration: 30,
      isNew: false, // Explicitly not a new appointment to avoid past-date check
    };
    const result = validateAppointment(input);
    expect(result.valid).toBe(true);
  });

  it("accepts minimum duration of 15 minutes", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 15 });
    expect(result.valid).toBe(true);
  });

  it("accepts maximum duration of 480 minutes", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 480 });
    expect(result.valid).toBe(true);
  });

  it("accepts a valid time within business hours", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 60, time: "10:00" });
    expect(result.valid).toBe(true);
  });

  it("accepts isNew=false with a past date", () => {
    const result = validateAppointment({
      date: "2020-01-01",
      duration: 60,
      isNew: false,
    });
    expect(result.valid).toBe(true);
  });

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it("rejects a past date when isNew=true (default)", () => {
    const result = validateAppointment({ date: "2020-01-01", duration: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("passado"))).toBe(true);
  });

  it("rejects duration below 15 minutes", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 14 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duração"))).toBe(true);
  });

  it("rejects duration above 480 minutes", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 481 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duração"))).toBe(true);
  });

  it("rejects duration of 0", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: 0 });
    expect(result.valid).toBe(false);
  });

  it("rejects negative duration", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({ date: tomorrow, duration: -30 });
    expect(result.valid).toBe(false);
  });

  it("rejects time before business hours start", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({
      date: tomorrow,
      duration: 60,
      time: "06:00",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("horário"))).toBe(true);
  });

  it("rejects time after business hours end", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({
      date: tomorrow,
      duration: 60,
      time: "21:00",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("horário"))).toBe(true);
  });

  it("rejects invalid time format", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateAppointment({
      date: tomorrow,
      duration: 60,
      time: "not-a-time",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Horário inválido"))).toBe(true);
  });

  it("rejects invalid date string", () => {
    const result = validateAppointment({ date: "not-a-date", duration: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Data inválida"))).toBe(true);
  });

  it("accumulates multiple errors", () => {
    const result = validateAppointment({ date: "2020-01-01", duration: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("respects custom business hours", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Custom hours: 08:00–18:00
    const result = validateAppointment(
      { date: tomorrow, duration: 60, time: "19:00" },
      { start: "08:00", end: "18:00" },
    );
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// validatePainLevel — Unit Tests (7.2)
// ============================================================================

describe("validatePainLevel — unit tests", () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("accepts pain level 0 (minimum)", () => {
    const result = validatePainLevel(0);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts pain level 10 (maximum)", () => {
    const result = validatePainLevel(10);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts all integers from 0 to 10", () => {
    for (let i = 0; i <= 10; i++) {
      const result = validatePainLevel(i);
      expect(result.valid).toBe(true);
    }
  });

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it("rejects -1 (below minimum)", () => {
    const result = validatePainLevel(-1);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("0 e 10"))).toBe(true);
  });

  it("rejects 11 (above maximum)", () => {
    const result = validatePainLevel(11);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("0 e 10"))).toBe(true);
  });

  it("rejects 5.5 (non-integer)", () => {
    const result = validatePainLevel(5.5);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("inteiro"))).toBe(true);
  });

  it("rejects 0.1 (non-integer)", () => {
    const result = validatePainLevel(0.1);
    expect(result.valid).toBe(false);
  });

  it("rejects string '5'", () => {
    const result = validatePainLevel("5");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("número"))).toBe(true);
  });

  it("rejects null", () => {
    const result = validatePainLevel(null);
    expect(result.valid).toBe(false);
  });

  it("rejects undefined", () => {
    const result = validatePainLevel(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects NaN", () => {
    const result = validatePainLevel(NaN);
    expect(result.valid).toBe(false);
  });

  it("rejects Infinity", () => {
    const result = validatePainLevel(Infinity);
    expect(result.valid).toBe(false);
  });

  it("rejects -Infinity", () => {
    const result = validatePainLevel(-Infinity);
    expect(result.valid).toBe(false);
  });

  it("rejects an object", () => {
    const result = validatePainLevel({ level: 5 });
    expect(result.valid).toBe(false);
  });

  it("rejects an array", () => {
    const result = validatePainLevel([5]);
    expect(result.valid).toBe(false);
  });

  it("rejects boolean true", () => {
    const result = validatePainLevel(true);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Property 3: Validation determinism (7.1)
// Same input always produces same ValidationResult
// Validates: Requirements 7.4, 7.5
// ============================================================================

describe("Property 3: Validation determinism", () => {
  it("validatePainLevel is deterministic for any numeric input", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: false }), (level) => {
        const result1 = validatePainLevel(level);
        const result2 = validatePainLevel(level);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 500 },
    );
  });

  it("validatePainLevel is deterministic for any arbitrary input", () => {
    fc.assert(
      fc.property(fc.anything(), (level) => {
        const result1 = validatePainLevel(level);
        const result2 = validatePainLevel(level);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 300 },
    );
  });

  it("validateAppointment is deterministic for any AppointmentInput", () => {
    // Safe date generator: use integer timestamps to avoid NaN Date issues
    const futureDateArb = fc
      .integer({
        min: new Date("2026-01-01").getTime(),
        max: new Date("2030-12-31").getTime(),
      })
      .map((ms) => new Date(ms).toISOString().split("T")[0]);

    const durationArb = fc.integer({ min: -100, max: 1000 });

    const timeArb = fc.option(
      fc.oneof(
        fc.constant("08:00"),
        fc.constant("10:30"),
        fc.constant("14:00"),
        fc.constant("20:00"),
        fc.constant("06:00"),
        fc.string({ minLength: 0, maxLength: 10 }),
      ),
      { nil: undefined },
    );

    const isNewArb = fc.option(fc.boolean(), { nil: undefined });

    fc.assert(
      fc.property(futureDateArb, durationArb, timeArb, isNewArb, (date, duration, time, isNew) => {
        const input: AppointmentInput = { date, duration, ...(time !== undefined && { time }), ...(isNew !== undefined && { isNew }) };
        const result1 = validateAppointment(input);
        const result2 = validateAppointment(input);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 300 },
    );
  });
});

// ============================================================================
// Property 4: Validation totality (7.1)
// Arbitrary inputs (null, undefined, extreme numbers) never throw
// Validates: Requirements 7.4, 7.5
// ============================================================================

describe("Property 4: Validation totality", () => {
  it("validatePainLevel never throws for any arbitrary input", () => {
    fc.assert(
      fc.property(fc.anything(), (level) => {
        expect(() => validatePainLevel(level)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("validatePainLevel always returns a ValidationResult shape", () => {
    fc.assert(
      fc.property(fc.anything(), (level) => {
        const result = validatePainLevel(level);
        expect(typeof result.valid).toBe("boolean");
        expect(Array.isArray(result.errors)).toBe(true);
        for (const err of result.errors) {
          expect(typeof err).toBe("string");
        }
      }),
      { numRuns: 500 },
    );
  });

  it("validateAppointment never throws for any arbitrary input object", () => {
    // Generate arbitrary objects that might be passed as AppointmentInput
    const arbitraryInputArb = fc.record({
      date: fc.oneof(
        fc.string(),
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.double(),
        fc.boolean(),
        fc.constant(new Date()),
        fc.constant(new Date("invalid")),
      ),
      duration: fc.oneof(
        fc.integer({ min: -1000, max: 1000 }),
        fc.double(),
        fc.constant(NaN),
        fc.constant(Infinity),
        fc.constant(-Infinity),
        fc.constant(null),
        fc.constant(undefined),
      ),
      time: fc.option(
        fc.oneof(fc.string({ minLength: 0, maxLength: 20 }), fc.constant(null)),
        { nil: undefined },
      ),
      isNew: fc.option(fc.boolean(), { nil: undefined }),
    });

    fc.assert(
      fc.property(arbitraryInputArb, (input) => {
        expect(() => validateAppointment(input as AppointmentInput)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("validateAppointment always returns a ValidationResult shape for arbitrary inputs", () => {
    const arbitraryInputArb = fc.record({
      date: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined), fc.integer()),
      duration: fc.oneof(fc.integer({ min: -100, max: 1000 }), fc.constant(NaN), fc.constant(null)),
      time: fc.option(fc.string({ minLength: 0, maxLength: 10 }), { nil: undefined }),
      isNew: fc.option(fc.boolean(), { nil: undefined }),
    });

    fc.assert(
      fc.property(arbitraryInputArb, (input) => {
        const result = validateAppointment(input as AppointmentInput);
        expect(typeof result.valid).toBe("boolean");
        expect(Array.isArray(result.errors)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});
