import { useState, useCallback } from "react";
import { ChatSession, ChatMessage, QuickReply, ChatContext } from "./types";
import { predefinedResponses } from "./constants";
import { useChatLogic } from "./useChatLogic";
import { fisioLogger as logger } from "@/lib/errors/logger";

export function useChatSession() {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [context, setContext] = useState<ChatContext>({ preferredLanguage: "pt-BR" });
  const [humanHandoffRequested, setHumanHandoffRequested] = useState(false);

  const { generateBotResponse } = useChatLogic();

  const startChatSession = useCallback((userId: string, patientContext?: Partial<ChatContext>) => {
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      userId,
      startTime: new Date(),
      messages: [],
      context: { ...context, ...patientContext },
      status: "active",
      tags: [],
    };

    setCurrentSession(session);
    setMessages([]);
    setHumanHandoffRequested(false);

    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: predefinedResponses.greeting[Math.floor(Math.random() * predefinedResponses.greeting.length)],
      sender: "bot",
      timestamp: new Date(),
      type: "text",
      metadata: { confidence: 1.0, intent: "greeting" },
    };

    setMessages([welcomeMessage]);
    setQuickReplies([
      { id: "appointment", text: "Agendar consulta", payload: "schedule_appointment", icon: "📅" },
      { id: "exercises", text: "Ver exercícios", payload: "show_exercises", icon: "🏃‍♂️" },
      { id: "symptoms", text: "Relatar sintomas", payload: "report_symptoms", icon: "🩺" },
      { id: "help", text: "Ajuda", payload: "help", icon: "❓" },
    ]);

    return session.id;
  }, [context]);

  const processUserMessage = useCallback(async (content: string, type: "text" | "quick_reply" = "text") => {
    if (!currentSession) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content,
      sender: "user",
      timestamp: new Date(),
      type,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    try {
      const botResponse = await generateBotResponse(content, context);

      const botMessage: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        content: botResponse.message,
        sender: "bot",
        timestamp: new Date(),
        type: "text",
        metadata: {
          confidence: botResponse.confidence,
          intent: botResponse.intent,
          suggestions: botResponse.suggestions,
        },
      };

      setMessages((prev) => [...prev, botMessage]);
      if (botResponse.quickReplies) setQuickReplies(botResponse.quickReplies);
      if (botResponse.requiresHumanHandoff) setHumanHandoffRequested(true);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        content: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes.",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
        metadata: { confidence: 0, intent: "error" },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [currentSession, context, generateBotResponse]);

  const requestHumanHandoff = useCallback(() => {
    setHumanHandoffRequested(true);
    const handoffMessage: ChatMessage = {
      id: `msg-${Date.now()}-handoff`,
      content: "Entendi que você precisa de ajuda especializada. Vou conectá-lo com um de nossos fisioterapeutas. Aguarde um momento.",
      sender: "bot",
      timestamp: new Date(),
      type: "text",
      metadata: { confidence: 1.0, intent: "human_handoff" },
    };
    setMessages((prev) => [...prev, handoffMessage]);
    setQuickReplies([]);
  }, []);

  const endChatSession = useCallback((satisfaction?: number) => {
    if (currentSession) {
      const updatedSession: ChatSession = {
        ...currentSession,
        endTime: new Date(),
        status: "ended",
        satisfaction,
        messages,
      };
      setCurrentSession(updatedSession);
      logger.info("Sessão finalizada", updatedSession, "useMedicalChatbot");
    }
  }, [currentSession, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setQuickReplies([]);
    setHumanHandoffRequested(false);
  }, []);

  const rateSatisfaction = useCallback((rating: number) => {
    if (currentSession) {
      setCurrentSession((prev) => (prev ? { ...prev, satisfaction: rating } : null));
      const thankYouMessage: ChatMessage = {
        id: `msg-${Date.now()}-thanks`,
        content: `Obrigado pela sua avaliação! Sua opinião é muito importante para melhorarmos nosso atendimento.`,
        sender: "bot",
        timestamp: new Date(),
        type: "text",
        metadata: { confidence: 1.0, intent: "satisfaction_rating" },
      };
      setMessages((prev) => [...prev, thankYouMessage]);
    }
  }, [currentSession]);

  return {
    currentSession,
    messages,
    isTyping,
    quickReplies,
    context,
    humanHandoffRequested,
    startChatSession,
    processUserMessage,
    requestHumanHandoff,
    endChatSession,
    clearChat,
    rateSatisfaction,
    setContext,
  };
}
