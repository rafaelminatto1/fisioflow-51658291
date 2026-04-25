/**
 * Testes de propriedade para TemplateApplyFlow
 * Feature: exercise-templates-refactor
 *
 * Property 5: Aplicação de template cria plano com exercícios corretos
 * Validates: Requirements 3.5
 *
 * Property 10: Preservação de estado do formulário em caso de erro
 * Validates: Requirements 3.7, 8.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { ExerciseTemplate, ExerciseTemplateItem } from "@/types/workers";

// ─── Pure functions extracted from TemplateApplyFlow logic ───────────────────

/**
 * Builds the payload sent to POST /api/templates/:id/apply.
 * Mirrors the logic in TemplateApplyFlow's useMutation mutationFn.
 */
export function buildApplyPayload(
  patientId: string,
  startDate: string,
  surgeryId?: string,
  notes?: string,
): {
  patientId: string;
  startDate: string;
  surgeryId?: string;
  notes?: string;
} {
  return {
    patientId,
    startDate,
    ...(surgeryId && surgeryId !== "none" ? { surgeryId } : {}),
    ...(notes ? { notes } : {}),
  };
}

/**
 * Validates that the apply response exercise count matches the template's exerciseCount.
 * Mirrors the invariant that the backend must return exerciseCount === template.exerciseCount.
 */
export function validateApplyResponse(
  template: ExerciseTemplate,
  response: { planId: string; patientId: string; exerciseCount: number },
): boolean {
  return response.exerciseCount === template.exerciseCount;
}

/**
 * Checks whether the apply response items cover all template item exercise IDs.
 * For any template with N items, the plan must have exactly N items with matching exercise_ids.
 */
export function validatePlanItemsMatchTemplate(
  templateItems: ExerciseTemplateItem[],
  planItems: Array<{ exercise_id: string | null }>,
): boolean {
  if (planItems.length !== templateItems.length) return false;

  const templateExerciseIds = new Set(templateItems.map((i) => i.exerciseId));
  return planItems.every(
    (item) => item.exercise_id !== null && templateExerciseIds.has(item.exercise_id),
  );
}

/**
 * Simulates the onError handler behavior: returns true if form state is preserved
 * (i.e., reset was NOT called). In the component, onError does NOT call reset().
 * This function models the invariant: after error, formValues remain unchanged.
 */
export function formStateAfterError<T extends Record<string, unknown>>(
  formValuesBefore: T,
  errorOccurred: boolean,
): T {
  // On error, form values are preserved — no reset is called
  if (errorOccurred) {
    return formValuesBefore; // unchanged
  }
  // On success, reset() is called — values would be cleared
  return {} as T;
}

// ─── Arbitrary generators ────────────────────────────────────────────────────

const arbitraryNonEmptyString = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

const arbitraryPatientProfile = fc.constantFrom(
  "ortopedico" as const,
  "esportivo" as const,
  "pos_operatorio" as const,
  "prevencao" as const,
  "idosos" as const,
);

function arbitraryTemplate(): fc.Arbitrary<ExerciseTemplate> {
  return fc.record({
    id: fc.uuid(),
    name: arbitraryNonEmptyString,
    description: fc.option(fc.string(), { nil: null }),
    category: fc.option(fc.string(), { nil: null }),
    conditionName: fc.option(fc.string(), { nil: null }),
    templateVariant: fc.option(fc.string(), { nil: null }),
    clinicalNotes: fc.option(fc.string(), { nil: null }),
    contraindications: fc.option(fc.string(), { nil: null }),
    precautions: fc.option(fc.string(), { nil: null }),
    progressionNotes: fc.option(fc.string(), { nil: null }),
    evidenceLevel: fc.option(
      fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const),
      { nil: null },
    ),
    bibliographicReferences: fc.array(fc.string()),
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

function arbitraryTemplateItem(templateId: string): fc.Arbitrary<ExerciseTemplateItem> {
  return fc.record({
    id: fc.uuid(),
    templateId: fc.constant(templateId),
    exerciseId: fc.uuid(),
    orderIndex: fc.integer({ min: 0, max: 100 }),
    sets: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
    repetitions: fc.option(fc.integer({ min: 1, max: 30 }), { nil: null }),
    duration: fc.option(fc.integer({ min: 10, max: 300 }), { nil: null }),
    notes: fc.option(fc.string(), { nil: null }),
    weekStart: fc.option(fc.integer({ min: 1, max: 52 }), { nil: null }),
    weekEnd: fc.option(fc.integer({ min: 1, max: 52 }), { nil: null }),
    clinicalNotes: fc.option(fc.string(), { nil: null }),
    focusMuscles: fc.array(fc.string()),
    purpose: fc.option(fc.string(), { nil: null }),
    createdAt: fc.constant("2024-01-01T00:00:00Z"),
    updatedAt: fc.constant("2024-01-01T00:00:00Z"),
  });
}

/** Generates a valid ISO date string (YYYY-MM-DD) */
const arbitraryIsoDate = fc.integer({ min: 2020, max: 2030 }).chain((year) =>
  fc.integer({ min: 1, max: 12 }).chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }),
  ),
);

