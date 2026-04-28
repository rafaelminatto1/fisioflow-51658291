/**
 * Property-based tests for AgendaHorariosTab — pure validation logic
 *
 * Tests pure validation functions used in the Agenda & Horários tab:
 * - isValidBusinessHours (Property 10)
 * - isValidBlockedTime (Property 11)
 * - sortBlockedTimesByStartDate (Property 12)
 * - isValidAppointmentDuration (Property 13)
 * - isValidCancellationAdvance (Property 14)
 */

// Feature: agenda-settings-ux-redesign, Property 10: Validação de horário de funcionamento
// Feature: agenda-settings-ux-redesign, Property 11: Validação de BlockedTime
// Feature: agenda-settings-ux-redesign, Property 12: Ordenação de BlockedTimes
// Feature: agenda-settings-ux-redesign, Property 13: Validação de duração de AppointmentType
// Feature: agenda-settings-ux-redesign, Property 14: Validação de antecedência de cancelamento

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure validation functions ────────────────────────────────────────────────

// Property 10
function isValidBusinessHours(open_time: string, close_time: string): boolean {
  return close_time > open_time; // lexicographic HH:MM comparison
}

// Property 11
function isValidBlockedTime(blockedTime: {
  title?: string;
  start_date?: string;
  is_all_day: boolean;
  start_time?: string;
  end_time?: string;
}): boolean {
  if (!blockedTime.title || !blockedTime.start_date) return false;
  if (!blockedTime.is_all_day) {
    if (!blockedTime.start_time || !blockedTime.end_time) return false;
    if (blockedTime.end_time <= blockedTime.start_time) return false;
  }
  return true;
}

// Property 12
function sortBlockedTimesByStartDate<T extends { start_date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

// Property 13
function isValidAppointmentDuration(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 15 && minutes <= 480;
}

// Property 14
function isValidCancellationAdvance(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 0 && hours <= 72;
}

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generates a valid HH:MM time string */
const fcTimeHHMM = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

/** Generates a valid YYYY-MM-DD date string */
const fcDateYYYYMMDD = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }), // use 28 to avoid month-end edge cases
  )
  .map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  );

/** Generates a non-empty string (title) */
const fcNonEmptyString = fc.string({ minLength: 1, maxLength: 100 });

/** Generates a BlockedTime-like object */
const fcBlockedTime = fc.record({
  id: fc.uuid(),
  title: fc.option(fcNonEmptyString, { nil: undefined }),
  start_date: fc.option(fcDateYYYYMMDD, { nil: undefined }),
  is_all_day: fc.boolean(),
  start_time: fc.option(fcTimeHHMM, { nil: undefined }),
  end_time: fc.option(fcTimeHHMM, { nil: undefined }),
});

// ─── Property 10: Validação de horário de funcionamento ──────────────────────

