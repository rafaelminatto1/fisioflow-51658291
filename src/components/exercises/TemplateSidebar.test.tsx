/**
 * Testes de propriedade para TemplateSidebar — lógica de filtro
 * Feature: exercise-templates-refactor
 *
 * Property 1: Filtro por perfil retorna apenas templates do perfil selecionado
 * Validates: Requirements 1.2, 1.4
 *
 * Property 2: Busca retorna subconjunto relevante
 * Validates: Requirements 1.6
 */

import { describe, it } from "vitest";
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

function arbitraryTemplate(): fc.Arbitrary<ExerciseTemplate> {
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
    evidenceLevel: fc.option(fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const), { nil: null }),
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
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("filterTemplates — testes de propriedade", () => {
  // Feature: exercise-templates-refactor, Property 1: Filtro por perfil retorna apenas templates do perfil selecionado
  it(
    "Property 1: filtro por perfil retorna apenas templates do perfil selecionado",
    () => {
      // Validates: Requirements 1.2, 1.4
      fc.assert(
        fc.property(
          fc.array(arbitraryTemplate(), { maxLength: 30 }),
          arbitraryPatientProfile,
          (templates, profile) => {
            const result = filterTemplates(templates, profile, "");

            // Every returned template must have patientProfile === profile
            return result.every((t) => t.patientProfile === profile);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Feature: exercise-templates-refactor, Property 1 (inverse): quando 'all', todos os templates são retornados
  it(
    "Property 1 (all): quando perfil é 'all', todos os templates são retornados sem filtro de perfil",
    () => {
      // Validates: Requirements 1.4
      fc.assert(
        fc.property(
          fc.array(arbitraryTemplate(), { maxLength: 30 }),
          (templates) => {
            const result = filterTemplates(templates, "all", "");

            // Result must contain exactly the same templates as input (same ids, same order)
            return (
              result.length === templates.length &&
              result.every((r, i) => r.id === templates[i].id)
            );
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Feature: exercise-templates-refactor, Property 2: Busca retorna subconjunto relevante
  it(
    "Property 2: busca retorna subconjunto da lista original e cada resultado contém a query em name, conditionName ou templateVariant",
    () => {
      // Validates: Requirements 1.6
      fc.assert(
        fc.property(
          fc.array(arbitraryTemplate(), { maxLength: 30 }),
          // Generate a non-empty, non-whitespace query
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
          (templates, query) => {
            const result = filterTemplates(templates, "all", query);
            const q = query.trim().toLowerCase();

            // 1. Result must be a subset of the original list
            const isSubset = result.every((r) =>
              templates.some((t) => t.id === r.id),
            );
            if (!isSubset) return false;

            // 2. Each result must contain the query in at least one searchable field
            const allMatch = result.every(
              (t) =>
                t.name?.toLowerCase().includes(q) ||
                t.conditionName?.toLowerCase().includes(q) ||
                t.templateVariant?.toLowerCase().includes(q),
            );

            return allMatch;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Bonus: empty query returns all templates (no search filtering)
  it(
    "Property 2 (empty query): query vazia não filtra nenhum template",
    () => {
      // Validates: Requirements 1.6
      fc.assert(
        fc.property(
          fc.array(arbitraryTemplate(), { maxLength: 30 }),
          (templates) => {
            const result = filterTemplates(templates, "all", "");
            return result.length === templates.length;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Bonus: whitespace-only query is treated as empty
  it(
    "Property 2 (whitespace query): query com apenas espaços não filtra nenhum template",
    () => {
      // Validates: Requirements 1.6
      fc.assert(
        fc.property(
          fc.array(arbitraryTemplate(), { maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 10 }).map((s) => s.replace(/./g, " ")),
          (templates, whitespaceQuery) => {
            const result = filterTemplates(templates, "all", whitespaceQuery);
            return result.length === templates.length;
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
