import { Agent, callable } from "agents";
import type { Env } from "../types/env";

type RetentionState = {
  patientId: string;
  patientName: string;
  missedSessions: number;
  lastPainLevel: number;
  riskScore: number; // 0-100
  suggestedAction: string | null;
  draftMessage: string | null;
  status: "monitoring" | "at_risk" | "action_needed" | "recovered";
  settings: {
    autoDraft: boolean;
    sensitivity: "low" | "medium" | "high";
  };
};

/**
 * PatientAgent - Agente Autônomo de Retenção de Pacientes
 * Vive no Edge da Cloudflare e monitora o ciclo de vida do paciente usando Workers AI.
 */
export class PatientAgent extends Agent<Env, RetentionState> {
  initialState: RetentionState = {
    patientId: "",
    patientName: "",
    missedSessions: 0,
    lastPainLevel: 0,
    riskScore: 0,
    suggestedAction: null,
    draftMessage: null,
    status: "monitoring",
    settings: {
      autoDraft: true,
      sensitivity: "medium",
    },
  };

  /**
   * Atualiza o estado do paciente com novos dados clínicos/agenda
   */
  @callable()
  async updateClinicalStatus(data: { painLevel?: number; missedSession?: boolean; name?: string }) {
    let { missedSessions, lastPainLevel, status, patientName } = this.state;

    if (data.name) patientName = data.name;
    if (data.painLevel !== undefined) lastPainLevel = data.painLevel;
    if (data.missedSession) missedSessions += 1;

    // Lógica de Risco Baseada em Dados
    let riskScore = missedSessions * 30 + (lastPainLevel > 7 ? 20 : 0);
    riskScore = Math.min(100, riskScore);

    let nextStatus = status;
    if (riskScore > 70) nextStatus = "action_needed";
    else if (riskScore > 40) nextStatus = "at_risk";
    else nextStatus = "monitoring";

    this.setState({
      ...this.state,
      patientName,
      missedSessions,
      lastPainLevel,
      riskScore,
      status: nextStatus,
    });

    // Gatilho de Automação: Se o risco for alto e o autoDraft estiver ativo, gera o rascunho via Workers AI
    if (
      nextStatus === "action_needed" &&
      this.state.settings.autoDraft &&
      !this.state.draftMessage
    ) {
      await this.generateRetentionDraft();
    }

    return this.state;
  }

  /**
   * Gera um rascunho de mensagem de WhatsApp hiper-personalizado usando Workers AI (Llama 3.1)
   */
  @callable()
  async generateRetentionDraft() {
    this.setState({
      ...this.state,
      suggestedAction: "Gerando rascunho com Workers AI...",
    });

    try {
      // Uso do Workers AI nativo da Cloudflare (Llama 3.1 8B Instruct)
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content:
              "Você é um Agente de Retenção empático da clínica FisioFlow. Sua missão é reengajar pacientes em risco de evasão. Escreva em português do Brasil, de forma curta, acolhedora e profissional. Não use emojis em excesso.",
          },
          {
            role: "user",
            content: `Paciente: ${this.state.patientName}. Status: ${this.state.missedSessions} sessões faltadas. Último nível de dor: ${this.state.lastPainLevel}/10. Escreva uma mensagem de WhatsApp para incentivá-lo a retomar o tratamento.`,
          },
        ],
        max_tokens: 256,
        temperature: 0.7,
      });

      this.setState({
        ...this.state,
        draftMessage:
          response.response ||
          "Olá! Notamos sua ausência e gostaríamos de saber como você está se sentindo em relação à dor.",
        suggestedAction: "Rascunho pronto para revisão.",
      });
    } catch (error) {
      console.error("Erro Workers AI:", error);
      this.setState({
        ...this.state,
        suggestedAction: "Erro ao gerar rascunho. Tente novamente mais tarde.",
      });
    }
  }

  @callable()
  async dismissAction() {
    this.setState({
      ...this.state,
      status: "monitoring",
      missedSessions: 0,
      draftMessage: null,
      suggestedAction: null,
      riskScore: 0,
    });
  }
}
