import { describe, it, expect } from "vitest";

// Funções de validação extraídas da lógica da rota NFS-e
// (testadas isoladamente — sem dependências de banco ou HTTP)

function validateNfsePayload(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!payload.patient_id) errors.push("patient_id obrigatório");
  if (!payload.valor_servicos || Number(payload.valor_servicos) <= 0)
    errors.push("valor_servicos deve ser > 0");
  if (!payload.codigo_servico) errors.push("codigo_servico obrigatório");
  if (!payload.descricao) errors.push("descricao obrigatória");
  return errors;
}

function formatValorSemDecimal(valor: number): string {
  return Math.round(valor * 100).toString().padStart(15, "0");
}

function buildRpsNumber(lastRps: number): string {
  return String(lastRps + 1);
}

function calculateIssAmount(valorServicos: number, aliquota: number): number {
  return Math.round(valorServicos * aliquota * 100) / 100;
}

function isNfseConfigComplete(config: Record<string, unknown>): boolean {
  const required = ["cnpj", "razao_social", "inscricao_municipal", "codigo_servico"];
  return required.every((key) => !!config[key]);
}

describe("validateNfsePayload", () => {
  it("aceita payload completo e válido", () => {
    const errors = validateNfsePayload({
      patient_id: "uuid-paciente",
      valor_servicos: 150,
      codigo_servico: "04391",
      descricao: "Sessão de fisioterapia",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejeita valor negativo ou zero", () => {
    const errors = validateNfsePayload({
      patient_id: "uuid",
      valor_servicos: 0,
      codigo_servico: "04391",
      descricao: "Teste",
    });
    expect(errors).toContain("valor_servicos deve ser > 0");
  });

  it("rejeita valor negativo", () => {
    const errors = validateNfsePayload({
      patient_id: "uuid",
      valor_servicos: -100,
      codigo_servico: "04391",
      descricao: "Teste",
    });
    expect(errors).toContain("valor_servicos deve ser > 0");
  });

  it("lista todos os campos obrigatórios ausentes", () => {
    const errors = validateNfsePayload({});
    expect(errors).toContain("patient_id obrigatório");
    expect(errors).toContain("valor_servicos deve ser > 0");
    expect(errors).toContain("codigo_servico obrigatório");
    expect(errors).toContain("descricao obrigatória");
    expect(errors).toHaveLength(4);
  });
});

describe("formatValorSemDecimal", () => {
  it("converte 150.00 para 15 dígitos sem decimal", () => {
    expect(formatValorSemDecimal(150)).toBe("000000000015000");
  });

  it("converte 1.00 (nota de teste) corretamente", () => {
    expect(formatValorSemDecimal(1)).toBe("000000000000100");
  });

  it("arredonda corretamente para centavos", () => {
    expect(formatValorSemDecimal(150.5)).toBe("000000000015050");
  });
});

describe("calculateIssAmount", () => {
  it("calcula ISS com alíquota de 5%", () => {
    expect(calculateIssAmount(150, 0.05)).toBe(7.5);
  });

  it("calcula ISS com alíquota de 2%", () => {
    expect(calculateIssAmount(200, 0.02)).toBe(4);
  });

  it("retorna zero para valor zero", () => {
    expect(calculateIssAmount(0, 0.05)).toBe(0);
  });
});

describe("buildRpsNumber", () => {
  it("incrementa o último RPS em 1", () => {
    expect(buildRpsNumber(42)).toBe("43");
    expect(buildRpsNumber(0)).toBe("1");
  });
});

describe("isNfseConfigComplete", () => {
  it("config completa retorna true", () => {
    expect(
      isNfseConfigComplete({
        cnpj: "54836577000167",
        razao_social: "Mooca Fisioterapia",
        inscricao_municipal: "98765432",
        codigo_servico: "04391",
      })
    ).toBe(true);
  });

  it("config incompleta retorna false", () => {
    expect(isNfseConfigComplete({ cnpj: "54836577000167" })).toBe(false);
    expect(isNfseConfigComplete({})).toBe(false);
  });
});
