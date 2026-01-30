import { useState, useCallback } from 'react';
import { logger } from '@/lib/errors/logger';

// Interfaces para o Chatbot
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'quick_reply' | 'appointment' | 'exercise' | 'medication' | 'emergency';
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: Array<{ type: string; value: string; confidence: number }>;
    suggestions?: string[];
    attachments?: ChatAttachment[];
  };
}

interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'exercise_plan' | 'appointment_card';
  url: string;
  name: string;
  size?: number;
  thumbnail?: string;
}

interface QuickReply {
  id: string;
  text: string;
  payload: string;
  icon?: string;
}

interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  messages: ChatMessage[];
  context: ChatContext;
  status: 'active' | 'ended' | 'transferred';
  satisfaction?: number;
  tags: string[];
}

interface ChatContext {
  patientId?: string;
  currentSymptoms?: string[];
  recentAppointments?: Array<{ id: string; date: string; type: string }>;
  activeTreatments?: Array<{ name: string; startDate: string }>;
  medications?: Array<{ name: string; dosage: string }>;
  emergencyContacts?: Array<{ name: string; phone: string; relationship: string }>;
  preferredLanguage: string;
  accessibilityNeeds?: string[];
}

interface BotResponse {
  message: string;
  quickReplies?: QuickReply[];
  suggestions?: string[];
  confidence: number;
  intent: string;
  requiresHumanHandoff?: boolean;
  followUpActions?: string[];
}

interface MedicalKnowledge {
  symptoms: Record<string, SymptomInfo>;
  treatments: Record<string, TreatmentInfo>;
  exercises: Record<string, ExerciseInfo>;
  medications: Record<string, MedicationInfo>;
  emergencyKeywords: string[];
}

interface SymptomInfo {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'emergency';
  commonCauses: string[];
  recommendations: string[];
  whenToSeekHelp: string[];
  relatedSymptoms: string[];
}

interface TreatmentInfo {
  name: string;
  description: string;
  duration: string;
  frequency: string;
  precautions: string[];
  contraindications: string[];
  expectedOutcomes: string[];
}

interface ExerciseInfo {
  name: string;
  description: string;
  instructions: string[];
  duration: string;
  repetitions: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetAreas: string[];
  precautions: string[];
  videoUrl?: string;
}

interface MedicationInfo {
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  sideEffects: string[];
  interactions: string[];
  precautions: string[];
  storageInstructions: string;
}

