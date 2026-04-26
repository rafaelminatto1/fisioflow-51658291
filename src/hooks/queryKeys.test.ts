/**
 * Property-based tests for the QueryKeys registry.
 *
 * **Validates: Requirements 2.4, 2.5**
 *
 * Property 2: Query key prefix invariant
 * For any domain, `detail(id).slice(0, lists().length)` deep-equals `lists()`.
 * This ensures cascade invalidation works correctly: invalidating `lists()` also
 * invalidates all `detail(id)` queries.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { QueryKeys } from "./queryKeys";

// Domains that have all(), lists(), and detail(id) with the prefix invariant
const DOMAINS_WITH_PREFIX_INVARIANT = [
  "patients",
  "appointments",
  "financial",
  "exercises",
  "soap",
  "organizations",
  "users",
  "leads",
  "services",
  "convenios",
  "gamification",
  "dashboard",
  "settings",
  "tasks",
  "events",
  "reports",
] as const;

type DomainName = (typeof DOMAINS_WITH_PREFIX_INVARIANT)[number];

describe("QueryKeys registry", () => {
  describe("Property 2: Query key prefix invariant", () => {
    /**
     * For any domain, detail(id).slice(0, lists().length) must deep-equal lists().
     * This guarantees that invalidating lists() cascades to all detail() queries.
     *
     * **Validates: Requirements 2.4, 2.5**
     */
    it("detail(id) starts with lists() for all domains (property-based)", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DOMAINS_WITH_PREFIX_INVARIANT),
          fc.string({ minLength: 1, maxLength: 64 }),
          (domainName: DomainName, id: string) => {
            const domain = QueryKeys[domainName];
            const listsKey = domain.lists();
            const detailKey = domain.detail(id);

            const prefix = detailKey.slice(0, listsKey.length);

            // The prefix of detail(id) must deep-equal lists()
            expect(prefix).toEqual(listsKey);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * Verify the invariant holds for each domain individually with explicit examples.
     *
     * **Validates: Requirements 2.4, 2.5**
     */
    it.each(DOMAINS_WITH_PREFIX_INVARIANT)(
      "detail(id) starts with lists() for domain: %s",
      (domainName: DomainName) => {
        const domain = QueryKeys[domainName];
        const listsKey = domain.lists();
        const detailKey = domain.detail("test-id-123");

        expect(detailKey.length).toBeGreaterThan(listsKey.length);
        expect(detailKey.slice(0, listsKey.length)).toEqual(listsKey);
      },
    );

    /**
     * Verify that lists() is a strict prefix of detail(id) — i.e., detail has more elements.
     *
     * **Validates: Requirements 2.4**
     */
    it("detail(id) is strictly longer than lists() for all domains (property-based)", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DOMAINS_WITH_PREFIX_INVARIANT),
          fc.string({ minLength: 1, maxLength: 64 }),
          (domainName: DomainName, id: string) => {
            const domain = QueryKeys[domainName];
            const listsKey = domain.lists();
            const detailKey = domain.detail(id);

            expect(detailKey.length).toBeGreaterThan(listsKey.length);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * Verify that all() is a prefix of lists() for all domains.
     * This ensures the full cascade: all() → lists() → detail(id).
     *
     * **Validates: Requirements 2.4, 2.5**
     */
    it("lists() starts with all() for all domains (property-based)", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DOMAINS_WITH_PREFIX_INVARIANT),
          (domainName: DomainName) => {
            const domain = QueryKeys[domainName];
            const allKey = domain.all();
            const listsKey = domain.lists();

            expect(listsKey.slice(0, allKey.length)).toEqual(allKey);
            expect(listsKey.length).toBeGreaterThan(allKey.length);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("Structure invariants", () => {
    it("all domains have all(), lists(), and detail() factory functions", () => {
      for (const domainName of DOMAINS_WITH_PREFIX_INVARIANT) {
        const domain = QueryKeys[domainName];
        expect(typeof domain.all).toBe("function");
        expect(typeof domain.lists).toBe("function");
        expect(typeof domain.detail).toBe("function");
      }
    });

    it("all() returns readonly arrays for all domains", () => {
      for (const domainName of DOMAINS_WITH_PREFIX_INVARIANT) {
        const key = QueryKeys[domainName].all();
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBeGreaterThan(0);
      }
    });

    it("lists() returns readonly arrays for all domains", () => {
      for (const domainName of DOMAINS_WITH_PREFIX_INVARIANT) {
        const key = QueryKeys[domainName].lists();
        expect(Array.isArray(key)).toBe(true);
        expect(key.length).toBeGreaterThan(0);
      }
    });

    it("detail(id) returns readonly arrays containing the id for all domains", () => {
      const testId = "abc-123";
      for (const domainName of DOMAINS_WITH_PREFIX_INVARIANT) {
        const key = QueryKeys[domainName].detail(testId);
        expect(Array.isArray(key)).toBe(true);
        expect(key).toContain(testId);
      }
    });
  });
});
