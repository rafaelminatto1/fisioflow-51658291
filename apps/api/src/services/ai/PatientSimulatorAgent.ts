import { z } from "zod";
import { callAI } from "../../lib/ai/callAI";
import type { Env } from "../../types/env";
import { Resource, ResourceSearchService } from "./ResourceSearchService";

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
  suggestedResources?: Resource[];
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
  internalThoughtProcess: z
    .string()
    .optional()
    .default("Resposta gerada sem raciocínio interno estruturado."),
  safetyTriggered: z.boolean().optional().default(false),
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

function buildLocalSimulatedResponse(
  profile: SimulatorProfile,
  chatHistory: { role: string; content: string }[],
  clinicianLastMessage: string,
): SimulationResult {
  const question = clinicianLastMessage.toLowerCase();
  const turn = chatHistory.filter((message) => message.role === "user").length;
  const safetyTriggered =
    profile.painLevel >= 7 &&
    /(correr|saltar|agachamento profundo|forçar|treino intenso|continuar mesmo com dor)/i.test(
      clinicianLastMessage,
    );

  let simulatedMessage: string;
  if (/quando|começou|início|inicio|tempo/.test(question)) {
    simulatedMessage = `Começou há cerca de duas semanas. Eu percebo mais quando subo escadas ou fico muito tempo sentado e depois levanto. A dor fica em torno de ${profile.painLevel}/10.`;
  } else if (/piora|melhora|escada|noite|deitar/.test(question)) {
    simulatedMessage =
      "Piora principalmente para subir escadas e levantar da cadeira. Melhora um pouco quando eu descanso e evito dobrar muito o joelho.";
  } else if (/trauma|febre|formig|perda de força|red flag|sinal de alerta|inchaço/.test(question)) {
    simulatedMessage =
      "Não tive febre, formigamento ou perda importante de força. Também não lembro de uma queda; foi aparecendo aos poucos.";
  } else if (/trabalho|rotina|atividade|func|limita|objetivo|esporte/.test(question)) {
    simulatedMessage =
      "Na rotina está atrapalhando escadas, caminhada mais longa e treino. Meu objetivo é voltar a me exercitar sem medo de piorar.";
  } else if (/dor|eva|escala|intensidade/.test(question)) {
    simulatedMessage = `Agora está ${profile.painLevel}/10, mas chega perto de ${Math.min(profile.painLevel + 2, 10)}/10 quando forço escada.`;
  } else if (turn >= 3) {
    simulatedMessage =
      "Acho que isso faz sentido. Eu só fico receoso de fazer exercício e piorar a dor, então queria entender o que é seguro para começar.";
  } else {
    simulatedMessage = `Sinto essa dor relacionada a ${profile.condition}. Ela aparece mais nos movimentos do dia a dia e me deixa um pouco inseguro para continuar treinando.`;
  }

  return {
    simulatedMessage,
    internalThoughtProcess:
      "Fallback local gerado a partir do perfil do paciente e da última pergunta clínica.",
    safetyTriggered,
  };
}

export class PatientSimulatorAgent {
  constructor(private env: Env) {}

  public async generateSimulatedResponse(
    profile: SimulatorProfile,
    chatHistory: { role: string; content: string }[],
    clinicianLastMessage: string,
    organizationId: string = "system",
  ): Promise<SimulationResult> {
    // 1. Detecção de intenção clínica (devemos sugerir recursos?)
    let suggestedResources: Resource[] = [];
    const lowerMessage = clinicianLastMessage.toLowerCase();
    const clinicalIntentPatterns = [
      "qual teste",
      "o que avaliar",
      "que exercicio",
      "qual exercício",
      "qual conduta",
      "que protocolo",
      "qual protocolo",
      "o que fazer",
    ];

    const hasClinicalIntent = clinicalIntentPatterns.some((p) => lowerMessage.includes(p));

    if (hasClinicalIntent) {
      try {
        const searchService = new ResourceSearchService(this.env);
        suggestedResources = await searchService.searchResources(
          clinicianLastMessage,
          organizationId,
          {
            patientCondition: profile.condition,
            painLevel: profile.painLevel,
          },
        );
      } catch (err) {
        console.warn("[PatientSimulator] Failed to fetch resources:", err);
      }
    }

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
        organizationId,
        responseFormat: "json",
        maxTokens: 800,
      });

      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      let result: SimulationResult;

      if (!jsonMatch) {
        const content = aiResult.content.trim();
        if (content) {
          result = {
            simulatedMessage: content,
            internalThoughtProcess: "Resposta textual aceita sem JSON estruturado.",
            safetyTriggered: false,
          };
        } else {
          result = FALLBACK;
        }
      } else {
        const parsed = SimulationSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!parsed.success) {
          console.error("[PatientSimulatorAgent] Schema validation failed:", parsed.error.issues);
          result = FALLBACK;
        } else {
          result = parsed.data;
        }
      }

      return { ...result, suggestedResources };
    } catch (error) {
      console.error("[PatientSimulatorAgent] Error generating simulation:", error);
      const local = buildLocalSimulatedResponse(profile, chatHistory, clinicianLastMessage);
      return { ...local, suggestedResources };
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