// Mock data para conhecimento médico
const mockMedicalKnowledge: MedicalKnowledge = {
  symptoms: {
    'dor_nas_costas': {
      name: 'Dor nas Costas',
      description: 'Desconforto ou dor na região lombar, torácica ou cervical',
      severity: 'medium',
      commonCauses: ['Má postura', 'Esforço excessivo', 'Sedentarismo', 'Hérnia de disco'],
      recommendations: [
        'Aplicar compressas mornas',
        'Fazer alongamentos suaves',
        'Manter boa postura',
        'Evitar carregar peso excessivo'
      ],
      whenToSeekHelp: [
        'Dor intensa que não melhora com repouso',
        'Dormência ou formigamento nas pernas',
        'Dificuldade para caminhar',
        'Febre associada à dor'
      ],
      relatedSymptoms: ['rigidez_muscular', 'dor_irradiada', 'espasmo_muscular']
    },
    'dor_no_joelho': {
      name: 'Dor no Joelho',
      description: 'Desconforto ou dor na articulação do joelho',
      severity: 'medium',
      commonCauses: ['Lesão ligamentar', 'Artrite', 'Sobrecarga', 'Desgaste articular'],
      recommendations: [
        'Aplicar gelo nas primeiras 48h',
        'Elevar a perna quando possível',
        'Evitar atividades que causem dor',
        'Usar calçados adequados'
      ],
      whenToSeekHelp: [
        'Inchaço significativo',
        'Impossibilidade de apoiar o peso',
        'Deformidade visível',
        'Dor intensa e persistente'
      ],
      relatedSymptoms: ['inchaço', 'rigidez', 'instabilidade']
    }
  },
  treatments: {
    'fisioterapia_lombar': {
      name: 'Fisioterapia Lombar',
      description: 'Tratamento para dores e disfunções da região lombar',
      duration: '4-8 semanas',
      frequency: '2-3 vezes por semana',
      precautions: ['Não forçar movimentos dolorosos', 'Comunicar qualquer piora'],
      contraindications: ['Fratura vertebral', 'Infecção ativa', 'Tumor'],
      expectedOutcomes: ['Redução da dor', 'Melhora da mobilidade', 'Fortalecimento muscular']
    }
  },
  exercises: {
    'alongamento_lombar': {
      name: 'Alongamento Lombar',
      description: 'Exercício para relaxar e alongar a musculatura lombar',
      instructions: [
        'Deite-se de costas',
        'Traga os joelhos ao peito',
        'Mantenha por 30 segundos',
        'Repita 3 vezes'
      ],
      duration: '5-10 minutos',
      repetitions: '3 séries de 30 segundos',
      difficulty: 'beginner',
      targetAreas: ['Lombar', 'Glúteos', 'Quadril'],
      precautions: ['Não force o movimento', 'Pare se sentir dor']
    }
  },
  medications: {
    'ibuprofeno': {
      name: 'Ibuprofeno',
      genericName: 'Ibuprofeno',
      dosage: '400-600mg',
      frequency: 'A cada 6-8 horas',
      sideEffects: ['Dor de estômago', 'Náusea', 'Tontura'],
      interactions: ['Anticoagulantes', 'Corticoides'],
      precautions: ['Tomar com alimentos', 'Não exceder dose máxima'],
      storageInstructions: 'Manter em local seco e arejado'
    }
  },
  emergencyKeywords: [
    'emergência', 'urgente', 'socorro', 'dor intensa', 'não consigo respirar',
    'desmaiei', 'sangramento', 'fratura', 'acidente', 'infarto', 'avc'
  ]
};

// Respostas pré-definidas
const predefinedResponses = {
  greeting: [
    'Olá! Sou o assistente virtual da FisioFlow. Como posso ajudá-lo hoje?',
    'Oi! Estou aqui para ajudar com suas dúvidas sobre fisioterapia e saúde.',
    'Bem-vindo! Sou seu assistente de saúde virtual. Em que posso ajudar?'
  ],
  appointment: [
    'Posso ajudá-lo a agendar uma consulta. Que tipo de atendimento você precisa?',
    'Vou verificar os horários disponíveis para você. Qual sua preferência de data?'
  ],
  exercise: [
    'Tenho várias opções de exercícios. Qual região do corpo você gostaria de trabalhar?',
    'Posso sugerir exercícios personalizados. Me conte sobre sua condição atual.'
  ],
  emergency: [
    'Percebo que pode ser uma situação urgente. Recomendo procurar atendimento médico imediatamente.',
    'Em caso de emergência, ligue 192 (SAMU) ou procure o hospital mais próximo.'
  ],
  unknown: [
    'Desculpe, não entendi completamente. Pode reformular sua pergunta?',
    'Não tenho certeza sobre isso. Gostaria de falar com um de nossos fisioterapeutas?',
    'Essa é uma pergunta interessante. Vou conectá-lo com um especialista.'
  ]
};

