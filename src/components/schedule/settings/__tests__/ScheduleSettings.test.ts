// Feature: agenda-settings-ux-redesign, Property 15: Badge de contagem reflete tamanho da lista
// Feature: agenda-settings-ux-redesign, Property 16: URL sync é bidirecional

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getBadgeCount,
  getTabFromUrl,
  setTabInUrl,
  VALID_TAB_IDS,
} from "@/pages/ScheduleSettings";

// ─── Property 15: Badge de contagem reflete tamanho da lista ─────────────────
// Validates: Requirements 2.8

describe("Property 15: Badge de contagem reflete tamanho da lista", () => {
  it("badge count equals list length for any list of BlockedTimes", () => {
    // Use integer-based date generation to avoid invalid Date edge cases
    const fcDateString = fc
      .integer({ min: 0, max: 3652 }) // 0..3652 days from 2020-01-01
      .map((offset) => {
        const base = new Date("2020-01-01T00:00:00.000Z");
        base.setUTCDate(base.getUTCDate() + offset);
        return base.toISOString().slice(0, 10);
      });

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1 }),
            start_date: fcDateString,
            end_date: fcDateString,
            is_all_day: fc.boolean(),
            is_recurring: fc.constant(false),
            recurring_days: fc.constant([]),
            created_by: fc.uuid(),
          }),
        ),
        (items) => {
          const count = getBadgeCount(items);
          expect(count).toBe(items.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("badge count equals list length for any list of AppointmentTypes", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 }),
            durationMinutes: fc.integer({ min: 15, max: 480 }),
            bufferBeforeMinutes: fc.integer({ min: 0, max: 60 }),
            bufferAfterMinutes: fc.integer({ min: 0, max: 60 }),
            color: fc.constantFrom("#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"),
            maxPerDay: fc.option(fc.integer({ min: 1, max: 50 })),
            isActive: fc.boolean(),
            isDefault: fc.boolean(),
          }),
        ),
        (items) => {
          const count = getBadgeCount(items);
          expect(count).toBe(items.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("badge count is 0 for empty list", () => {
    expect(getBadgeCount([])).toBe(0);
  });

  it("badge count is exactly N for list of size N", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (n) => {
        const items = Array.from({ length: n }, (_, i) => ({ id: i }));
        expect(getBadgeCount(items)).toBe(n);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 16: URL sync é bidirecional ────────────────────────────────────
// Validates: Requirements 2.6

describe("Property 16: URL sync é bidirecional", () => {
  const validTabs = [...VALID_TAB_IDS];

  it("getTabFromUrl returns the tab from URL when it is valid", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTabs),
        (tab) => {
          const params = new URLSearchParams();
          params.set("tab", tab);
          const result = getTabFromUrl(params, validTabs);
          expect(result).toBe(tab);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("getTabFromUrl returns first valid tab when URL tab is invalid", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validTabs.includes(s as typeof validTabs[number])),
        (invalidTab) => {
          const params = new URLSearchParams();
          params.set("tab", invalidTab);
          const result = getTabFromUrl(params, validTabs);
          expect(result).toBe(validTabs[0]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("getTabFromUrl returns first valid tab when no tab param is present", () => {
    const params = new URLSearchParams();
    const result = getTabFromUrl(params, validTabs);
    expect(result).toBe(validTabs[0]);
  });

  it("setTabInUrl sets the tab in URL params", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTabs),
        (tab) => {
          const params = new URLSearchParams();
          const next = setTabInUrl(params, tab);
          expect(next.get("tab")).toBe(tab);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("round-trip: setTabInUrl then getTabFromUrl returns the same tab", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTabs),
        (tab) => {
          const params = new URLSearchParams();
          const next = setTabInUrl(params, tab);
          const result = getTabFromUrl(next, validTabs);
          expect(result).toBe(tab);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("setTabInUrl does not mutate the original URLSearchParams", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTabs),
        fc.constantFrom(...validTabs),
        (tab1, tab2) => {
          const original = new URLSearchParams();
          original.set("tab", tab1);
          const next = setTabInUrl(original, tab2);
          // Original should still have tab1
          expect(original.get("tab")).toBe(tab1);
          // Next should have tab2
          expect(next.get("tab")).toBe(tab2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("setTabInUrl preserves other URL params", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTabs),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== "tab"),
        fc.string({ minLength: 1, maxLength: 20 }),
        (tab, key, value) => {
          const params = new URLSearchParams();
          params.set(key, value);
          const next = setTabInUrl(params, tab);
          expect(next.get(key)).toBe(value);
          expect(next.get("tab")).toBe(tab);
        },
      ),
      { numRuns: 100 },
    );
  });
});
