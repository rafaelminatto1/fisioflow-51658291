/**
 * Testes de propriedade para TemplateCreateFlow
 * Feature: exercise-templates-refactor
 *
 * Property 12: Validação de campos obrigatórios no formulário de criação
 * Validates: Requirements 4.3
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { z } from "zod";
import type { ExerciseTemplate, PatientProfileCategory } from "@/types/workers";

// ─── Zod schema (extraído de TemplateCreateFlow.tsx) ─────────────────────────

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  patientProfile: z.enum(
    ["ortopedico", "esportivo", "pos_operatorio", "prevencao", "idosos"],
    { error: "Perfil de paciente é obrigatório" },
  ),
  conditionName: z.string().trim().min(1, "Condição clínica é obrigatória"),
  templateVariant: z.string().optional(),
  items: z.array(z.any()).default([]),
  clinicalNotes: z.string().optional(),
  contraindications: z.string().optional(),
  precautions: z.string().optional(),
  progressionNotes: z.string().optional(),
  evidenceLevel: z.enum(["A", "B", "C", "D"]).optional(),
  bibliographicReferences: z.string().optional(),
});

type CreateTemplateInput = z.input<typeof createTemplateSchema>;

function validateCreateTemplate(input: unknown) {
  return createTemplateSchema.safeParse(input);
}

// ─── Arbitrary generators ────────────────────────────────────────────────────

const arbitraryNonBlankString = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const arbitraryBlankString = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.replace(/\S/g, " ")),
  fc.constant("   "),
  fc.constant("\t"),
  fc.constant("\n"),
  fc.constant("  \t  \n  "),
);

const arbitraryPatientProfile = fc.constantFrom(
  "ortopedico" as const,
  "esportivo" as const,
  "pos_operatorio" as const,
  "prevencao" as const,
  "idosos" as const,
);

function arbitraryValidInput(): fc.Arbitrary<CreateTemplateInput> {
  return fc.record({
    name: arbitraryNonBlankString,
    patientProfile: arbitraryPatientProfile,
    conditionName: arbitraryNonBlankString,
    templateVariant: fc.option(fc.string(), { nil: undefined }),
    items: fc.constant([]),
    clinicalNotes: fc.option(fc.string(), { nil: undefined }),
    contraindications: fc.option(fc.string(), { nil: undefined }),
    precautions: fc.option(fc.string(), { nil: undefined }),
    progressionNotes: fc.option(fc.string(), { nil: undefined }),
    evidenceLevel: fc.option(
      fc.constantFrom("A" as const, "B" as const, "C" as const, "D" as const),
      { nil: undefined },
    ),
    bibliographicReferences: fc.option(fc.string(), { nil: undefined }),
  });
}

// ─── Property 12 ─────────────────────────────────────────────────────────────

// Feature: exercise-templates-refactor, Property 12: Validação de campos obrigatórios no formulário de criação
describe("Property 12: Validação de campos obrigatórios no formulário de criação", () => {
  it(
    "Property 12a: qualquer combinação válida de name, patientProfile e conditionName passa na validação",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(arbitraryValidInput(), (input) => {
          const result = validateCreateTemplate(input);
          return result.success === true;
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12b: name ausente ou em branco deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(
          arbitraryBlankString,
          arbitraryPatientProfile,
          arbitraryNonBlankString,
          (blankName, patientProfile, conditionName) => {
            const result = validateCreateTemplate({ name: blankName, patientProfile, conditionName });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12c: conditionName ausente ou em branco deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(
          arbitraryNonBlankString,
          arbitraryPatientProfile,
          arbitraryBlankString,
          (name, patientProfile, blankCondition) => {
            const result = validateCreateTemplate({ name, patientProfile, conditionName: blankCondition });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12d: patientProfile ausente deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(
          arbitraryNonBlankString,
          arbitraryNonBlankString,
          (name, conditionName) => {
            const result = validateCreateTemplate({ name, conditionName });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12e: patientProfile com valor fora do enum deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      const validProfiles = new Set(["ortopedico", "esportivo", "pos_operatorio", "prevencao", "idosos"]);
      fc.assert(
        fc.property(
          arbitraryNonBlankString,
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !validProfiles.has(s)),
          arbitraryNonBlankString,
          (name, invalidProfile, conditionName) => {
            const result = validateCreateTemplate({ name, patientProfile: invalidProfile, conditionName });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12f: name e conditionName ambos em branco deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(
          arbitraryBlankString,
          arbitraryPatientProfile,
          arbitraryBlankString,
          (blankName, patientProfile, blankCondition) => {
            const result = validateCreateTemplate({ name: blankName, patientProfile, conditionName: blankCondition });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "Property 12g: todos os campos obrigatórios ausentes deve rejeitar a submissão",
    () => {
      // Validates: Requirements 4.3
      fc.assert(
        fc.property(
          arbitraryBlankString,
          arbitraryBlankString,
          (blankName, blankCondition) => {
            const result = validateCreateTemplate({ name: blankName, conditionName: blankCondition });
            return result.success === false;
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ─── Testes unitários complementares (schema) ─────────────────────────────────

describe("createTemplateSchema — testes unitários", () => {
  it("aceita input mínimo válido com os três campos obrigatórios", () => {
    const result = validateCreateTemplate({
      name: "Protocolo Lombalgia",
      patientProfile: "ortopedico",
      conditionName: "Lombalgia crônica",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita name vazio", () => {
    const result = validateCreateTemplate({ name: "", patientProfile: "ortopedico", conditionName: "Lombalgia crônica" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === "name")).toBeDefined();
    }
  });

  it("rejeita name composto apenas de espaços", () => {
    const result = validateCreateTemplate({ name: "   ", patientProfile: "ortopedico", conditionName: "Lombalgia crônica" });
    expect(result.success).toBe(false);
  });

  it("rejeita conditionName vazio", () => {
    const result = validateCreateTemplate({ name: "Protocolo Lombalgia", patientProfile: "ortopedico", conditionName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === "conditionName")).toBeDefined();
    }
  });

  it("rejeita conditionName composto apenas de espaços", () => {
    const result = validateCreateTemplate({ name: "Protocolo Lombalgia", patientProfile: "ortopedico", conditionName: "  \t  " });
    expect(result.success).toBe(false);
  });

  it("rejeita patientProfile ausente", () => {
    const result = validateCreateTemplate({ name: "Protocolo Lombalgia", conditionName: "Lombalgia crônica" });
    expect(result.success).toBe(false);
  });

  it("rejeita patientProfile com valor inválido", () => {
    const result = validateCreateTemplate({ name: "Protocolo Lombalgia", patientProfile: "invalido", conditionName: "Lombalgia crônica" });
    expect(result.success).toBe(false);
  });

  it("aceita todos os valores válidos de patientProfile", () => {
    for (const profile of ["ortopedico", "esportivo", "pos_operatorio", "prevencao", "idosos"]) {
      const result = validateCreateTemplate({ name: "Template Teste", patientProfile: profile, conditionName: "Condição Teste" });
      expect(result.success, `perfil '${profile}' deve ser aceito`).toBe(true);
    }
  });

  it("campos opcionais não afetam a validação dos obrigatórios", () => {
    const result = validateCreateTemplate({
      name: "Template Completo",
      patientProfile: "esportivo",
      conditionName: "Entorse de tornozelo",
      templateVariant: "Progressivo",
      clinicalNotes: "Notas clínicas",
      contraindications: "Nenhuma",
      precautions: "Cuidado com carga",
      progressionNotes: "Aumentar carga semanalmente",
      evidenceLevel: "A",
      bibliographicReferences: "Autor et al. (2023)",
    });
    expect(result.success).toBe(true);
  });

  it("trim é aplicado: name com espaços ao redor de texto válido é aceito", () => {
    const result = validateCreateTemplate({
      name: "  Protocolo Lombalgia  ",
      patientProfile: "ortopedico",
      conditionName: "  Lombalgia crônica  ",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Lógica pura: shouldShowWeekFields ───────────────────────────────────────
// Feature: exercise-templates-refactor, Unit Test: shouldShowWeekFields

/**
 * Reproduz a lógica `isPosOperatorio` do TemplateCreateFlow:
 * campos de semana (weekStart/weekEnd) só aparecem para 'pos_operatorio'.
 */
