import { BotResponse, ChatContext } from "./types";
import { mockMedicalKnowledge, predefinedResponses } from "./constants";

export function useChatLogic() {
  const generateBotResponse = async (
    userInput: string,
    _chatContext: ChatContext,
  ): Promise<BotResponse> => {
    const input = userInput.toLowerCase().trim();

    // Detectar emergência
    const isEmergency = mockMedicalKnowledge.emergencyKeywords.some((keyword) =>
      input.includes(keyword.toLowerCase()),
    );

    if (isEmergency) {
      return {
        message: predefinedResponses.emergency[0],
        confidence: 0.95,
        intent: "emergency",
        requiresHumanHandoff: true,
        quickReplies: [
          { id: "call_emergency", text: "Ligar 192", payload: "call_192", icon: "🚨" },
          { id: "find_hospital", text: "Hospital próximo", payload: "find_hospital", icon: "🏥" },
        ],
      };
    }

    // Detectar intenções
    if (input.includes("agendar") || input.includes("consulta") || input.includes("horário")) {
      return {
        message: "Vou ajudá-lo a agendar uma consulta. Qual tipo de atendimento você precisa?",
        confidence: 0.9,
        intent: "schedule_appointment",
        quickReplies: [
          { id: "fisio_general", text: "Fisioterapia Geral", payload: "schedule_general", icon: "🏃‍♂️" },
          { id: "fisio_ortopedic", text: "Ortopédica", payload: "schedule_orthopedic", icon: "🦴" },
          { id: "fisio_neuro", text: "Neurológica", payload: "schedule_neuro", icon: "🧠" },
          { id: "evaluation", text: "Avaliação", payload: "schedule_evaluation", icon: "📋" },
        ],
      };
    }

    if (input.includes("exercício") || input.includes("alongamento") || input.includes("treino")) {
      return {
        message: "Posso sugerir exercícios personalizados. Qual região você gostaria de trabalhar?",
        confidence: 0.85,
        intent: "show_exercises",
        quickReplies: [
          { id: "back_exercises", text: "Coluna/Lombar", payload: "exercises_back", icon: "🔄" },
          { id: "knee_exercises", text: "Joelho", payload: "exercises_knee", icon: "🦵" },
          { id: "shoulder_exercises", text: "Ombro", payload: "exercises_shoulder", icon: "💪" },
          { id: "general_exercises", text: "Geral", payload: "exercises_general", icon: "🏃‍♂️" },
        ],
      };
    }

    if (input.includes("dor") || input.includes("sintoma") || input.includes("sinto")) {
      let symptomResponse = "Me conte mais sobre seus sintomas. Onde você sente dor?";
      let confidence = 0.8;

      if (input.includes("costas") || input.includes("lombar")) {
        const symptom = mockMedicalKnowledge.symptoms["dor_nas_costas"];
        symptomResponse = `Entendo que você está com ${symptom.name.toLowerCase()}. ${symptom.description}. Algumas recomendações iniciais: ${symptom.recommendations.slice(0, 2).join(", ")}.`;
        confidence = 0.9;
      } else if (input.includes("joelho")) {
        const symptom = mockMedicalKnowledge.symptoms["dor_no_joelho"];
        symptomResponse = `${symptom.description}. Recomendações: ${symptom.recommendations.slice(0, 2).join(", ")}.`;
        confidence = 0.9;
      }

      return {
        message: symptomResponse,
        confidence,
        intent: "report_symptoms",
        quickReplies: [
          { id: "mild_pain", text: "Dor leve", payload: "pain_mild", icon: "😐" },
          { id: "moderate_pain", text: "Dor moderada", payload: "pain_moderate", icon: "😣" },
          { id: "severe_pain", text: "Dor intensa", payload: "pain_severe", icon: "😰" },
          { id: "schedule_consult", text: "Agendar consulta", payload: "schedule_appointment", icon: "📅" },
        ],
      };
    }

    if (input.includes("medicamento") || input.includes("remédio") || input.includes("medicação")) {
      return {
        message: "Não posso prescrever medicamentos, mas posso dar informações gerais. Para prescrições, consulte um médico ou fisioterapeuta.",
        confidence: 0.9,
        intent: "medication_info",
        requiresHumanHandoff: true,
        quickReplies: [
          { id: "schedule_doctor", text: "Agendar consulta", payload: "schedule_appointment", icon: "👨‍⚕️" },
          { id: "general_info", text: "Informações gerais", payload: "medication_general", icon: "ℹ️" },
        ],
      };
    }

    if (input.includes("olá") || input.includes("oi") || input.includes("bom dia") || input.includes("boa tarde")) {
      return {
        message: predefinedResponses.greeting[Math.floor(Math.random() * predefinedResponses.greeting.length)],
        confidence: 0.95,
        intent: "greeting",
        quickReplies: [
          { id: "appointment", text: "Agendar consulta", payload: "schedule_appointment", icon: "📅" },
          { id: "exercises", text: "Ver exercícios", payload: "show_exercises", icon: "🏃‍♂️" },
          { id: "symptoms", text: "Relatar sintomas", payload: "report_symptoms", icon: "🩺" },
        ],
      };
    }

    return {
      message: predefinedResponses.unknown[Math.floor(Math.random() * predefinedResponses.unknown.length)],
      confidence: 0.3,
      intent: "unknown",
      requiresHumanHandoff: input.length > 50,
      quickReplies: [
        { id: "human_help", text: "Falar com especialista", payload: "request_human", icon: "👨‍⚕️" },
        { id: "try_again", text: "Tentar novamente", payload: "try_again", icon: "🔄" },
      ],
    };
  };

  return { generateBotResponse };
}
