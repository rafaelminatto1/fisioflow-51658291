/**
 * Testes de propriedade para consistência de exercise_count
 * Feature: exercise-templates-refactor
 *
 * Property 8: Contagem de exercícios é consistente com os items
 * Validates: Requirements 1.5
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ExerciseTemplate, PatientProfileCategory } from "@/types/workers";

// ─── Domain types ─────────────────────────────────────────────────────────────

interface TemplateItem {
  id: string;
  templateId: string;
  exerciseId: string;
}

interface TemplateStore {
  template: ExerciseTemplate;
  items: TemplateItem[];
}

// ─── Pure logic functions under test ─────────────────────────────────────────

/**
 * Adds an item to the store and updates exerciseCount.
 * Models the DB trigger trg_template_exercise_count on INSERT.
 */
export function addItem(store: TemplateStore, item: TemplateItem): TemplateStore {
  const newItems = [...store.items, item];
  const count = newItems.filter((i) => i.templateId === store.template.id).length;
  return {
    template: { ...store.template, exerciseCount: count },
    items: newItems,
  };
}

/**
 * Removes an item from the store by id and updates exerciseCount.
 * Models the DB trigger trg_template_exercise_count on DELETE.
 */
export function removeItem(store: TemplateStore, itemId: string): TemplateStore {
  const newItems = store.items.filter((i) => i.id !== itemId);
  const count = newItems.filter((i) => i.templateId === store.template.id).length;
  return {
    template: { ...store.template, exerciseCount: count },
    items: newItems,
  };
}

/**
 * Returns the number of items belonging to the template.
 * Mirrors: SELECT COUNT(*) FROM exercise_template_items WHERE template_id = template.id
 */
export function getExerciseCount(store: TemplateStore): number {
  return store.items.filter((i) => i.templateId === store.template.id).length;
}

// ─── Arbitrary generators ─────────────────────────────────────────────────────

const arbitraryPatientProfile = fc.constantFrom<PatientProfileCategory>(
  "ortopedico",
  "esportivo",
  "pos_operatorio",
  "prevencao",
  "idosos",
);

function arbitraryTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    category: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
    conditionName: fc.option(fc.string({ maxLength: 80 }), { nil: null }),
    templateVariant: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
    clinicalNotes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    contraindications: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    precautions: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    progressionNotes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    evidenceLevel: fc.option(
      fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const),
      { nil: null },
    ),
    bibliographicReferences: fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }),
    isActive: fc.boolean(),
    isPublic: fc.boolean(),
    organizationId: fc.option(fc.uuid(), { nil: null }),
    createdBy: fc.option(fc.uuid(), { nil: null }),
    createdAt: fc.constant("2024-01-01T00:00:00Z"),
    updatedAt: fc.constant("2024-01-01T00:00:00Z"),
    templateType: fc.constantFrom("system" as const, "custom" as const),
    patientProfile: fc.option(arbitraryPatientProfile, { nil: null }),
    sourceTemplateId: fc.option(fc.uuid(), { nil: null }),
    isDraft: fc.boolean(),
    exerciseCount: fc.nat({ max: 50 }),
  });
}

function arbitraryTemplateItem(templateId: string): fc.Arbitrary<TemplateItem> {
  return fc.record({
    id: fc.uuid(),
    templateId: fc.constant(templateId),
    exerciseId: fc.uuid(),
  });
}

function arbitraryEmptyStore(): fc.Arbitrary<TemplateStore> {
  return arbitraryTemplate().map((template) => ({
    template: { ...template, exerciseCount: 0 },
    items: [],
  }));
}

function arbitraryStoreWithItems(): fc.Arbitrary<TemplateStore> {
  return arbitraryTemplate().chain((template) =>
    fc.array(arbitraryTemplateItem(template.id), { minLength: 1, maxLength: 10 }).map((items) => ({
      template: { ...template, exerciseCount: items.length },
      items,
    })),
  );
}

// ─── Property 8: Contagem de exercícios é consistente com os items ────────────

describe("Property 8: Contagem de exercícios é consistente com os items", () => {
  // Feature: exercise-templates-refactor, Property 8: Contagem de exercícios é consistente com os items

  it("após addItem, exerciseCount é igual ao número de items do template", () => {
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        arbitraryEmptyStore(),
        fc.uuid(), // exerciseId
        (store, exerciseId) => {
          const item: TemplateItem = {
            id: crypto.randomUUID(),
            templateId: store.template.id,
            exerciseId,
          };
          const next = addItem(store, item);
          return (
            next.template.exerciseCount ===
            next.items.filter((i) => i.templateId === next.template.id).length
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("após removeItem, exerciseCount é igual ao número de items do template", () => {
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(arbitraryStoreWithItems(), (store) => {
        const itemToRemove = store.items[0];
        const next = removeItem(store, itemToRemove.id);
        return (
          next.template.exerciseCount ===
          next.items.filter((i) => i.templateId === next.template.id).length
        );
      }),
      { numRuns: 100 },
    );
  });

  it("após N operações aleatórias de add/remove, exerciseCount sempre é igual a items.length", () => {
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        arbitraryEmptyStore(),
        fc.array(
          fc.oneof(
            fc.record({ op: fc.constant("add" as const), exerciseId: fc.uuid() }),
            fc.record({ op: fc.constant("remove" as const) }),
          ),
          { minLength: 1, maxLength: 20 },
        ),
        (initialStore, ops) => {
          let store = initialStore;
          for (const op of ops) {
            if (op.op === "add") {
              const item: TemplateItem = {
                id: crypto.randomUUID(),
                templateId: store.template.id,
                exerciseId: op.exerciseId,
              };
              store = addItem(store, item);
            } else {
              if (store.items.length > 0) {
                store = removeItem(store, store.items[0].id);
              }
            }
            // Invariant must hold after every operation
            const expected = store.items.filter((i) => i.templateId === store.template.id).length;
            if (store.template.exerciseCount !== expected) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("exerciseCount nunca é negativo", () => {
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(
        arbitraryEmptyStore(),
        fc.array(
          fc.oneof(
            fc.record({ op: fc.constant("add" as const), exerciseId: fc.uuid() }),
            fc.record({ op: fc.constant("remove" as const) }),
          ),
          { minLength: 0, maxLength: 20 },
        ),
        (initialStore, ops) => {
          let store = initialStore;
          for (const op of ops) {
            if (op.op === "add") {
              const item: TemplateItem = {
                id: crypto.randomUUID(),
                templateId: store.template.id,
                exerciseId: op.exerciseId,
              };
              store = addItem(store, item);
            } else {
              if (store.items.length > 0) {
                store = removeItem(store, store.items[0].id);
              }
            }
            if (store.template.exerciseCount < 0) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("exerciseCount é 0 para um template sem items", () => {
    // Validates: Requirements 1.5
    fc.assert(
      fc.property(arbitraryEmptyStore(), (store) => {
        expect(store.template.exerciseCount).toBe(0);
        expect(getExerciseCount(store)).toBe(0);
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
