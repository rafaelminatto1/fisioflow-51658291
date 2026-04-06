/**
 * Testes de propriedade para proteção de System_Templates
 * Feature: exercise-templates-refactor
 *
 * Property 7: System_Templates não podem ser excluídos
 * Validates: Requirements 8.1
 *
 * Property 6: Personalizar System_Template não modifica o original
 * Validates: Requirements 5.3
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { ExerciseTemplate } from "@/types/workers";

// ─── Arbitrary generators ────────────────────────────────────────────────────

const arbitraryPatientProfile = fc.constantFrom(
  "ortopedico" as const,
  "esportivo" as const,
  "pos_operatorio" as const,
  "prevencao" as const,
  "idosos" as const,
);

const arbitraryEvidenceLevel = fc.option(
  fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const),
  { nil: null },
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
    evidenceLevel: arbitraryEvidenceLevel,
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

function arbitrarySystemTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate().map((t) => ({
    ...t,
    templateType: "system" as const,
    organizationId: null,
    sourceTemplateId: null,
  }));
}

function arbitraryCustomTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate().map((t) => ({
    ...t,
    templateType: "custom" as const,
  }));
}

// ─── Pure logic functions under test ─────────────────────────────────────────

/**
 * Determines whether a template can be deleted.
 * Only Custom_Templates can be deleted; System_Templates cannot.
 * Validates: Requirements 8.1
 */
export function canDelete(template: ExerciseTemplate): boolean {
  return template.templateType === "custom";
}

/**
 * Simulates the API guard for delete operations.
 * Returns 403 for system templates, 200 for custom templates.
 * Validates: Requirements 8.1
 */
export function guardDeleteTemplate(templateType: "system" | "custom"): 403 | 200 {
  if (templateType === "system") return 403;
  return 200;
}

/**
 * Creates a new Custom_Template as a copy of a System_Template.
 * The original template is NOT modified.
 * Validates: Requirements 5.3
 */
export function customizeTemplate(source: ExerciseTemplate): ExerciseTemplate {
  return {
    ...source,
    id: crypto.randomUUID(),
    templateType: "custom",
    sourceTemplateId: source.id,
    organizationId: "org-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Property 7: System_Templates não podem ser excluídos ────────────────────

describe("Property 7: System_Templates não podem ser excluídos", () => {
  // Feature: exercise-templates-refactor, Property 7: System_Templates não podem ser excluídos

  it("canDelete retorna false para qualquer template com templateType = 'system'", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (template) => {
        return canDelete(template) === false;
      }),
      { numRuns: 100 },
    );
  });

  it("canDelete retorna true para qualquer template com templateType = 'custom'", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(arbitraryCustomTemplate(), (template) => {
        return canDelete(template) === true;
      }),
      { numRuns: 100 },
    );
  });

  it("guardDeleteTemplate retorna 403 para 'system' e 200 para 'custom'", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(
        fc.constantFrom("system" as const, "custom" as const),
        (templateType) => {
          const status = guardDeleteTemplate(templateType);
          if (templateType === "system") return status === 403;
          return status === 200;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Personalizar System_Template não modifica o original ─────────

describe("Property 6: Personalizar System_Template não modifica o original", () => {
  // Feature: exercise-templates-refactor, Property 6: Personalizar System_Template não modifica o original

  it("customizeTemplate retorna um novo template com id diferente do original", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return result.id !== source.id;
      }),
      { numRuns: 100 },
    );
  });

  it("customizeTemplate define sourceTemplateId igual ao id do original", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return result.sourceTemplateId === source.id;
      }),
      { numRuns: 100 },
    );
  });

  it("customizeTemplate define templateType = 'custom' no novo template", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return result.templateType === "custom";
      }),
      { numRuns: 100 },
    );
  });

  it("o template original não é modificado após chamar customizeTemplate", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        // Snapshot all fields before
        const snapshotId = source.id;
        const snapshotName = source.name;
        const snapshotTemplateType = source.templateType;
        const snapshotConditionName = source.conditionName;
        const snapshotPatientProfile = source.patientProfile;
        const snapshotOrganizationId = source.organizationId;
        const snapshotSourceTemplateId = source.sourceTemplateId;
        const snapshotExerciseCount = source.exerciseCount;
        const snapshotEvidenceLevel = source.evidenceLevel;
        const snapshotIsDraft = source.isDraft;
        const snapshotIsActive = source.isActive;
        const snapshotIsPublic = source.isPublic;

        // Perform the customize operation
        customizeTemplate(source);

        // Verify source is unchanged
        return (
          source.id === snapshotId &&
          source.name === snapshotName &&
          source.templateType === snapshotTemplateType &&
          source.conditionName === snapshotConditionName &&
          source.patientProfile === snapshotPatientProfile &&
          source.organizationId === snapshotOrganizationId &&
          source.sourceTemplateId === snapshotSourceTemplateId &&
          source.exerciseCount === snapshotExerciseCount &&
          source.evidenceLevel === snapshotEvidenceLevel &&
          source.isDraft === snapshotIsDraft &&
          source.isActive === snapshotIsActive &&
          source.isPublic === snapshotIsPublic
        );
      }),
      { numRuns: 100 },
    );
  });

  it("customizeTemplate copia name, conditionName e patientProfile do original", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return (
          result.name === source.name &&
          result.conditionName === source.conditionName &&
          result.patientProfile === source.patientProfile
        );
      }),
      { numRuns: 100 },
    );
  });

  it("customizeTemplate copia clinicalNotes, contraindications, precautions e progressionNotes do original", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return (
          result.clinicalNotes === source.clinicalNotes &&
          result.contraindications === source.contraindications &&
          result.precautions === source.precautions &&
          result.progressionNotes === source.progressionNotes
        );
      }),
      { numRuns: 100 },
    );
  });

  it("customizeTemplate define organizationId = 'org-123' no novo template", () => {
    // Validates: Requirements 5.3
    fc.assert(
      fc.property(arbitrarySystemTemplate(), (source) => {
        const result = customizeTemplate(source);
        return result.organizationId === "org-123";
      }),
      { numRuns: 100 },
    );
  });
});
