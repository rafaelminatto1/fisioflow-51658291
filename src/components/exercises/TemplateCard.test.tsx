/**
 * Testes de propriedade para TemplateCard
 * Feature: exercise-templates-refactor
 *
 * Property 3: Renderização de card contém todas as informações obrigatórias
 * Validates: Requirements 1.5
 *
 * Property 9: Badges distintos por tipo de template
 * Validates: Requirements 5.1, 5.4
 */

import { describe, it } from "vitest";
import { render, within } from "@testing-library/react";
import * as fc from "fast-check";
import { TemplateCard } from "./TemplateCard";
import type { ExerciseTemplate } from "@/types/workers";

// ─── Arbitrary generators ────────────────────────────────────────────────────

const arbitraryNonEmptyString = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

const arbitraryTemplateType = fc.constantFrom("system" as const, "custom" as const);

const arbitraryEvidenceLevel = fc.option(
  fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const),
  { nil: null },
);

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
    conditionName: fc.option(arbitraryNonEmptyString, { nil: null }),
    templateVariant: fc.option(fc.string(), { nil: null }),
    clinicalNotes: fc.option(fc.string(), { nil: null }),
    contraindications: fc.option(fc.string(), { nil: null }),
    precautions: fc.option(fc.string(), { nil: null }),
    progressionNotes: fc.option(fc.string(), { nil: null }),
    evidenceLevel: arbitraryEvidenceLevel,
    bibliographicReferences: fc.array(fc.string()),
    isActive: fc.boolean(),
    isPublic: fc.boolean(),
    organizationId: fc.option(fc.uuid(), { nil: null }),
    createdBy: fc.option(fc.uuid(), { nil: null }),
    createdAt: fc.constant("2024-01-01T00:00:00Z"),
    updatedAt: fc.constant("2024-01-01T00:00:00Z"),
    templateType: arbitraryTemplateType,
    patientProfile: fc.option(arbitraryPatientProfile, { nil: null }),
    sourceTemplateId: fc.option(fc.uuid(), { nil: null }),
    isDraft: fc.boolean(),
    exerciseCount: fc.integer({ min: 0, max: 50 }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TemplateCard — testes de propriedade", () => {
  // Feature: exercise-templates-refactor, Property 3: Renderização de card contém todas as informações obrigatórias
  it(
    "Property 3: card renderiza nome, condição, exerciseCount e badge de tipo para qualquer template",
    () => {
      // Validates: Requirements 1.5
      fc.assert(
        fc.property(
          arbitraryTemplate().filter((t) => t.conditionName !== null),
          (template) => {
            const { unmount, container } = render(
              <TemplateCard
                template={template}
                isSelected={false}
                onClick={() => {}}
              />,
            );

            const q = within(container);

            // Nome do template deve estar presente
            const nameEl = q.getByTestId("template-name");
            expect(nameEl.textContent?.trim()).toBe(template.name.trim());

            // Condição clínica deve estar presente (quando não nula)
            if (template.conditionName) {
              const condEl = q.getByTestId("template-condition");
              expect(condEl.textContent?.trim()).toBe(template.conditionName.trim());
            }

            // exerciseCount deve estar presente no texto do elemento com data-testid="exercise-count"
            const countEl = q.getByTestId("exercise-count");
            expect(countEl.textContent).toContain(String(template.exerciseCount));

            // Badge de tipo deve estar presente
            if (template.templateType === "system") {
              expect(q.queryByText("Sistema")).toBeTruthy();
            } else {
              expect(q.queryByText("Personalizado")).toBeTruthy();
            }

            // Badge de evidência deve estar presente quando evidenceLevel não é nulo
            if (template.evidenceLevel !== null) {
              expect(q.queryByText(new RegExp(`EVIDÊNCIA\\s*${template.evidenceLevel}`, "i"))).toBeTruthy();
            }

            unmount();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Feature: exercise-templates-refactor, Property 9: Badges distintos por tipo de template
  it(
    "Property 9: badge 'Sistema' aparece apenas para system e 'Personalizado' apenas para custom — nunca ambos",
    () => {
      // Validates: Requirements 5.1, 5.4
      fc.assert(
        fc.property(arbitraryTemplate(), (template) => {
          const { unmount, container } = render(
            <TemplateCard
              template={template}
              isSelected={false}
              onClick={() => {}}
            />,
          );

          const q = within(container);
          const sistemaBadge = q.queryByText("Sistema");
          const personalizadoBadge = q.queryByText("Personalizado");

          let result = true;

          if (template.templateType === "system") {
            // Deve ter badge "Sistema" e NÃO ter "Personalizado"
            if (!sistemaBadge || personalizadoBadge) result = false;
          } else {
            // Deve ter badge "Personalizado" e NÃO ter "Sistema"
            if (!personalizadoBadge || sistemaBadge) result = false;
          }

          unmount();
          return result;
        }),
        { numRuns: 100 },
      );
    },
  );
});
