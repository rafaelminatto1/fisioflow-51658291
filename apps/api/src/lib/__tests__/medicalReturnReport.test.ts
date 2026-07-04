import { describe, it, expect } from "vitest";
import {
  buildMedicalReportVariables,
  buildMedicalReportText,
  formatReturnDateBr,
  normalizeGender,
  honorificName,
  patientReference,
} from "../medicalReturnReport";

const ctx = {
  doctorName: "Eduardo Souza",
  doctorGender: "M" as const,
  therapistName: "Ana Lima",
  therapistGender: "F" as const,
  patientName: "Maria Silva",
  patientGender: "F" as const,
  returnDate: "2026-08-10",
  attachmentUrl: "https://media.moocafisio.com.br/x.pdf",
};

describe("normalizeGender", () => {
  it("aceita M/F e masculino/feminino em qualquer caixa", () => {
    expect(normalizeGender("M")).toBe("M");
    expect(normalizeGender("f")).toBe("F");
    expect(normalizeGender("Masculino")).toBe("M");
    expect(normalizeGender("feminino")).toBe("F");
    expect(normalizeGender("outro")).toBe(null);
    expect(normalizeGender(null)).toBe(null);
  });
});

describe("honorificName / patientReference", () => {
  it("aplica Dr./Dra. e do/da conforme o gênero, com fallback neutro", () => {
    expect(honorificName("Rafael Minatto", "M")).toBe("Dr. Rafael Minatto");
    expect(honorificName("Ana Lima", "F")).toBe("Dra. Ana Lima");
    expect(honorificName("Alex", null)).toBe("Dr(a). Alex");
    expect(patientReference("João", "M")).toBe("do paciente João");
    expect(patientReference("Maria", "F")).toBe("da paciente Maria");
    expect(patientReference("Sam", null)).toBe("do(a) paciente Sam");
  });
});

describe("buildMedicalReportVariables", () => {
  it("monta as 5 variáveis com gênero embutido", () => {
    expect(buildMedicalReportVariables(ctx)).toEqual([
      "Dr. Eduardo Souza",
      "Dra. Ana Lima",
      "da paciente Maria Silva",
      "10/08/2026",
      "https://media.moocafisio.com.br/x.pdf",
    ]);
  });

  it("usa fallbacks para gênero, data e anexo ausentes", () => {
    const vars = buildMedicalReportVariables({
      doctorName: "Alex",
      therapistName: "Sam",
      patientName: "Chris",
      returnDate: null,
      attachmentUrl: null,
    });
    expect(vars).toEqual([
      "Dr(a). Alex",
      "Dr(a). Sam",
      "do(a) paciente Chris",
      "data a confirmar",
      "segue em anexo",
    ]);
  });
});

describe("formatReturnDateBr", () => {
  it("converte ISO date para dd/MM/yyyy sem depender de timezone", () => {
    expect(formatReturnDateBr("2026-01-02")).toBe("02/01/2026");
    expect(formatReturnDateBr("2026-01-02T00:00:00.000Z")).toBe("02/01/2026");
  });
});

describe("buildMedicalReportText", () => {
  it("gera o texto com tratamento correto por gênero", () => {
    expect(buildMedicalReportText(ctx)).toBe(
      "Olá Dr. Eduardo Souza! Sou Dra. Ana Lima, fisioterapeuta da paciente Maria Silva. " +
        "Segue o relatório de fisioterapia referente ao retorno de 10/08/2026. " +
        "Pedido/relatório: https://media.moocafisio.com.br/x.pdf. Fico à disposição!",
    );
  });
});
