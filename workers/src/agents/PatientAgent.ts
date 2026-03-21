import { Agent, routeAgentRequest, callable } from "agents";
import type { Env } from "../types/env";
import { callGemini } from "../lib/ai-gemini";

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
 * Vive no Edge da Cloudflare e monitora o ciclo de vida do paciente.
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
    }
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

    // Lógica de Risco Simplificada
    let riskScore = (missedSessions * 30) + (lastPainLevel > 7 ? 20 : 0);
    riskScore = Math.min(100, riskScore);

    let nextStatus = status;
    if (riskScore > 70) nextStatus = "action_needed";
    else if (riskScore > 40) nextStatus = "at_risk";
    else nextStatus = "monitoring";

    this.setState({ 
      patientName,
      missedSessions, 
      lastPainLevel, 
      riskScore, 
      status: nextStatus as any 
    });

    // Se o risco for alto e o autoDraft estiver ativo, gera o rascunho via IA
    if (nextStatus === "action_needed" && this.state.settings.autoDraft && !this.state.draftMessage) {
      await this.generateRetentionDraft();
    }

    return this.state;
  }

  /**
   * Gera um rascunho de mensagem de WhatsApp hiper-personalizado usando IA
   */
  @callable()
  async generateRetentionDraft() {
    this.setState({ suggestedAction: "Gerando rascunho via IA..." });

    const prompt = `Você é o Agente de Retenção da clínica Mooca Fisio. 
    Paciente: ${this.state.patientName}
    Status: ${this.state.missedSessions} sessões faltadas, nível de dor recente ${this.state.lastPainLevel}/10.
    Tarefa: Escreva uma mensagem curta, empática e profissional para o WhatsApp. 
    O objetivo é mostrar preocupação com a dor dele e incentivar o retorno ao tratamento.
    Não use emojis em excesso. Retorne apenas o texto da mensagem.`;

    try {
      const message = await callGemini(
        this.env.GOOGLE_AI_API_KEY, 
        prompt, 
        'gemini-1.5-flash',
        this.env.FISIOFLOW_AI_GATEWAY_URL
      );

      this.setState({ 
        draftMessage: message,
        suggestedAction: "Rascunho pronto para revisão."
      });
    } catch (e) {
      this.setState({ suggestedAction: "Erro ao gerar rascunho via IA." });
    }
  }

  @callable()
  async dismissAction() {
    this.setState({ 
      status: "monitoring", 
      missedSessions: 0, 
      draftMessage: null, 
      suggestedAction: null,
      riskScore: 0
    });
  }
}