function shouldShowWeekFields(patientProfile: PatientProfileCategory | null | undefined): boolean {
  return patientProfile === "pos_operatorio";
}

// ─── Lógica pura: buildPreFillValues ─────────────────────────────────────────
// Feature: exercise-templates-refactor, Unit Test: buildPreFillValues

interface PreFillValues {
  name: string;
  patientProfile: PatientProfileCategory | undefined;
  conditionName: string;
  templateVariant: string;
  clinicalNotes: string;
  contraindications: string;
  precautions: string;
  progressionNotes: string;
  evidenceLevel: "A" | "B" | "C" | "D" | undefined;
  bibliographicReferences: string;
  items: [];
}

/**
 * Reproduz o bloco `reset({ ... })` do useEffect de modo "personalizar"
 * em TemplateCreateFlow.tsx.
 */
function buildPreFillValues(sourceTemplate: ExerciseTemplate): PreFillValues {
  return {
    name: `${sourceTemplate.name} (Personalizado)`,
    patientProfile: sourceTemplate.patientProfile ?? undefined,
    conditionName: sourceTemplate.conditionName ?? "",
    templateVariant: sourceTemplate.templateVariant ?? "",
    clinicalNotes: sourceTemplate.clinicalNotes ?? "",
    contraindications: sourceTemplate.contraindications ?? "",
    precautions: sourceTemplate.precautions ?? "",
    progressionNotes: sourceTemplate.progressionNotes ?? "",
    evidenceLevel: sourceTemplate.evidenceLevel ?? undefined,
    bibliographicReferences: (sourceTemplate.bibliographicReferences ?? []).join("\n"),
    items: [],
  };
}

