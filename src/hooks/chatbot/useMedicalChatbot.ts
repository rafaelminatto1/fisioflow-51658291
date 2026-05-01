import { useCallback } from "react";
import { useChatSession } from "./useChatSession";

export function useMedicalChatbot() {
  const session = useChatSession();

  const exportChat = useCallback(() => {
    if (!session.currentSession) return null;
    const chatExport = {
      session: session.currentSession,
      messages: session.messages,
      exportedAt: new Date(),
    };
    return JSON.stringify(chatExport, null, 2);
  }, [session.currentSession, session.messages]);

  const getChatHistory = useCallback((_userId: string, _limit: number = 10) => {
    return [];
  }, []);

  const getFrequentQuestions = useCallback(() => {
    return [
      "Como agendar uma consulta?",
      "Quais exercícios posso fazer em casa?",
      "Como tratar dor nas costas?",
      "Quando devo procurar um fisioterapeuta?",
      "Como funciona a fisioterapia?",
      "Quais são os horários de atendimento?",
    ];
  }, []);

  return {
    ...session,
    isConnected: true,
    exportChat,
    getChatHistory,
    getFrequentQuestions,
  };
}
