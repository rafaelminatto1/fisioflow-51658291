/**
 * Templates de automação do WhatsApp (Meta Cloud API).
 *
 * Definições centrais dos 4 templates usados pelos fluxos automáticos portados do
 * Inngest morto (ver [[project-crm-transversal-p1-jun2026]]). Cada um tem {{1}} =
 * primeiro nome do paciente. O registro na Meta é feito via
 * `POST /api/whatsapp/inbox/templates/automation/register`; a APROVAÇÃO é
 * assíncrona (lado da Meta). Enquanto não aprovados + com o gate
 * `settings.crm_whatsapp.automations_enabled` ligado, os fluxos NÃO enviam.
 */
export type AutomationTemplate = {
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  body: string;
};

export type AutomationTemplateKey =
  | "boas_vindas_paciente"
  | "feedback_atendimento"
  | "lembrete_exercicios_v1"
  | "avaliacao_google";

export const AUTOMATION_TEMPLATES: Record<AutomationTemplateKey, AutomationTemplate> = {
  // Já existe APROVADO na Meta como MARKETING e SEM variáveis. Espelhamos aqui
  // (0 vars) para que o envio não mande parâmetros que a Meta rejeitaria.
  boas_vindas_paciente: {
    name: "boas_vindas_paciente",
    language: "pt_BR",
    category: "MARKETING",
    body:
      "Olá! Seja bem-vindo(a) à nossa clínica. É um prazer ter você conosco. " +
      "Nossa equipe está pronta para cuidar de você. Em caso de dúvidas, basta responder a esta mensagem!",
  },
  feedback_atendimento: {
    name: "feedback_atendimento",
    language: "pt_BR",
    category: "UTILITY",
    body:
      "Olá {{1}}! Como foi o seu atendimento hoje na Activity Fisioterapia? " +
      "Sua opinião nos ajuda a melhorar — responda esta mensagem com o que achou. 🙏",
  },
  lembrete_exercicios_v1: {
    name: "lembrete_exercicios_v1",
    language: "pt_BR",
    category: "UTILITY",
    body:
      "Oi {{1}}! 💪 Passando para lembrar dos seus exercícios em casa. " +
      "Manter a constância acelera sua recuperação. Conte com a gente se precisar!",
  },
  avaliacao_google: {
    name: "avaliacao_google",
    language: "pt_BR",
    category: "MARKETING",
    body:
      "Olá {{1}}! Que bom ter você na Activity Fisioterapia. 🌟 " +
      "Se estiver gostando do acompanhamento, uma avaliação no Google nos ajudaria muito. Obrigado!",
  },
};

/** Número de variáveis {{n}} no corpo do template. */
export function templateVarCount(body: string): number {
  const matches = body.match(/\{\{\s*\d+\s*\}\}/g);
  return matches ? new Set(matches).size : 0;
}

export type TemplateComponent = {
  type: string;
  text?: string;
  example?: { body_text?: string[][] };
};

export type TemplateRegistrationPayload = {
  name: string;
  category: string;
  language: string;
  components: TemplateComponent[];
};

/**
 * Monta o payload para `POST /{WABA}/message_templates`. A Meta exige
 * `example.body_text` quando o corpo tem variáveis.
 */
export function automationTemplatePayload(t: AutomationTemplate): TemplateRegistrationPayload {
  const varCount = templateVarCount(t.body);
  const body: TemplateComponent = { type: "BODY", text: t.body };
  if (varCount > 0) {
    body.example = { body_text: [Array.from({ length: varCount }, () => "Maria")] };
  }
  return {
    name: t.name,
    category: t.category,
    language: t.language,
    components: [body],
  };
}