function makeTemplate(overrides: Partial<ExerciseTemplate> = {}): ExerciseTemplate {
  return {
    id: "tpl-1",
    name: "Protocolo Lombalgia",
    description: null,
    category: null,
    conditionName: "Lombalgia crônica",
    templateVariant: "Conservador",
    clinicalNotes: "Notas clínicas",
    contraindications: "Nenhuma",
    precautions: "Cuidado com carga",
    progressionNotes: "Aumentar carga semanalmente",
    evidenceLevel: "A",
    bibliographicReferences: [],
    isActive: true,
    isPublic: false,
    organizationId: "org-1",
    createdBy: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    templateType: "system",
    patientProfile: "ortopedico",
    sourceTemplateId: null,
    isDraft: false,
    exerciseCount: 5,
    ...overrides,
  };
}

// ─── Unit Tests: shouldShowWeekFields ────────────────────────────────────────

// Feature: exercise-templates-refactor, Unit Test: campos de semana visíveis apenas para pos_operatorio
describe("shouldShowWeekFields — campos de semana aparecem apenas para pos_operatorio", () => {
  // Validates: Requirements 4.6

  it("retorna true para 'pos_operatorio'", () => {
    expect(shouldShowWeekFields("pos_operatorio")).toBe(true);
  });

  it("retorna false para 'ortopedico'", () => {
    expect(shouldShowWeekFields("ortopedico")).toBe(false);
  });

  it("retorna false para 'esportivo'", () => {
    expect(shouldShowWeekFields("esportivo")).toBe(false);
  });

  it("retorna false para 'prevencao'", () => {
    expect(shouldShowWeekFields("prevencao")).toBe(false);
  });

  it("retorna false para 'idosos'", () => {
    expect(shouldShowWeekFields("idosos")).toBe(false);
  });

  it("retorna false para null", () => {
    expect(shouldShowWeekFields(null)).toBe(false);
  });

  it("retorna false para undefined", () => {
    expect(shouldShowWeekFields(undefined)).toBe(false);
  });
});

