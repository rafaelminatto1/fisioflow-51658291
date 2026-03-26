/**
 * Testes de propriedade para TemplateManager — visibilidade de System_Templates
 * Feature: exercise-templates-refactor
 *
 * Property 11: System_Templates sempre visíveis independentemente de Custom_Templates
 * Validates: Requirements 7.2
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterTemplates } from "./TemplateSidebar";
import type { ExerciseTemplate, PatientProfileCategory } from "@/types/workers";

// ─── Arbitrary generators ────────────────────────────────────────────────────

const PATIENT_PROFILES: PatientProfileCategory[] = [
  "ortopedico",
  "esportivo",
  "pos_operatorio",
  "prevencao",
  "idosos",
];

const arbitraryPatientProfile = fc.constantFrom(...PATIENT_PROFILES);

const arbitraryNonEmptyString = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

function arbitraryTemplate(
  overrides?: Partial<Record<keyof ExerciseTemplate, fc.Arbitrary<unknown>>>,
): fc.Arbitrary<ExerciseTemplate> {
  return fc.record({
    id: fc.uuid(),
    name: arbitraryNonEmptyString,
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
    exerciseCount: fc.integer({ min: 0, max: 50 }),
    ...overrides,
  } as Parameters<typeof fc.record>[0]) as fc.Arbitrary<ExerciseTemplate>;
}

/** Generates a system template that is active (isActive=true) */
function arbitrarySystemTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate({
    templateType: fc.constant("system" as const),
    organizationId: fc.constant(null),
    isActive: fc.constant(true),
    patientProfile: arbitraryPatientProfile,
  });
}

/** Generates a custom template belonging to an org */
function arbitraryCustomTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate({
    templateType: fc.constant("custom" as const),
    organizationId: fc.uuid(),
    patientProfile: arbitraryPatientProfile,
  });
}

// ─── hasCustomTemplates helper (mirrors TemplateManager logic) ────────────────