export const useMedicalChatbot = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [context, setContext] = useState<ChatContext>({
    preferredLanguage: 'pt-BR'
  });
  const isConnected = true;
  const [humanHandoffRequested, setHumanHandoffRequested] = useState(false);

  // Inicializar sessão de chat
  const startChatSession = useCallback((userId: string, patientContext?: Partial<ChatContext>) => {
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      userId,
      startTime: new Date(),
      messages: [],
      context: { ...context, ...patientContext },
      status: 'active',
      tags: []
    };

    setCurrentSession(session);
    setMessages([]);
    setHumanHandoffRequested(false);

    // Mensagem de boas-vindas
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: predefinedResponses.greeting[Math.floor(Math.random() * predefinedResponses.greeting.length)],
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 1.0,
        intent: 'greeting'
      }
    };

    setMessages([welcomeMessage]);
    
    // Quick replies iniciais
    setQuickReplies([
      { id: 'appointment', text: 'Agendar consulta', payload: 'schedule_appointment', icon: '📅' },
      { id: 'exercises', text: 'Ver exercícios', payload: 'show_exercises', icon: '🏃‍♂️' },
      { id: 'symptoms', text: 'Relatar sintomas', payload: 'report_symptoms', icon: '🩺' },
      { id: 'help', text: 'Ajuda', payload: 'help', icon: '❓' }
    ]);

    return session.id;
  }, [context]);

  // Processar mensagem do usuário
  const processUserMessage = useCallback(async (content: string, type: 'text' | 'quick_reply' = 'text') => {
    if (!currentSession) return;

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content,
      sender: 'user',
      timestamp: new Date(),
      type
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    try {
      const botResponse = await generateBotResponse(content, context);
      
      const botMessage: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        content: botResponse.message,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: botResponse.confidence,
          intent: botResponse.intent,
          suggestions: botResponse.suggestions
        }
      };

      setMessages(prev => [...prev, botMessage]);
      
      if (botResponse.quickReplies) {
        setQuickReplies(botResponse.quickReplies);
      }

      if (botResponse.requiresHumanHandoff) {
        setHumanHandoffRequested(true);
      }

    } catch {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        content: 'Desculpe, ocorreu um erro. Tente novamente em alguns instantes.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: 0,
          intent: 'error'
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [currentSession, context]);

  // Gerar resposta do bot
  const generateBotResponse = async (userInput: string, _chatContext: ChatContext): Promise<BotResponse> => {
    const input = userInput.toLowerCase().trim();
    
    // Detectar emergência
    const isEmergency = mockMedicalKnowledge.emergencyKeywords.some(keyword => 
      input.includes(keyword.toLowerCase())
    );

    if (isEmergency) {
      return {
        message: predefinedResponses.emergency[0],
        confidence: 0.95,
        intent: 'emergency',
        requiresHumanHandoff: true,
        quickReplies: [
          { id: 'call_emergency', text: 'Ligar 192', payload: 'call_192', icon: '🚨' },
          { id: 'find_hospital', text: 'Hospital próximo', payload: 'find_hospital', icon: '🏥' }
        ]
      };
    }

    // Detectar intenções
    if (input.includes('agendar') || input.includes('consulta') || input.includes('horário')) {
      return {
        message: 'Vou ajudá-lo a agendar uma consulta. Qual tipo de atendimento você precisa?',
        confidence: 0.9,
        intent: 'schedule_appointment',
        quickReplies: [
          { id: 'fisio_general', text: 'Fisioterapia Geral', payload: 'schedule_general', icon: '🏃‍♂️' },
          { id: 'fisio_ortopedic', text: 'Ortopédica', payload: 'schedule_orthopedic', icon: '🦴' },
          { id: 'fisio_neuro', text: 'Neurológica', payload: 'schedule_neuro', icon: '🧠' },
          { id: 'evaluation', text: 'Avaliação', payload: 'schedule_evaluation', icon: '📋' }
        ]
      };
    }

    if (input.includes('exercício') || input.includes('alongamento') || input.includes('treino')) {
      return {
        message: 'Posso sugerir exercícios personalizados. Qual região você gostaria de trabalhar?',
        confidence: 0.85,
        intent: 'show_exercises',
        quickReplies: [
          { id: 'back_exercises', text: 'Coluna/Lombar', payload: 'exercises_back', icon: '🔄' },
          { id: 'knee_exercises', text: 'Joelho', payload: 'exercises_knee', icon: '🦵' },
          { id: 'shoulder_exercises', text: 'Ombro', payload: 'exercises_shoulder', icon: '💪' },
          { id: 'general_exercises', text: 'Geral', payload: 'exercises_general', icon: '🏃‍♂️' }
        ]
      };
    }

    if (input.includes('dor') || input.includes('sintoma') || input.includes('sinto')) {
      let symptomResponse = 'Me conte mais sobre seus sintomas. Onde você sente dor?';
      let confidence = 0.8;
      
      // Verificar sintomas específicos
      if (input.includes('costas') || input.includes('lombar')) {
        const symptom = mockMedicalKnowledge.symptoms['dor_nas_costas'];
        symptomResponse = `Entendo que você está com ${symptom.name.toLowerCase()}. ${symptom.description}. Algumas recomendações iniciais: ${symptom.recommendations.slice(0, 2).join(', ')}.`;
        confidence = 0.9;
      } else if (input.includes('joelho')) {
        const symptom = mockMedicalKnowledge.symptoms['dor_no_joelho'];
        symptomResponse = `${symptom.description}. Recomendações: ${symptom.recommendations.slice(0, 2).join(', ')}.`;
        confidence = 0.9;
      }

      return {
        message: symptomResponse,
        confidence,
        intent: 'report_symptoms',
        quickReplies: [
          { id: 'mild_pain', text: 'Dor leve', payload: 'pain_mild', icon: '😐' },
          { id: 'moderate_pain', text: 'Dor moderada', payload: 'pain_moderate', icon: '😣' },
          { id: 'severe_pain', text: 'Dor intensa', payload: 'pain_severe', icon: '😰' },
          { id: 'schedule_consult', text: 'Agendar consulta', payload: 'schedule_appointment', icon: '📅' }
        ]
      };
    }

    if (input.includes('medicamento') || input.includes('remédio') || input.includes('medicação')) {
      return {
        message: 'Não posso prescrever medicamentos, mas posso dar informações gerais. Para prescrições, consulte um médico ou fisioterapeuta.',
        confidence: 0.9,
        intent: 'medication_info',
        requiresHumanHandoff: true,
        quickReplies: [
          { id: 'schedule_doctor', text: 'Agendar consulta', payload: 'schedule_appointment', icon: '👨‍⚕️' },
          { id: 'general_info', text: 'Informações gerais', payload: 'medication_general', icon: 'ℹ️' }
        ]
      };
    }

    if (input.includes('olá') || input.includes('oi') || input.includes('bom dia') || input.includes('boa tarde')) {
      return {
        message: predefinedResponses.greeting[Math.floor(Math.random() * predefinedResponses.greeting.length)],
        confidence: 0.95,
        intent: 'greeting',
        quickReplies: [
          { id: 'appointment', text: 'Agendar consulta', payload: 'schedule_appointment', icon: '📅' },
          { id: 'exercises', text: 'Ver exercícios', payload: 'show_exercises', icon: '🏃‍♂️' },
          { id: 'symptoms', text: 'Relatar sintomas', payload: 'report_symptoms', icon: '🩺' }
        ]
      };
    }

    // Resposta padrão para entradas não reconhecidas
    return {
      message: predefinedResponses.unknown[Math.floor(Math.random() * predefinedResponses.unknown.length)],
      confidence: 0.3,
      intent: 'unknown',
      requiresHumanHandoff: input.length > 50, // Transferir para humano se a mensagem for muito complexa
      quickReplies: [
        { id: 'human_help', text: 'Falar com especialista', payload: 'request_human', icon: '👨‍⚕️' },
        { id: 'try_again', text: 'Tentar novamente', payload: 'try_again', icon: '🔄' }
      ]
    };
  };

  // Solicitar transferência para humano
  const requestHumanHandoff = useCallback(() => {
    setHumanHandoffRequested(true);
    
    const handoffMessage: ChatMessage = {
      id: `msg-${Date.now()}-handoff`,
      content: 'Entendi que você precisa de ajuda especializada. Vou conectá-lo com um de nossos fisioterapeutas. Aguarde um momento.',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 1.0,
        intent: 'human_handoff'
      }
    };

    setMessages(prev => [...prev, handoffMessage]);
    setQuickReplies([]);
  }, []);

  // Finalizar sessão
  const endChatSession = useCallback((satisfaction?: number) => {
    if (currentSession) {
      const updatedSession: ChatSession = {
        ...currentSession,
        endTime: new Date(),
        status: 'ended',
        satisfaction,
        messages
      };

      setCurrentSession(updatedSession);
      
      // Salvar sessão (mock)
      logger.info('Sessão finalizada', updatedSession, 'useMedicalChatbot');
    }
  }, [currentSession, messages]);

  // Limpar chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setQuickReplies([]);
    setHumanHandoffRequested(false);
  }, []);

  // Exportar conversa
  const exportChat = useCallback(() => {
    if (!currentSession) return null;

    const chatExport = {
      session: currentSession,
      messages,
      exportedAt: new Date()
    };

    return JSON.stringify(chatExport, null, 2);
  }, [currentSession, messages]);

  // Avaliar satisfação
  const rateSatisfaction = useCallback((rating: number) => {
    if (currentSession) {
      setCurrentSession(prev => prev ? { ...prev, satisfaction: rating } : null);
      
      const thankYouMessage: ChatMessage = {
        id: `msg-${Date.now()}-thanks`,
        content: `Obrigado pela sua avaliação! Sua opinião é muito importante para melhorarmos nosso atendimento.`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: 1.0,
          intent: 'satisfaction_rating'
        }
      };

      setMessages(prev => [...prev, thankYouMessage]);
    }
  }, [currentSession]);

  // Buscar histórico de conversas
  const getChatHistory = useCallback((_userId: string, _limit: number = 10) => {
    // Mock - em produção, buscar do backend
    return [];
  }, []);

  // Obter sugestões de perguntas frequentes
  const getFrequentQuestions = useCallback(() => {
    return [
      'Como agendar uma consulta?',
      'Quais exercícios posso fazer em casa?',
      'Como tratar dor nas costas?',
      'Quando devo procurar um fisioterapeuta?',
      'Como funciona a fisioterapia?',
      'Quais são os horários de atendimento?'
    ];
  }, []);

  return {
    // Estado
    currentSession,
    messages,
    isTyping,
    quickReplies,
    context,
    isConnected,
    humanHandoffRequested,
    
    // Ações
    startChatSession,
    processUserMessage,
    requestHumanHandoff,
    endChatSession,
    clearChat,
    rateSatisfaction,
    
    // Utilitários
    exportChat,
    getChatHistory,
    getFrequentQuestions,
    
    // Configurações
    setContext
  };
};

// Utility functions
export const formatChatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getChatDuration = (startTime: Date, endTime?: Date): string => {
  const end = endTime || new Date();
  const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000 / 60);
  
  if (duration < 1) return 'menos de 1 minuto';
  if (duration === 1) return '1 minuto';
  if (duration < 60) return `${duration} minutos`;
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours === 1 && minutes === 0) return '1 hora';
  if (hours === 1) return `1 hora e ${minutes} minutos`;
  if (minutes === 0) return `${hours} horas`;
  
  return `${hours} horas e ${minutes} minutos`;
};

export const getMessageTypeIcon = (type: ChatMessage['type']): string => {
  switch (type) {
    case 'appointment': return '📅';
    case 'exercise': return '🏃‍♂️';
    case 'medication': return '💊';
    case 'emergency': return '🚨';
    case 'quick_reply': return '⚡';
    default: return '💬';
  }
};

export const getSatisfactionEmoji = (rating: number): string => {
  if (rating <= 1) return '😞';
  if (rating <= 2) return '😐';
  if (rating <= 3) return '🙂';
  if (rating <= 4) return '😊';
  return '😍';
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};