// ─── Unit Tests: buildPreFillValues ──────────────────────────────────────────

// Feature: exercise-templates-refactor, Unit Test: modo personalizar pré-preenche campos corretamente
describe("buildPreFillValues — modo personalizar pré-preenche campos corretamente", () => {
  // Validates: Requirements 5.2

  it("adiciona sufixo '(Personalizado)' ao nome", () => {
    const values = buildPreFillValues(makeTemplate({ name: "Protocolo Lombalgia" }));
    expect(values.name).toBe("Protocolo Lombalgia (Personalizado)");
  });

  it("copia patientProfile do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ patientProfile: "esportivo" }));
    expect(values.patientProfile).toBe("esportivo");
  });

  it("converte patientProfile null para undefined", () => {
    const values = buildPreFillValues(makeTemplate({ patientProfile: null }));
    expect(values.patientProfile).toBeUndefined();
  });

  it("copia conditionName do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ conditionName: "Entorse de tornozelo" }));
    expect(values.conditionName).toBe("Entorse de tornozelo");
  });

  it("converte conditionName null para string vazia", () => {
    const values = buildPreFillValues(makeTemplate({ conditionName: null }));
    expect(values.conditionName).toBe("");
  });

  it("copia templateVariant do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ templateVariant: "Progressivo" }));
    expect(values.templateVariant).toBe("Progressivo");
  });

  it("converte templateVariant null para string vazia", () => {
    const values = buildPreFillValues(makeTemplate({ templateVariant: null }));
    expect(values.templateVariant).toBe("");
  });

  it("copia clinicalNotes do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ clinicalNotes: "Observações importantes" }));
    expect(values.clinicalNotes).toBe("Observações importantes");
  });

  it("copia contraindications do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ contraindications: "Fratura recente" }));
    expect(values.contraindications).toBe("Fratura recente");
  });

  it("copia precautions do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ precautions: "Evitar impacto" }));
    expect(values.precautions).toBe("Evitar impacto");
  });

  it("copia progressionNotes do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ progressionNotes: "Aumentar carga na semana 3" }));
    expect(values.progressionNotes).toBe("Aumentar carga na semana 3");
  });

  it("copia evidenceLevel do template fonte", () => {
    const values = buildPreFillValues(makeTemplate({ evidenceLevel: "B" }));
    expect(values.evidenceLevel).toBe("B");
  });

  it("converte evidenceLevel null para undefined", () => {
    const values = buildPreFillValues(makeTemplate({ evidenceLevel: null }));
    expect(values.evidenceLevel).toBeUndefined();
  });

  it("junta bibliographicReferences com '\\n' quando há múltiplas referências", () => {
    const tpl = makeTemplate({
      bibliographicReferences: [
        "Autor A et al. (2023). Artigo 1.",
        "Autor B et al. (2022). Artigo 2.",
        "Autor C et al. (2021). Artigo 3.",
      ],
    });
    expect(buildPreFillValues(tpl).bibliographicReferences).toBe(
      "Autor A et al. (2023). Artigo 1.\nAutor B et al. (2022). Artigo 2.\nAutor C et al. (2021). Artigo 3.",
    );
  });

  it("retorna string vazia para bibliographicReferences vazio", () => {
    const values = buildPreFillValues(makeTemplate({ bibliographicReferences: [] }));
    expect(values.bibliographicReferences).toBe("");
  });

  it("retorna a referência sem '\\n' quando há apenas uma", () => {
    const tpl = makeTemplate({ bibliographicReferences: ["Autor A et al. (2023). Artigo único."] });
    expect(buildPreFillValues(tpl).bibliographicReferences).toBe("Autor A et al. (2023). Artigo único.");
  });

  it("items sempre começa vazio (exercícios não são copiados)", () => {
    const values = buildPreFillValues(makeTemplate({ exerciseCount: 10 }));
    expect(values.items).toEqual([]);
  });
});
