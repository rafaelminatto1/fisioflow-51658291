/**
 * Feature: exercise-templates-refactor
 * Property 11: System_Templates sempre visíveis independentemente de Custom_Templates
 * Validates: Requirements 7.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ExerciseTemplate, PatientProfileCategory } from '@/types/workers';

// ─── Pure filter function under test ─────────────────────────────────────────

/**
 * Filters templates for a given organization.
 * Returns:
 *   - All system templates where isActive === true
 *   - Custom templates where organizationId matches AND isActive === true
 */
export function filterTemplatesForOrg(
  templates: ExerciseTemplate[],
  organizationId: string | null,
): ExerciseTemplate[] {
  return templates.filter((t) => {
    if (!t.isActive) return false;
    if (t.templateType === 'system') return true;
    if (t.templateType === 'custom') {
      return t.organizationId === organizationId;
    }
    return false;
  });
}

// ─── Arbitrary generators ─────────────────────────────────────────────────────

const patientProfiles: PatientProfileCategory[] = [
  'ortopedico',
  'esportivo',
  'pos_operatorio',
  'prevencao',
  'idosos',
];

function arbitraryTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 80 }),
    description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    category: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
    conditionName: fc.option(fc.string({ maxLength: 80 }), { nil: null }),
    templateVariant: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
    clinicalNotes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    contraindications: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    precautions: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    progressionNotes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    evidenceLevel: fc.option(fc.constantFrom('A', 'B', 'C', 'D' as const), { nil: null }),
    bibliographicReferences: fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }),
    isActive: fc.boolean(),
    isPublic: fc.boolean(),
    organizationId: fc.option(fc.uuid(), { nil: null }),
    createdBy: fc.option(fc.uuid(), { nil: null }),
    createdAt: fc.constant(new Date().toISOString()),
    updatedAt: fc.constant(new Date().toISOString()),
    templateType: fc.constantFrom('system', 'custom' as const),
    patientProfile: fc.option(fc.constantFrom(...patientProfiles), { nil: null }),
    sourceTemplateId: fc.option(fc.uuid(), { nil: null }),
    isDraft: fc.boolean(),
    exerciseCount: fc.nat({ max: 30 }),
  });
}

/** Generates a template guaranteed to be a system template and active */
function arbitraryActiveSystemTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate().map((t) => ({
    ...t,
    templateType: 'system' as const,
    organizationId: null,
    isActive: true,
  }));
}

/** Generates a template guaranteed to be a custom template for a specific org */
function arbitraryCustomTemplateForOrg(orgId: string): fc.Arbitrary<ExerciseTemplate> {
  return arbitraryTemplate().map((t) => ({
    ...t,
    templateType: 'custom' as const,
    organizationId: orgId,
  }));
}

/** Generates a custom template for a DIFFERENT org (not the target org) */
function arbitraryCustomTemplateForOtherOrg(targetOrgId: string): fc.Arbitrary<ExerciseTemplate> {
  return fc
    .uuid()
    .filter((id) => id !== targetOrgId)
    .chain((otherId) =>
      arbitraryTemplate().map((t) => ({
        ...t,
        templateType: 'custom' as const,
        organizationId: otherId,
        isActive: true,
      })),
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('filterTemplatesForOrg — Property 11: System_Templates sempre visíveis', () => {
  /**
   * Property 11a: All active system templates are always included in the result,
   * regardless of what custom templates exist or which organizationId is used.
   *
   * Validates: Requirements 7.2
   */
  it('sempre inclui todos os system templates ativos, independentemente de Custom_Templates', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTemplate(), { maxLength: 20 }),
        fc.option(fc.uuid(), { nil: null }),
        (templates, organizationId) => {
          const result = filterTemplatesForOrg(templates, organizationId);

          const activeSystemTemplates = templates.filter(
            (t) => t.templateType === 'system' && t.isActive,
          );

          // Every active system template must appear in the result
          return activeSystemTemplates.every((st) =>
            result.some((r) => r.id === st.id),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11b: System templates are visible even when there are NO custom
   * templates at all (empty org scenario — onboarding state).
   *
   * Validates: Requirements 7.2
   */
  it('system templates são visíveis mesmo quando não há Custom_Templates cadastrados', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryActiveSystemTemplate(), { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (systemTemplates, organizationId) => {
          // No custom templates at all
          const result = filterTemplatesForOrg(systemTemplates, organizationId);

          return systemTemplates.every((st) =>
            result.some((r) => r.id === st.id),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11c: Custom templates from OTHER organizations must NOT appear
   * in the results (multi-tenant isolation).
   *
   * Validates: Requirements 7.2 (inverse — org isolation)
   */
  it('custom templates de outras organizações NÃO aparecem nos resultados', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.uuid().chain((otherId) =>
            arbitraryTemplate().map((t) => ({
              ...t,
              templateType: 'custom' as const,
              organizationId: otherId,
              isActive: true,
            })),
          ),
          { minLength: 1, maxLength: 10 },
        ),
        (targetOrgId, otherOrgTemplates) => {
          // Filter out any that accidentally got the same org id
          const trulyOtherOrg = otherOrgTemplates.filter(
            (t) => t.organizationId !== targetOrgId,
          );

          if (trulyOtherOrg.length === 0) return true; // skip degenerate case

          const result = filterTemplatesForOrg(trulyOtherOrg, targetOrgId);

          // None of the other-org custom templates should appear
          return trulyOtherOrg.every((t) => !result.some((r) => r.id === t.id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11d: System templates and own-org custom templates are both
   * visible simultaneously (mixed scenario).
   *
   * Validates: Requirements 7.2
   */
  it('system templates e custom templates da própria org são visíveis simultaneamente', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(arbitraryActiveSystemTemplate(), { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.uuid().chain((orgId) =>
            arbitraryCustomTemplateForOrg(orgId).map((t) => t),
          ),
          { maxLength: 5 },
        ),
        (organizationId, systemTemplates, customTemplates) => {
          const ownCustomTemplates = customTemplates.map((t) => ({
            ...t,
            organizationId,
            isActive: true,
          }));

          const allTemplates = [...systemTemplates, ...ownCustomTemplates];
          const result = filterTemplatesForOrg(allTemplates, organizationId);

          // All active system templates must be present
          const systemVisible = systemTemplates.every((st) =>
            result.some((r) => r.id === st.id),
          );

          // All own active custom templates must be present
          const customVisible = ownCustomTemplates.every((ct) =>
            result.some((r) => r.id === ct.id),
          );

          return systemVisible && customVisible;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Inverse property: inactive system templates must NOT appear in results.
   */
  it('system templates inativos NÃO aparecem nos resultados', () => {
    fc.assert(
      fc.property(
        fc.array(
          arbitraryTemplate().map((t) => ({
            ...t,
            templateType: 'system' as const,
            organizationId: null,
            isActive: false,
          })),
          { minLength: 1, maxLength: 10 },
        ),
        fc.option(fc.uuid(), { nil: null }),
        (inactiveSystemTemplates, organizationId) => {
          const result = filterTemplatesForOrg(inactiveSystemTemplates, organizationId);
          return result.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
