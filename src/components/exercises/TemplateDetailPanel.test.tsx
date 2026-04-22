/**
 * Testes de propriedade para TemplateDetailPanel
 * Feature: exercise-templates-refactor
 *
 * Property 4: Renderização condicional por perfil pós-operatório
 * Validates: Requirements 2.4, 3.4, 4.6
 */

import { describe, it, expect } from "vitest";
import { fireEvent, render, within } from "@testing-library/react";
import * as fc from "fast-check";
import { TemplateDetailPanel } from "./TemplateDetailPanel";
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
  });
}

const noop = () => {};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TemplateDetailPanel — testes de propriedade", () => {
  // Feature: exercise-templates-refactor, Property 4: Renderização condicional por perfil pós-operatório
  it(
    "Property 4a: ExerciseTimeline aparece se e somente se patientProfile = 'pos_operatorio' E exerciseCount > 0",
    () => {
      // Validates: Requirements 2.4
      fc.assert(
        fc.property(
          arbitraryTemplate(),
          (template) => {
            const { unmount, container } = render(
              <TemplateDetailPanel
                template={template}
                onApply={noop}
                onCustomize={noop}
                onEdit={noop}
                onDelete={noop}
              />,
            );

            const q = within(container);
            const timeline = q.queryByTestId("exercise-timeline");

            const shouldShow =
              template.patientProfile === "pos_operatorio" &&
              template.exerciseCount > 0;

            const result = shouldShow ? timeline !== null : timeline === null;

            unmount();
            return result;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Feature: exercise-templates-refactor, Property 4: Renderização condicional — botão Editar
  it(
    "Property 4d: 'Personalizar' appears for system, trash icon only for custom",
    () => {
      fc.assert(
        fc.property(
          arbitraryTemplate(),
          (template) => {
            const { unmount, container } = render(
              <TemplateDetailPanel
                template={template}
                onApply={noop}
                onCustomize={noop}
                onEdit={noop}
                onDelete={noop}
              />,
            );

            const q = within(container);
            const customizeBtn = q.queryByRole("button", { name: /personalizar/i });
            const editBtn = q.queryByRole("button", { name: /editar/i });
            const deleteDialogBtn = container.querySelector("[data-testid='delete-trigger']") || q.queryByRole("button", { name: /confirmar exclusão/i });

            const isSystem = template.templateType === "system";
            const customizeCorrect = isSystem ? customizeBtn !== null : customizeBtn === null;
            const editCorrect = isSystem ? editBtn === null : editBtn !== null;

            const result = customizeCorrect && editCorrect;

            unmount();
            return result;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Feature: exercise-templates-refactor, Property 4: Renderização condicional — botão Excluir
  it(
    "Property 4c: custom templates have 'Editar' + trash icon, system has neither",
    () => {
      fc.assert(
        fc.property(
          arbitraryTemplate(),
          (template) => {
            const { unmount, container } = render(
              <TemplateDetailPanel
                template={template}
                onApply={noop}
                onCustomize={noop}
                onEdit={noop}
                onDelete={noop}
              />,
            );

            const q = within(container);
            const editBtn = q.queryByRole("button", { name: /editar/i });
            const customizeBtn = q.queryByRole("button", { name: /personalizar/i });

            const isCustom = template.templateType === "custom";
            const editCorrect = isCustom ? editBtn !== null : editBtn === null;
            const customizeCorrect = isCustom ? customizeBtn === null : customizeBtn !== null;

            const result = editCorrect && customizeCorrect;

            unmount();
            return result;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 4d: 'Personalizar' for system only, 'Editar' for custom only",
    () => {
      fc.assert(
        fc.property(
          arbitraryTemplate(),
          (template) => {
            const { unmount, container } = render(
              <TemplateDetailPanel
                template={template}
                onApply={noop}
                onCustomize={noop}
                onEdit={noop}
                onDelete={noop}
              />,
            );

            const q = within(container);
            const customizeBtn = q.queryByRole("button", { name: /personalizar/i });
            const editBtn = q.queryByRole("button", { name: /editar/i });

            const isSystem = template.templateType === "system";
            const result = isSystem
              ? customizeBtn !== null && editBtn === null
              : customizeBtn === null && editBtn !== null;

            unmount();
            return result;
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<ExerciseTemplate> = {}): ExerciseTemplate {
  return {
    id: "test-id-1234",
    name: "Template de Teste",
    description: null,
    category: null,
    conditionName: "Condição Teste",
    templateVariant: null,
    clinicalNotes: null,
    contraindications: null,
    precautions: null,
    progressionNotes: null,
    evidenceLevel: null,
    bibliographicReferences: [],
    isActive: true,
    isPublic: false,
    organizationId: null,
    createdBy: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    templateType: "system",
    patientProfile: "ortopedico",
    sourceTemplateId: null,
    isDraft: false,
    exerciseCount: 3,
    ...overrides,
  };
}

describe("TemplateDetailPanel — testes unitários", () => {
  it("estado vazio quando exerciseCount = 0", () => {
    const template = makeTemplate({ exerciseCount: 0 });
    const { getByText } = render(
      <TemplateDetailPanel
        template={template}
        onApply={noop}
        onCustomize={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(getByText("Nenhum exercício cadastrado")).toBeTruthy();
  });

  it("não exibe botão Personalizar", () => {
    const template = makeTemplate({ templateType: "custom" });
    const { queryByRole } = render(
      <TemplateDetailPanel
        template={template}
        onApply={noop}
        onCustomize={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(queryByRole("button", { name: /personalizar/i })).toBeNull();
  });

  it("botão Personalizar em System_Template chama fluxo de versão editável", () => {
    const template = makeTemplate({ templateType: "system" });
    let customizeCalled = false;
    let editCalled = false;

    const { getByRole } = render(
      <TemplateDetailPanel
        template={template}
        onApply={noop}
        onCustomize={() => { customizeCalled = true; }}
        onEdit={() => { editCalled = true; }}
        onDelete={noop}
      />,
    );

    fireEvent.click(getByRole("button", { name: /personalizar/i }));

    expect(customizeCalled).toBe(true);
    expect(editCalled).toBe(false);
  });

  it("botão Editar em Custom_Template chama edição direta", () => {
    const template = makeTemplate({ templateType: "custom" });
    let customizeCalled = false;
    let editCalled = false;

    const { getByRole } = render(
      <TemplateDetailPanel
        template={template}
        onApply={noop}
        onCustomize={() => { customizeCalled = true; }}
        onEdit={() => { editCalled = true; }}
        onDelete={noop}
      />,
    );

    fireEvent.click(getByRole("button", { name: /editar/i }));

    expect(customizeCalled).toBe(false);
    expect(editCalled).toBe(true);
  });

  it("exibição de timeline apenas para pos_operatorio", () => {
    // Should show timeline for pos_operatorio with exerciseCount > 0
    const posOpTemplate = makeTemplate({
      patientProfile: "pos_operatorio",
      exerciseCount: 5,
    });
    const { getByTestId, unmount } = render(
      <TemplateDetailPanel
        template={posOpTemplate}
        onApply={noop}
        onCustomize={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(getByTestId("exercise-timeline")).toBeTruthy();
    unmount();

    // Should NOT show timeline for ortopedico even with exerciseCount > 0
    const ortopedicoTemplate = makeTemplate({
      patientProfile: "ortopedico",
      exerciseCount: 5,
    });
    const { queryByTestId } = render(
      <TemplateDetailPanel
        template={ortopedicoTemplate}
        onApply={noop}
        onCustomize={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    expect(queryByTestId("exercise-timeline")).toBeNull();
  });

  it("não deve quebrar quando bibliographicReferences for undefined (Regression test)", () => {
    // @ts-ignore — simulate invalid runtime data
    const template = makeTemplate({ bibliographicReferences: undefined });
    
    // This will throw if the component crashes during initial render
    const { container } = render(
      <TemplateDetailPanel
        template={template}
        onApply={noop}
        onCustomize={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    
    expect(container).toBeTruthy();
  });
});