describe("Property 10: Validação de horário de funcionamento", () => {
  // Feature: agenda-settings-ux-redesign, Property 10: Validação de horário de funcionamento
  // Validates: Requirements 5.3

  it("aceita se e somente se close_time > open_time (comparação lexicográfica HH:MM)", () => {
    fc.assert(
      fc.property(fcTimeHHMM, fcTimeHHMM, (open_time, close_time) => {
        const result = isValidBusinessHours(open_time, close_time);
        const expected = close_time > open_time;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita quando close_time === open_time", () => {
    fc.assert(
      fc.property(fcTimeHHMM, (time) => {
        expect(isValidBusinessHours(time, time)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("aceita pares válidos onde close_time > open_time", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.integer({ min: 0, max: 22 }), fc.integer({ min: 1, max: 23 }))
          .filter(([open, close]) => close > open)
          .map(([open, close]) => ({
            open_time: `${String(open).padStart(2, "0")}:00`,
            close_time: `${String(close).padStart(2, "0")}:00`,
          })),
        ({ open_time, close_time }) => {
          expect(isValidBusinessHours(open_time, close_time)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejeita pares inválidos onde close_time < open_time", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.integer({ min: 1, max: 23 }), fc.integer({ min: 0, max: 22 }))
          .filter(([open, close]) => open > close)
          .map(([open, close]) => ({
            open_time: `${String(open).padStart(2, "0")}:00`,
            close_time: `${String(close).padStart(2, "0")}:00`,
          })),
        ({ open_time, close_time }) => {
          expect(isValidBusinessHours(open_time, close_time)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Validação de BlockedTime ────────────────────────────────────

describe("Property 11: Validação de BlockedTime", () => {
  // Feature: agenda-settings-ux-redesign, Property 11: Validação de BlockedTime
  // Validates: Requirements 6.2, 6.3

  it("rejeita quando title está ausente", () => {
    fc.assert(
      fc.property(
        fc.record({
          start_date: fcDateYYYYMMDD,
          is_all_day: fc.boolean(),
          start_time: fc.option(fcTimeHHMM, { nil: undefined }),
          end_time: fc.option(fcTimeHHMM, { nil: undefined }),
        }),
        (bt) => {
          expect(isValidBlockedTime({ ...bt, title: undefined })).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejeita quando start_date está ausente", () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fcNonEmptyString,
          is_all_day: fc.boolean(),
          start_time: fc.option(fcTimeHHMM, { nil: undefined }),
          end_time: fc.option(fcTimeHHMM, { nil: undefined }),
        }),
        (bt) => {
          expect(isValidBlockedTime({ ...bt, start_date: undefined })).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejeita não-dia-inteiro quando end_time <= start_time", () => {
    fc.assert(
      fc.property(
        fcTimeHHMM,
        fcTimeHHMM,
        fcNonEmptyString,
        fcDateYYYYMMDD,
        (start_time, end_time, title, start_date) => {
          fc.pre(end_time <= start_time);
          const result = isValidBlockedTime({
            title,
            start_date,
            is_all_day: false,
            start_time,
            end_time,
          });
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejeita não-dia-inteiro quando start_time está ausente", () => {
    fc.assert(
      fc.property(fcNonEmptyString, fcDateYYYYMMDD, fcTimeHHMM, (title, start_date, end_time) => {
        expect(
          isValidBlockedTime({
            title,
            start_date,
            is_all_day: false,
            start_time: undefined,
            end_time,
          }),
        ).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita não-dia-inteiro quando end_time está ausente", () => {
    fc.assert(
      fc.property(fcNonEmptyString, fcDateYYYYMMDD, fcTimeHHMM, (title, start_date, start_time) => {
        expect(
          isValidBlockedTime({
            title,
            start_date,
            is_all_day: false,
            start_time,
            end_time: undefined,
          }),
        ).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("aceita dia-inteiro com title e start_date presentes (sem validar horários)", () => {
    fc.assert(
      fc.property(fcNonEmptyString, fcDateYYYYMMDD, (title, start_date) => {
        expect(
          isValidBlockedTime({
            title,
            start_date,
            is_all_day: true,
          }),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("aceita não-dia-inteiro válido com end_time > start_time", () => {
    fc.assert(
      fc.property(
        fcNonEmptyString,
        fcDateYYYYMMDD,
        fc
          .tuple(fc.integer({ min: 0, max: 22 }), fc.integer({ min: 1, max: 23 }))
          .filter(([s, e]) => e > s)
          .map(([s, e]) => ({
            start_time: `${String(s).padStart(2, "0")}:00`,
            end_time: `${String(e).padStart(2, "0")}:00`,
          })),
        (title, start_date, { start_time, end_time }) => {
          expect(
            isValidBlockedTime({
              title,
              start_date,
              is_all_day: false,
              start_time,
              end_time,
            }),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Ordenação de BlockedTimes ───────────────────────────────────

describe("Property 12: Ordenação de BlockedTimes", () => {
  // Feature: agenda-settings-ux-redesign, Property 12: Ordenação de BlockedTimes
  // Validates: Requirements 6.5

  const fcBlockedTimeWithDate = fc.record({
    id: fc.uuid(),
    title: fcNonEmptyString,
    start_date: fcDateYYYYMMDD,
    is_all_day: fc.boolean(),
  });

  it("a lista ordenada está em ordem decrescente de start_date", () => {
    fc.assert(
      fc.property(fc.array(fcBlockedTimeWithDate, { minLength: 0, maxLength: 20 }), (items) => {
        const sorted = sortBlockedTimesByStartDate(items);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].start_date >= sorted[i + 1].start_date).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("a lista ordenada tem o mesmo número de elementos que a original", () => {
    fc.assert(
      fc.property(fc.array(fcBlockedTimeWithDate, { minLength: 0, maxLength: 20 }), (items) => {
        const sorted = sortBlockedTimesByStartDate(items);
        expect(sorted.length).toBe(items.length);
      }),
      { numRuns: 100 },
    );
  });

  it("a lista ordenada contém os mesmos elementos que a original (é uma permutação)", () => {
    fc.assert(
      fc.property(fc.array(fcBlockedTimeWithDate, { minLength: 0, maxLength: 20 }), (items) => {
        const sorted = sortBlockedTimesByStartDate(items);

        // Every item in original must appear in sorted
        for (const item of items) {
          expect(sorted.some((s) => s.id === item.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("não modifica a lista original (imutabilidade)", () => {
    fc.assert(
      fc.property(fc.array(fcBlockedTimeWithDate, { minLength: 1, maxLength: 20 }), (items) => {
        const originalCopy = items.map((i) => ({ ...i }));
        sortBlockedTimesByStartDate(items);

        // Original array must be unchanged
        for (let i = 0; i < items.length; i++) {
          expect(items[i].start_date).toBe(originalCopy[i].start_date);
          expect(items[i].id).toBe(originalCopy[i].id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("lista vazia retorna lista vazia", () => {
    const result = sortBlockedTimesByStartDate([]);
    expect(result).toEqual([]);
  });

  it("lista com um elemento retorna lista com o mesmo elemento", () => {
    fc.assert(
      fc.property(fcBlockedTimeWithDate, (item) => {
        const result = sortBlockedTimesByStartDate([item]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(item.id);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Validação de duração de AppointmentType ────────────────────

describe("Property 13: Validação de duração de AppointmentType", () => {
  // Feature: agenda-settings-ux-redesign, Property 13: Validação de duração de AppointmentType
  // Validates: Requirements 7.2

  it("aceita se e somente se 15 <= duration <= 480 (inteiro)", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 600 }), (minutes) => {
        const result = isValidAppointmentDuration(minutes);
        const expected = Number.isInteger(minutes) && minutes >= 15 && minutes <= 480;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("aceita todos os inteiros no intervalo [15, 480]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 15, max: 480 }), (minutes) => {
        expect(isValidAppointmentDuration(minutes)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores abaixo de 15", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 14 }), (minutes) => {
        expect(isValidAppointmentDuration(minutes)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores acima de 480", () => {
    fc.assert(
      fc.property(fc.integer({ min: 481, max: 10000 }), (minutes) => {
        expect(isValidAppointmentDuration(minutes)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores não-inteiros", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 15, max: 480, noNaN: true }).filter((v) => !Number.isInteger(v)),
        (minutes) => {
          expect(isValidAppointmentDuration(minutes)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aceita os valores de fronteira 15 e 480", () => {
    expect(isValidAppointmentDuration(15)).toBe(true);
    expect(isValidAppointmentDuration(480)).toBe(true);
  });

  it("rejeita os valores imediatamente fora das fronteiras 14 e 481", () => {
    expect(isValidAppointmentDuration(14)).toBe(false);
    expect(isValidAppointmentDuration(481)).toBe(false);
  });
});

// ─── Property 14: Validação de antecedência de cancelamento ──────────────────

describe("Property 14: Validação de antecedência de cancelamento", () => {
  // Feature: agenda-settings-ux-redesign, Property 14: Validação de antecedência de cancelamento
  // Validates: Requirements 8.5

  it("aceita se e somente se é inteiro no intervalo [0, 72]", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 200 }), (hours) => {
        const result = isValidCancellationAdvance(hours);
        const expected = Number.isInteger(hours) && hours >= 0 && hours <= 72;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("aceita todos os inteiros no intervalo [0, 72]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 72 }), (hours) => {
        expect(isValidCancellationAdvance(hours)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores negativos", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (hours) => {
        expect(isValidCancellationAdvance(hours)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores acima de 72", () => {
    fc.assert(
      fc.property(fc.integer({ min: 73, max: 10000 }), (hours) => {
        expect(isValidCancellationAdvance(hours)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejeita valores não-inteiros", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 72, noNaN: true }).filter((v) => !Number.isInteger(v)),
        (hours) => {
          expect(isValidCancellationAdvance(hours)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aceita os valores de fronteira 0 e 72", () => {
    expect(isValidCancellationAdvance(0)).toBe(true);
    expect(isValidCancellationAdvance(72)).toBe(true);
  });

  it("rejeita os valores imediatamente fora das fronteiras -1 e 73", () => {
    expect(isValidCancellationAdvance(-1)).toBe(false);
    expect(isValidCancellationAdvance(73)).toBe(false);
  });
});