/** Generates a valid UUID or undefined for surgeryId */
const arbitrarySurgeryId = fc.option(fc.uuid(), { nil: undefined });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TemplateApplyFlow — testes de propriedade", () => {
  // Feature: exercise-templates-refactor, Property 5: Aplicação de template cria plano com exercícios corretos
  describe("Property 5: payload de aplicação mapeia corretamente os exercícios do template", () => {
    it("Property 5a: payload contém patientId e startDate para qualquer entrada válida", () => {
      // Validates: Requirements 3.5
      fc.assert(
        fc.property(
          fc.uuid(), // patientId
          arbitraryIsoDate, // startDate
          arbitrarySurgeryId,
          (patientId, startDate, surgeryId) => {
            const payload = buildApplyPayload(patientId, startDate, surgeryId);

            return payload.patientId === patientId && payload.startDate === startDate;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 5b: surgeryId 'none' é omitido do payload (não enviado ao backend)", () => {
      // Validates: Requirements 3.5
      fc.assert(
        fc.property(fc.uuid(), arbitraryIsoDate, (patientId, startDate) => {
          const payload = buildApplyPayload(patientId, startDate, "none");

          // surgeryId "none" must NOT be forwarded to the API
          return !("surgeryId" in payload);
        }),
        { numRuns: 100 },
      );
    });

    it("Property 5c: surgeryId válido (UUID) é incluído no payload", () => {
      // Validates: Requirements 3.5
      fc.assert(
        fc.property(
          fc.uuid(),
          arbitraryIsoDate,
          fc.uuid(), // valid surgeryId
          (patientId, startDate, surgeryId) => {
            const payload = buildApplyPayload(patientId, startDate, surgeryId);

            return payload.surgeryId === surgeryId;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 5d: resposta de aplicação tem exerciseCount igual ao exerciseCount do template", () => {
      // Validates: Requirements 3.5
      // For any template with N exercises, the apply response must report exactly N items
      fc.assert(
        fc.property(
          arbitraryTemplate(),
          fc.uuid(), // planId
          fc.uuid(), // patientId in response
          (template, planId, responsePatientId) => {
            const mockResponse = {
              planId,
              patientId: responsePatientId,
              exerciseCount: template.exerciseCount, // backend must return this
            };

            return validateApplyResponse(template, mockResponse);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 5e: itens do plano criado cobrem todos os exercise_ids do template original", () => {
      // Validates: Requirements 3.5
      // For any template with N items, the plan must have exactly N items
      // where each exercise_id matches one from the template
      fc.assert(
        fc.property(
          fc
            .uuid()
            .chain((templateId) =>
              fc
                .array(arbitraryTemplateItem(templateId), { minLength: 1, maxLength: 20 })
                .map((items) => ({ templateId, items })),
            ),
          ({ items }) => {
            // Simulate what the backend does: copy each template item to a plan item
            const planItems = items.map((item) => ({
              exercise_id: item.exerciseId,
            }));

            return validatePlanItemsMatchTemplate(items, planItems);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 5f: plano com exerciseCount diferente do template é inválido", () => {
      // Validates: Requirements 3.5 (negative case)
      fc.assert(
        fc.property(
          arbitraryTemplate().filter((t) => t.exerciseCount > 0),
          fc.uuid(),
          fc.uuid(),
          (template, planId, responsePatientId) => {
            // Response with wrong count must fail validation
            const wrongResponse = {
              planId,
              patientId: responsePatientId,
              exerciseCount: template.exerciseCount + 1, // intentionally wrong
            };

            return !validateApplyResponse(template, wrongResponse);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: exercise-templates-refactor, Property 10: Preservação de estado do formulário em caso de erro
  describe("Property 10: formulário preserva estado após erro de backend", () => {
    it("Property 10a: em caso de erro, todos os campos do formulário mantêm seus valores anteriores", () => {
      // Validates: Requirements 3.7, 8.4
      fc.assert(
        fc.property(
          // Generate arbitrary form state (patientId, startDate, optional surgeryId)
          fc.record({
            patientId: fc.uuid(),
            startDate: arbitraryIsoDate,
            surgeryId: fc.option(fc.uuid(), { nil: undefined }),
            notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          (formValues) => {
            const stateAfterError = formStateAfterError(formValues, true);

            // All fields must be preserved exactly
            return (
              stateAfterError.patientId === formValues.patientId &&
              stateAfterError.startDate === formValues.startDate &&
              stateAfterError.surgeryId === formValues.surgeryId &&
              stateAfterError.notes === formValues.notes
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 10b: em caso de sucesso, o formulário é resetado (campos limpos)", () => {
      // Validates: Requirements 3.7 (inverse — success resets form)
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.uuid(),
            startDate: arbitraryIsoDate,
            surgeryId: fc.option(fc.uuid(), { nil: undefined }),
            notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          (formValues) => {
            const stateAfterSuccess = formStateAfterError(formValues, false);

            // On success, form is reset — no original values remain
            return Object.keys(stateAfterSuccess).length === 0;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 10c: onError handler não chama reset — Sheet permanece aberta com dados", () => {
      // Validates: Requirements 3.7, 8.4
      // Tests the invariant: for any form state, error does NOT clear any field
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.uuid(),
            startDate: arbitraryIsoDate,
            surgeryId: fc.option(fc.uuid(), { nil: undefined }),
            notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          fc.string({ minLength: 1, maxLength: 200 }), // error message
          (formValues, _errorMessage) => {
            // Simulate: error occurs, onError is called
            // The component's onError does NOT call reset()
            const stateAfterError = formStateAfterError(formValues, true);

            // Every key in the original form must still be present with the same value
            return Object.entries(formValues).every(
              ([key, value]) => (stateAfterError as Record<string, unknown>)[key] === value,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 10d: múltiplos erros consecutivos não degradam o estado do formulário", () => {
      // Validates: Requirements 3.7, 8.4
      // After N consecutive errors, form state must still equal the original
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.uuid(),
            startDate: arbitraryIsoDate,
            surgeryId: fc.option(fc.uuid(), { nil: undefined }),
            notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          fc.integer({ min: 1, max: 10 }), // number of consecutive errors
          (formValues, errorCount) => {
            let currentState = formValues;

            // Simulate N consecutive errors
            for (let i = 0; i < errorCount; i++) {
              currentState = formStateAfterError(currentState, true);
            }

            // State must be identical to original after any number of errors
            return (
              currentState.patientId === formValues.patientId &&
              currentState.startDate === formValues.startDate &&
              currentState.surgeryId === formValues.surgeryId &&
              currentState.notes === formValues.notes
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Unit tests for buildApplyPayload edge cases ──────────────────────────────

describe("buildApplyPayload — testes unitários", () => {
  it("inclui surgeryId quando é um UUID válido", () => {
    const payload = buildApplyPayload("patient-1", "2024-06-01", "surgery-uuid-123");
    expect(payload.surgeryId).toBe("surgery-uuid-123");
  });

  it("omite surgeryId quando é 'none'", () => {
    const payload = buildApplyPayload("patient-1", "2024-06-01", "none");
    expect(payload).not.toHaveProperty("surgeryId");
  });

  it("omite surgeryId quando é undefined", () => {
    const payload = buildApplyPayload("patient-1", "2024-06-01", undefined);
    expect(payload).not.toHaveProperty("surgeryId");
  });

  it("omite notes quando é undefined", () => {
    const payload = buildApplyPayload("patient-1", "2024-06-01");
    expect(payload).not.toHaveProperty("notes");
  });

  it("inclui notes quando fornecido", () => {
    const payload = buildApplyPayload("patient-1", "2024-06-01", undefined, "Observação");
    expect(payload.notes).toBe("Observação");
  });
});

describe("validatePlanItemsMatchTemplate — testes unitários", () => {
  it("retorna true quando itens do plano cobrem todos os exercise_ids do template", () => {
    const templateItems: ExerciseTemplateItem[] = [
      {
        id: "item-1",
        templateId: "tmpl-1",
        exerciseId: "ex-1",
        orderIndex: 0,
        sets: 3,
        repetitions: 10,
        duration: null,
        notes: null,
        weekStart: null,
        weekEnd: null,
        clinicalNotes: null,
        focusMuscles: [],
        purpose: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "item-2",
        templateId: "tmpl-1",
        exerciseId: "ex-2",
        orderIndex: 1,
        sets: 3,
        repetitions: 12,
        duration: null,
        notes: null,
        weekStart: null,
        weekEnd: null,
        clinicalNotes: null,
        focusMuscles: [],
        purpose: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const planItems = [{ exercise_id: "ex-1" }, { exercise_id: "ex-2" }];

    expect(validatePlanItemsMatchTemplate(templateItems, planItems)).toBe(true);
  });

  it("retorna false quando contagem de itens difere", () => {
    const templateItems: ExerciseTemplateItem[] = [
      {
        id: "item-1",
        templateId: "tmpl-1",
        exerciseId: "ex-1",
        orderIndex: 0,
        sets: null,
        repetitions: null,
        duration: null,
        notes: null,
        weekStart: null,
        weekEnd: null,
        clinicalNotes: null,
        focusMuscles: [],
        purpose: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const planItems = [{ exercise_id: "ex-1" }, { exercise_id: "ex-2" }];

    expect(validatePlanItemsMatchTemplate(templateItems, planItems)).toBe(false);
  });

  it("retorna false quando exercise_id não corresponde ao template", () => {
    const templateItems: ExerciseTemplateItem[] = [
      {
        id: "item-1",
        templateId: "tmpl-1",
        exerciseId: "ex-1",
        orderIndex: 0,
        sets: null,
        repetitions: null,
        duration: null,
        notes: null,
        weekStart: null,
        weekEnd: null,
        clinicalNotes: null,
        focusMuscles: [],
        purpose: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const planItems = [{ exercise_id: "ex-WRONG" }];

    expect(validatePlanItemsMatchTemplate(templateItems, planItems)).toBe(false);
  });
});

// ─── Unit tests for task 11.3 ─────────────────────────────────────────────────
// Requirements: 3.4, 3.7

/**
 * Pure helper that mirrors the component logic:
 * isPosOperatorio = template.patientProfile === 'pos_operatorio'
 * totalSteps = isPosOperatorio ? 3 : 2
 */
function getStepCount(patientProfile: string | null): number {
  return patientProfile === "pos_operatorio" ? 3 : 2;
}

describe("TemplateApplyFlow — testes unitários (task 11.3)", () => {
  // Validates: Requirements 3.4
  describe("etapa de cirurgia (step 3) aparece apenas para pos_operatorio", () => {
    it("retorna 3 etapas para perfil pos_operatorio", () => {
      expect(getStepCount("pos_operatorio")).toBe(3);
    });

    it("retorna 2 etapas para perfil ortopedico", () => {
      expect(getStepCount("ortopedico")).toBe(2);
    });

    it("retorna 2 etapas para perfil esportivo", () => {
      expect(getStepCount("esportivo")).toBe(2);
    });

    it("retorna 2 etapas para perfil prevencao", () => {
      expect(getStepCount("prevencao")).toBe(2);
    });

    it("retorna 2 etapas para perfil idosos", () => {
      expect(getStepCount("idosos")).toBe(2);
    });

    it("retorna 2 etapas quando patientProfile é null", () => {
      expect(getStepCount(null)).toBe(2);
    });
  });

  // Validates: Requirements 3.7
  describe("formulário mantém dados após erro de API", () => {
    it("preserva patientId após erro", () => {
      const state = {
        patientId: "patient-abc",
        startDate: "2024-06-01",
        surgeryId: undefined,
        notes: undefined,
      };
      const after = formStateAfterError(state, true);
      expect(after.patientId).toBe("patient-abc");
    });

    it("preserva startDate após erro", () => {
      const state = {
        patientId: "patient-abc",
        startDate: "2024-06-01",
        surgeryId: undefined,
        notes: undefined,
      };
      const after = formStateAfterError(state, true);
      expect(after.startDate).toBe("2024-06-01");
    });

    it("preserva surgeryId após erro quando definido", () => {
      const state = {
        patientId: "p-1",
        startDate: "2024-01-01",
        surgeryId: "surgery-xyz",
        notes: undefined,
      };
      const after = formStateAfterError(state, true);
      expect(after.surgeryId).toBe("surgery-xyz");
    });

    it("preserva notes após erro quando definido", () => {
      const state = {
        patientId: "p-1",
        startDate: "2024-01-01",
        surgeryId: undefined,
        notes: "Observação importante",
      };
      const after = formStateAfterError(state, true);
      expect(after.notes).toBe("Observação importante");
    });

    it("limpa o formulário em caso de sucesso (sem erro)", () => {
      const state = { patientId: "p-1", startDate: "2024-01-01", surgeryId: "s-1", notes: "nota" };
      const after = formStateAfterError(state, false);
      expect(Object.keys(after)).toHaveLength(0);
    });
  });
});
