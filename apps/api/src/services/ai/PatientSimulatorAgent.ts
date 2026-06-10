import { z } from "zod";
import { callAI } from "../../lib/ai/callAI";
import type { Env } from "../../types/env";

export interface SimulatorProfile {
  age: number;
  painLevel: number; // 0-10
  motivationLevel: "high" | "medium" | "low";
  condition: string;
  personaTraits: string[];
}

export interface SimulationResult {
  simulatedMessage: string;
  internalThoughtProcess: string;
  safetyTriggered: boolean;
}

export interface SimulationEvaluationResult {
  score: number;
  gradeLabel: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missedQuestions: string[];
  clinicalReasoningFeedback: string;
  nextTrainingFocus: string[];
}

const SimulationSchema = z.object({
  simulatedMessage: z.string(),
  internalThoughtProcess: z.string(),
  safetyTriggered: z.boolean(),
});

const SimulationEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  gradeLabel: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missedQuestions: z.array(z.string()),
  clinicalReasoningFeedback: z.string(),
  nextTrainingFocus: z.array(z.string()),
});

const FALLBACK: SimulationResult = {
  simulatedMessage: "Desculpe, não consegui processar a resposta do simulador.",
  internalThoughtProcess: "Fallback — AI unavailable.",
  safetyTriggered: false,
};

const EVALUATION_FALLBACK: SimulationEvaluationResult = {
  score: 50,
  gradeLabel: "Avaliação parcial",
  summary: "Não foi possível gerar uma avaliação completa da simulação.",
  strengths: ["A conversa foi registrada para revisão manual."],
  weaknesses: ["A avaliação automática não ficou disponível neste momento."],
  missedQuestions: [
    "Revisar manualmente perguntas sobre dor, função, histórico e sinais de alerta.",
  ],
  clinicalReasoningFeedback:
    "Use uma estrutura de anamnese: queixa principal, comportamento dos sintomas, fatores de melhora/piora, função, histórico e red flags.",
  nextTrainingFocus: [
    "Completar anamnese",
    "Explorar funcionalidade",
    "Investigar sinais de alerta",
  ],
};

export class PatientSimulatorAgent {
  constructor(private env: Env) {}

  public async generateSimulatedResponse(
    profile: SimulatorProfile,
    chatHistory: { role: string; content: string }[],
    clinicianLastMessage: string,
  ): Promise<SimulationResult> {
    const prompt = `You are a Patient Simulator for a physiotherapy application.
Your task is to play the role of a patient interacting with a physiotherapist during a clinical evaluation training session.
You MUST stay in character and respond exactly as this patient would.

PATIENT PROFILE:
- Age: ${profile.age}
- Condition: ${profile.condition}
- Current Pain Level: ${profile.painLevel}/10
- Motivation: ${profile.motivationLevel}
- Personality Traits: ${profile.personaTraits.join(", ")}

CHAT HISTORY SUMMARY:
${chatHistory
  .slice(-4)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}

ROLE MAP:
- USER = physiotherapist
- ASSISTANT = simulated patient

LATEST MESSAGE FROM PHYSIOTHERAPIST:
"${clinicianLastMessage}"

INSTRUCTIONS:
1. Generate the patient's next response to the physiotherapist.
2. If pain is > 7, the patient should express significant discomfort or reluctance.
3. If motivation is low, the patient might make excuses or express doubt.
4. Include an 'internalThoughtProcess' explaining why the simulator chose this response based on the profile.
5. Set 'safetyTriggered' to true ONLY IF the physiotherapist's last message instructed the patient to do something that seems dangerous given their current pain level, otherwise false.

Retorne SOMENTE JSON válido neste formato:
{
  "simulatedMessage": "resposta do paciente",
  "internalThoughtProcess": "raciocínio interno do simulador",
  "safetyTriggered": false
}`;

    try {
      const aiResult = await callAI(this.env, {
        task: "patient-simulator",
        prompt,
        organizationId: "system",
      });

      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return FALLBACK;

      const parsed = SimulationSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parsed.success) {
        console.error("[PatientSimulatorAgent] Schema validation failed:", parsed.error.issues);
        return FALLBACK;
      }

      return parsed.data;
    } catch (error) {
      console.error("[PatientSimulatorAgent] Error generating simulation:", error);
      return FALLBACK;
    }
  }

  public async evaluateClinicalPerformance(
    profile: SimulatorProfile,
    chatHistory: { role: string; content: string }[],
  ): Promise<SimulationEvaluationResult> {
    const prompt = `Você é um avaliador sênior de raciocínio clínico em fisioterapia.
Analise a atuação do fisioterapeuta nesta simulação de atendimento e retorne SOMENTE JSON válido.

PERFIL DO PACIENTE SIMULADO:
- Idade: ${profile.age}
- Condição/queixa: ${profile.condition}
- Dor atual: ${profile.painLevel}/10
- Motivação: ${profile.motivationLevel}
- Traços de persona: ${profile.personaTraits.join(", ")}

CONVERSA:
${chatHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

MAPA DE PAPÉIS:
- USER = fisioterapeuta
- ASSISTANT = paciente simulado

CRITÉRIOS DE AVALIAÇÃO:
1. Organização da anamnese e progressão das perguntas.
2. Investigação de dor, comportamento dos sintomas, função, limitações e objetivos.
3. Busca por sinais de alerta e fatores de risco.
4. Clareza, empatia, linguagem profissional e condução segura.
5. Formulação de hipóteses e próximos passos de avaliação física.

Retorne JSON neste formato exato:
{
  "score": 0-100,
  "gradeLabel": "ótimo|bom|regular|insuficiente",
  "summary": "síntese objetiva do desempenho",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2"],
  "missedQuestions": ["pergunta importante que faltou"],
  "clinicalReasoningFeedback": "feedback técnico sobre raciocínio clínico",
  "nextTrainingFocus": ["foco de treino 1", "foco de treino 2"]
}`;

    try {
      const aiResult = await callAI(this.env, {
        task: "patient-simulator",
        prompt,
        organizationId: "system",
        responseFormat: "json",
        maxTokens: 1600,
      });

      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return EVALUATION_FALLBACK;

      const parsed = SimulationEvaluationSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parsed.success) {
        console.error(
          "[PatientSimulatorAgent] Evaluation schema validation failed:",
          parsed.error.issues,
        );
        return EVALUATION_FALLBACK;
      }

      return parsed.data;
    } catch (error) {
      console.error("[PatientSimulatorAgent] Error evaluating simulation:", error);
      return EVALUATION_FALLBACK;
    }
  }
}
