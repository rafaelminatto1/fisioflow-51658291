// Feature: agenda-settings-ux-redesign, Property 15: Badge de contagem reflete tamanho da lista

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getBadgeCount } from "@/pages/ScheduleSettings";

/**
 * Property 15: Badge de contagem reflete tamanho da lista
 *
 * Para qualquer lista de BlockedTimes ou AppointmentTypes de tamanho N,
 * getBadgeCount(list) deve retornar exatamente N.
 *
 * Validates: Requirements 2.8
 */
describe("getBadgeCount", () => {
  it("Property 15: para qualquer array de N itens, getBadgeCount retorna exatamente N", () => {
    // Feature: agenda-settings-ux-redesign, Property 15: Badge de contagem reflete tamanho da lista
    fc.assert(
      fc.property(fc.array(fc.anything()), (items) => {
        expect(getBadgeCount(items)).toBe(items.length);
      }),
      { numRuns: 100 },
    );
  });

  it("edge case: array vazio retorna 0", () => {
    expect(getBadgeCount([])).toBe(0);
  });

  it("edge case: array com um item retorna 1", () => {
    expect(getBadgeCount([{ id: "1" }])).toBe(1);
  });
});
