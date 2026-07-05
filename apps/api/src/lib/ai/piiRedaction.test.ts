import { describe, it, expect } from "vitest";
import { redactPII, replacePatientName } from "./piiRedaction";

describe("PII Redaction", () => {
  it("should remove CPF", () => {
    const { text, redactedEntities } = redactPII("O paciente de CPF 123.456.789-00 relatou dor.");
    expect(text).toBe("O paciente de CPF [CPF REMOVIDO] relatou dor.");
    expect(redactedEntities).toContain("CPF");
  });

  it("should remove Phone (Telefone)", () => {
    const { text, redactedEntities } = redactPII("Ligar para 11 98765-4321 amanhã.");
    expect(text).toBe("Ligar para [TELEFONE REMOVIDO] amanhã.");
    expect(redactedEntities).toContain("TELEFONE");
  });

  it("should remove Email", () => {
    const { text, redactedEntities } = redactPII("Contato: rafael@exemplo.com.br urgente.");
    expect(text).toBe("Contato: [EMAIL REMOVIDO] urgente.");
    expect(redactedEntities).toContain("EMAIL");
  });

  it("should replace Patient Name", () => {
    const text = "O Rafael Minatto está melhor. Minatto relatou alívio.";
    const sanitized = replacePatientName(text, "Rafael Minatto");
    expect(sanitized).toBe("O Paciente está melhor. Paciente relatou alívio.");
  });

  it("should handle multiple PIIs in same text", () => {
    const raw = "João Silva, CPF 111.222.333-44, telefone 11999999999 e email joao@email.com.";
    const withoutName = replacePatientName(raw, "João Silva", "Paciente");
    const { text, redactedEntities } = redactPII(withoutName);
    
    expect(text).toBe("Paciente, CPF [CPF REMOVIDO], telefone [TELEFONE REMOVIDO] e email [EMAIL REMOVIDO].");
    expect(redactedEntities).toContain("CPF");
    expect(redactedEntities).toContain("TELEFONE");
    expect(redactedEntities).toContain("EMAIL");
  });
});
