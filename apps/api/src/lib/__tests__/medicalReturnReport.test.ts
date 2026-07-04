import { describe, it, expect } from "vitest";
import {
  buildMedicalReportVariables,
  buildMedicalReportText,
  formatReturnDateBr,
} from "../medicalReturnReport";

const ctx = {
  doctorName: "Eduardo Souza",
  therapistName: "Rafael Minatto",
  patientName: "Maria Silva",
  returnDate: "2026-08-10",
  attachmentUrl: "https://media.moocafisio.com.br/x.pdf",
};

describe("buildMedicalReportVariables", () => {
  it("monta as 5 variáveis do template na ordem", () => {
    expect(buildMedicalReportVariables(ctx)).toEqual([
      "Eduardo Souza",
      "Rafael Minatto",
      "Maria Silva",
      "10/08/2026",
      "https://media.moocafisio.com.br/x.pdf",
    ]);
  });

  it("usa fallbacks para data e anexo ausentes", () => {
    const vars = buildMedicalReportVariables({ ...ctx, returnDate: null, attachmentUrl: null });
    expect(vars[3]).toBe("data a confirmar");
    expect(vars[4]).toBe("segue em anexo");
  });
});

describe("formatReturnDateBr", () => {
  it("converte ISO date para dd/MM/yyyy sem depender de timezone", () => {
    expect(formatReturnDateBr("2026-01-02")).toBe("02/01/2026");
    expect(formatReturnDateBr("2026-01-02T00:00:00.000Z")).toBe("02/01/2026");
  });
});

describe("buildMedicalReportText", () => {
  it("gera o texto padrão com Sou Dr(a). {fisioterapeuta}", () => {
    const text = buildMedicalReportText(ctx);
    expect(text).toBe(
      "Olá Dr(a). Eduardo Souza! Sou Dr(a). Rafael Minatto, fisioterapeuta do(a) paciente Maria Silva. " +
        "Segue o relatório de fisioterapia referente ao retorno de 10/08/2026. " +
        "Pedido/relatório: https://media.moocafisio.com.br/x.pdf",
    );
  });
});
