import { describe, it, expect } from "vitest";
import {
  AUTOMATION_TEMPLATES,
  automationTemplatePayload,
  templateVarCount,
  type AutomationTemplate,
} from "../whatsappAutomationTemplates";

describe("whatsappAutomationTemplates", () => {
  it("define os 4 templates de automação com os nomes esperados pelos fluxos", () => {
    expect(AUTOMATION_TEMPLATES.boas_vindas_paciente.name).toBe("boas_vindas_paciente");
    expect(AUTOMATION_TEMPLATES.feedback_atendimento.name).toBe("feedback_atendimento");
    expect(AUTOMATION_TEMPLATES.lembrete_exercicios_v1.name).toBe("lembrete_exercicios_v1");
    expect(AUTOMATION_TEMPLATES.avaliacao_google.name).toBe("avaliacao_google");
  });

  it("todos usam pt_BR", () => {
    for (const t of Object.values(AUTOMATION_TEMPLATES) as AutomationTemplate[]) {
      expect(t.language).toBe("pt_BR");
    }
  });

  it("boas_vindas_paciente tem 0 variáveis; os demais têm 1 (espelha os templates aprovados na Meta)", () => {
    expect(templateVarCount(AUTOMATION_TEMPLATES.boas_vindas_paciente.body)).toBe(0);
    expect(templateVarCount(AUTOMATION_TEMPLATES.feedback_atendimento.body)).toBe(1);
    expect(templateVarCount(AUTOMATION_TEMPLATES.lembrete_exercicios_v1.body)).toBe(1);
    expect(templateVarCount(AUTOMATION_TEMPLATES.avaliacao_google.body)).toBe(1);
  });

  it("o payload de registro inclui example.body_text quando o corpo tem variável (exigência da Meta)", () => {
    const payload = automationTemplatePayload(AUTOMATION_TEMPLATES.feedback_atendimento);
    expect(payload.name).toBe("feedback_atendimento");
    expect(payload.language).toBe("pt_BR");
    const body = payload.components.find((c) => c.type === "BODY");
    expect(body?.text).toContain("{{1}}");
    expect(body?.example?.body_text?.[0]?.length).toBe(1);
  });
});
