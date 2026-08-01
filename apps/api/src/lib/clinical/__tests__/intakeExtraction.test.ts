import { describe, it, expect } from "vitest";
import {
  extractIntakeFields,
  candidatosParaRevisao,
  cpfValido,
  CONFIANCA_MINIMA_REVISAO,
} from "../intakeExtraction";

const campo = (t: string, f: string) => extractIntakeFields(t).filter((c) => c.field === f);

describe("CPF", () => {
  it("valida pelo dígito verificador", () => {
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("52998224724")).toBe(false);
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  it("extrai CPF com e sem máscara", () => {
    for (const t of ["CPF: 529.982.247-25", "cpf 52998224725"]) {
      expect(campo(t, "cpf")[0]?.value).toBe("52998224725");
    }
  });

  it("descarta sequência de 11 dígitos que não é CPF", () => {
    expect(campo("Protocolo 12345678901", "cpf")).toHaveLength(0);
  });

  it("CPF válido tem a maior confiança — é o único campo com verificação interna", () => {
    const cpf = campo("CPF 529.982.247-25", "cpf")[0];
    const tel = campo("Telefone: (11) 98765-4321", "telefone")[0];
    expect(cpf.confidence).toBeGreaterThan(tel.confidence);
  });
});

describe("telefone", () => {
  it("extrai celular com DDD e normaliza", () => {
    expect(campo("Celular: (11) 98765-4321", "telefone")[0]?.value).toBe("11987654321");
  });

  it("rótulo antes do número aumenta a confiança", () => {
    const comRotulo = campo("Telefone: (11) 98765-4321", "telefone")[0];
    const solto = campo("anotação 11 98765-4321", "telefone")[0];
    expect(comRotulo.confidence).toBeGreaterThan(solto.confidence);
  });

  it("número sem DDD perde confiança — não dá para enviar mensagem", () => {
    const semDdd = campo("Tel: 98765-4321", "telefone")[0];
    const comDdd = campo("Tel: (11) 98765-4321", "telefone")[0];
    expect(semDdd.confidence).toBeLessThan(comDdd.confidence);
  });

  it("não confunde CPF válido com telefone", () => {
    // 11 dígitos casariam no padrão de telefone; o dígito verificador desempata.
    const t = "CPF: 529.982.247-25";
    expect(campo(t, "telefone")).toHaveLength(0);
    expect(campo(t, "cpf")).toHaveLength(1);
  });

  it("segundo número vira telefone_secundario", () => {
    const t = "Tel: (11) 98765-4321 / Recado: (11) 3333-4444";
    expect(campo(t, "telefone")).toHaveLength(1);
    expect(campo(t, "telefone_secundario")).toHaveLength(1);
  });

  it("não duplica o mesmo número repetido na ficha", () => {
    const t = "Tel (11) 98765-4321 — confirmar (11) 98765-4321";
    expect(extractIntakeFields(t).filter((c) => c.field.startsWith("telefone"))).toHaveLength(1);
  });
});

describe("data de nascimento", () => {
  it("normaliza para ISO e resolve ano de 2 dígitos", () => {
    expect(campo("Nasc: 07/03/85", "data_nascimento")[0]?.value).toBe("1985-03-07");
    expect(campo("Nasc: 07/03/1985", "data_nascimento")[0]?.value).toBe("1985-03-07");
  });

  it("descarta data implausível", () => {
    // Data no futuro ou anterior a 1900 é erro de leitura, não paciente longevo.
    expect(campo("32/13/1985", "data_nascimento")).toHaveLength(0);
    expect(campo("01/01/2099", "data_nascimento")).toHaveLength(0);
    expect(campo("01/01/1850", "data_nascimento")).toHaveLength(0);
  });
});

describe("outros campos", () => {
  it("extrai CEP e e-mail", () => {
    expect(campo("CEP 04567-000", "cep")[0]?.value).toBe("04567000");
    expect(campo("email: Joao.Silva@Gmail.com", "email")[0]?.value).toBe("joao.silva@gmail.com");
  });
});

describe("fila de revisão", () => {
  it("ordena por confiança e corta o ruído", () => {
    const t = "CPF 529.982.247-25 Telefone: (11) 98765-4321 anotação 3333-4444";
    const fila = candidatosParaRevisao(extractIntakeFields(t));
    expect(fila[0].field).toBe("cpf");
    for (const c of fila) expect(c.confidence).toBeGreaterThanOrEqual(CONFIANCA_MINIMA_REVISAO);
  });

  it("toda extração aponta para o trecho literal do OCR", () => {
    const t = "Paciente Maria — Telefone: (11) 98765-4321";
    for (const c of extractIntakeFields(t)) {
      expect(t.slice(c.sourceStart, c.sourceEnd)).toBe(c.sourceText);
    }
  });

  it("texto vazio ou curto não gera candidato", () => {
    for (const v of [null, undefined, "", "abc"]) {
      expect(extractIntakeFields(v)).toEqual([]);
    }
  });

  it("ficha sem dado de contato não inventa nada", () => {
    expect(extractIntakeFields("Paciente relata dor lombar ao caminhar.")).toEqual([]);
  });
});