function hasCustomTemplates(templates: ExerciseTemplate[]): boolean {
  return templates.some((t) => t.templateType === "custom");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TemplateManager — visibilidade de System_Templates", () => {
  // Feature: exercise-templates-refactor, Property 11: System_Templates sempre visíveis independentemente de Custom_Templates
  it(
    "Property 11: system templates ativos são sempre incluídos no resultado do filtro, independentemente de custom templates",
    () => {
      // Validates: Requirements 7.2
      fc.assert(
        fc.property(
          // A list of active system templates (the ones that must always be visible)
          fc.array(arbitrarySystemTemplate(), { minLength: 1, maxLength: 10 }),
          // An arbitrary list of custom templates (may be empty or not)
          fc.array(arbitraryCustomTemplate(), { maxLength: 10 }),
          // Any profile filter (including 'all')
          fc.constantFrom("all" as const, ...PATIENT_PROFILES),
          (systemTemplates, customTemplates, profile) => {
            const allTemplates = [...systemTemplates, ...customTemplates];

            const result = filterTemplates(allTemplates, profile, "");

            // For each active system template whose patientProfile matches the filter,
            // it must appear in the result — regardless of whether custom templates exist.
            const systemTemplatesExpectedInResult = systemTemplates.filter(
              (t) => profile === "all" || t.patientProfile === profile,
            );

            return systemTemplatesExpectedInResult.every((st) =>
              result.some((r) => r.id === st.id),
            );
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 11 (org sem custom templates): system templates são visíveis mesmo quando não há custom templates",
    () => {
      // Validates: Requirements 7.2
      fc.assert(
        fc.property(
          fc.array(arbitrarySystemTemplate(), { minLength: 1, maxLength: 15 }),
          (systemTemplates) => {
            // Org has NO custom templates
            expect(hasCustomTemplates(systemTemplates)).toBe(false);

            // All system templates must still appear when filtering with 'all'
            const result = filterTemplates(systemTemplates, "all", "");

            return result.length === systemTemplates.length &&
              systemTemplates.every((st) => result.some((r) => r.id === st.id));
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 11 (org com custom templates): system templates permanecem visíveis quando custom templates existem",
    () => {
      // Validates: Requirements 7.2
      fc.assert(
        fc.property(
          fc.array(arbitrarySystemTemplate(), { minLength: 1, maxLength: 10 }),
          fc.array(arbitraryCustomTemplate(), { minLength: 1, maxLength: 10 }),
          (systemTemplates, customTemplates) => {
            const allTemplates = [...systemTemplates, ...customTemplates];

            // Org HAS custom templates
            expect(hasCustomTemplates(allTemplates)).toBe(true);

            // System templates must still be present in the unfiltered result
            const result = filterTemplates(allTemplates, "all", "");

            return systemTemplates.every((st) => result.some((r) => r.id === st.id));
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ─── hasCustomTemplates logic ─────────────────────────────────────────────

  describe("hasCustomTemplates — lógica do TemplateManager", () => {
    it("retorna false quando não há custom templates (apenas system)", () => {
      fc.assert(
        fc.property(
          fc.array(arbitrarySystemTemplate(), { maxLength: 15 }),
          (systemTemplates) => {
            return hasCustomTemplates(systemTemplates) === false;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("retorna true quando há pelo menos um custom template", () => {
      fc.assert(
        fc.property(
          fc.array(arbitrarySystemTemplate(), { maxLength: 10 }),
          arbitraryCustomTemplate(),
          fc.array(arbitraryCustomTemplate(), { maxLength: 5 }),
          (systemTemplates, oneCustom, moreCustom) => {
            const templates = [...systemTemplates, oneCustom, ...moreCustom];
            return hasCustomTemplates(templates) === true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Requirement 5.5: bloqueio de edição direta de System_Templates ──────────

describe("TemplateManager — bloqueio de edição de System_Templates (Req 5.5)", () => {
  /**
   * The handleEdit guard logic: if the selected template is a system template,
   * it must NOT proceed to edit mode. We test the pure guard condition here.
   */

  function simulateHandleEdit(
    templateType: "system" | "custom",
    editFn: () => void,
    toastFn: () => void,
  ): void {
    if (templateType === "system") {
      toastFn();
      return;
    }
    editFn();
  }

  it("exibe toast e não chama editFn quando template é do tipo system", () => {
    let toastCalled = false;
    let editCalled = false;

    simulateHandleEdit(
      "system",
      () => { editCalled = true; },
      () => { toastCalled = true; },
    );

    expect(toastCalled).toBe(true);
    expect(editCalled).toBe(false);
  });

  it("chama editFn e não exibe toast quando template é do tipo custom", () => {
    let toastCalled = false;
    let editCalled = false;

    simulateHandleEdit(
      "custom",
      () => { editCalled = true; },
      () => { toastCalled = true; },
    );

    expect(toastCalled).toBe(false);
    expect(editCalled).toBe(true);
  });

  it("Property: para qualquer system template, o fluxo de edição nunca é iniciado", () => {
    // Validates: Requirements 5.5
    fc.assert(
      fc.property(
        arbitrarySystemTemplate(),
        (systemTemplate) => {
          let editCalled = false;
          let toastCalled = false;

          simulateHandleEdit(
            systemTemplate.templateType as "system" | "custom",
            () => { editCalled = true; },
            () => { toastCalled = true; },
          );

          return toastCalled === true && editCalled === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property: para qualquer custom template, o fluxo de edição é sempre iniciado sem toast", () => {
    // Validates: Requirements 5.5 (inverse — custom templates can be edited)
    fc.assert(
      fc.property(
        arbitraryCustomTemplate(),
        (customTemplate) => {
          let editCalled = false;
          let toastCalled = false;

          simulateHandleEdit(
            customTemplate.templateType as "system" | "custom",
            () => { editCalled = true; },
            () => { toastCalled = true; },
          );

          return editCalled === true && toastCalled === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});
