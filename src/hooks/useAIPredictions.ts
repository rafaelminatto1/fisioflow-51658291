import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastAppointment?: Date;
  noShowHistory: number;
  totalAppointments: number;
  avgResponseTime: number; // em horas
  preferredTime: string;
  daysSinceLastVisit: number;
}

interface AppointmentPrediction {
  appointmentId: string;
  patientId: string;
  patientName: string;
  appointmentDate: Date;
  appointmentTime: string;
  noShowProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendedActions: string[];
  confidence: number;
}

interface AIInsight {
  id: string;
  type: 'prediction' | 'optimization' | 'alert' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  createdAt: Date;
  data?: any;
}

// Simulação de algoritmo de ML para previsão de no-show
const calculateNoShowProbability = (patient: Patient, appointmentDate: Date): number => {
  let probability = 0.1; // Base probability

  // Histórico de no-show (peso: 40%)
  const noShowRate = patient.noShowHistory / patient.totalAppointments;
  probability += noShowRate * 0.4;

  // Tempo desde última consulta (peso: 20%)
  if (patient.daysSinceLastVisit > 90) probability += 0.2;
  else if (patient.daysSinceLastVisit > 30) probability += 0.1;

  // Dia da semana (peso: 15%)
  const dayOfWeek = appointmentDate.getDay();
  if (dayOfWeek === 1) probability += 0.15; // Segunda-feira
  else if (dayOfWeek === 6) probability += 0.1; // Sábado

  // Horário do agendamento (peso: 15%)
  const hour = appointmentDate.getHours();
  if (hour < 9 || hour > 17) probability += 0.15; // Fora do horário comercial

  // Tempo de resposta médio (peso: 10%)
  if (patient.avgResponseTime > 24) probability += 0.1;

  return Math.min(probability, 0.95); // Cap at 95%
};

const getRiskLevel = (probability: number): 'low' | 'medium' | 'high' => {
  if (probability >= 0.7) return 'high';
  if (probability >= 0.4) return 'medium';
  return 'low';
};

const generateRecommendedActions = (prediction: AppointmentPrediction): string[] => {
  const actions: string[] = [];

  if (prediction.riskLevel === 'high') {
    actions.push('Ligar para confirmar agendamento');
    actions.push('Enviar SMS de lembrete 24h antes');
    actions.push('Oferecer reagendamento se necessário');
  } else if (prediction.riskLevel === 'medium') {
    actions.push('Enviar WhatsApp de confirmação');
    actions.push('SMS de lembrete 2h antes');
  } else {
    actions.push('Email de lembrete 24h antes');
  }

  return actions;
};

const generateRiskFactors = (patient: Patient, probability: number): string[] => {
  const factors: string[] = [];

  const noShowRate = patient.noShowHistory / patient.totalAppointments;
  if (noShowRate > 0.3) factors.push(`Histórico: ${Math.round(noShowRate * 100)}% de faltas`);
  if (patient.daysSinceLastVisit > 60) factors.push(`${patient.daysSinceLastVisit} dias desde última visita`);
  if (patient.avgResponseTime > 24) factors.push('Baixa responsividade a mensagens');

  return factors;
};

// Mock data para demonstração
const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    phone: '(11) 99999-1111',
    email: 'maria@email.com',
    noShowHistory: 3,
    totalAppointments: 15,
    avgResponseTime: 12,
    preferredTime: '14:00',
    daysSinceLastVisit: 45
  },
  {
    id: '2',
    name: 'João Santos',
    phone: '(11) 99999-2222',
    email: 'joao@email.com',
    noShowHistory: 8,
    totalAppointments: 20,
    avgResponseTime: 36,
    preferredTime: '09:00',
    daysSinceLastVisit: 120
  },
  {
    id: '3',
    name: 'Ana Costa',
    phone: '(11) 99999-3333',
    email: 'ana@email.com',
    noShowHistory: 1,
    totalAppointments: 25,
    avgResponseTime: 8,
    preferredTime: '16:00',
    daysSinceLastVisit: 15
  }
];

const generateMockAppointments = (): AppointmentPrediction[] => {
  const appointments: AppointmentPrediction[] = [];
  const today = new Date();

  mockPatients.forEach((patient, index) => {
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + index);
    appointmentDate.setHours(9 + (index * 2), 0, 0, 0);

    const probability = calculateNoShowProbability(patient, appointmentDate);
    const riskLevel = getRiskLevel(probability);
    const factors = generateRiskFactors(patient, probability);

    const prediction: AppointmentPrediction = {
      appointmentId: `apt-${index + 1}`,
      patientId: patient.id,
      patientName: patient.name,
      appointmentDate,
      appointmentTime: appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      noShowProbability: probability,
      riskLevel,
      factors,
      recommendedActions: [],
      confidence: 0.85 + (Math.random() * 0.1) // 85-95% confidence
    };

    prediction.recommendedActions = generateRecommendedActions(prediction);
    appointments.push(prediction);
  });

  return appointments;
};

export const useAIPredictions = () => {
  const [predictions, setPredictions] = useState<AppointmentPrediction[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(0.87); // 87% accuracy

  // Simula carregamento de predições
  useEffect(() => {
    const loadPredictions = async () => {
      setIsLoading(true);
      
      // Simula delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockPredictions = generateMockAppointments();
      setPredictions(mockPredictions);
      
      // Gera insights baseados nas predições
      const generatedInsights = generateInsights(mockPredictions);
      setInsights(generatedInsights);
      
      setIsLoading(false);
    };

    loadPredictions();

    // Atualiza predições a cada 5 minutos
    const interval = setInterval(loadPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const generateInsights = (predictions: AppointmentPrediction[]): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Insight sobre alto risco
    const highRiskCount = predictions.filter(p => p.riskLevel === 'high').length;
    if (highRiskCount > 0) {
      insights.push({
        id: 'high-risk-alert',
        type: 'alert',
        title: 'Pacientes de Alto Risco Detectados',
        description: `${highRiskCount} paciente(s) com alta probabilidade de no-show hoje`,
        priority: 'high',
        actionable: true,
        createdAt: new Date(),
        data: { count: highRiskCount }
      });
    }

    // Insight sobre otimização
    const avgProbability = predictions.reduce((sum, p) => sum + p.noShowProbability, 0) / predictions.length;
    if (avgProbability > 0.3) {
      insights.push({
        id: 'optimization-opportunity',
        type: 'optimization',
        title: 'Oportunidade de Otimização',
        description: 'Taxa de no-show prevista acima da média. Considere ajustar estratégia de confirmação.',
        priority: 'medium',
        actionable: true,
        createdAt: new Date(),
        data: { avgProbability }
      });
    }

    // Insight sobre precisão do modelo
    insights.push({
      id: 'model-accuracy',
      type: 'prediction',
      title: 'Precisão do Modelo IA',
      description: `Modelo atual com ${Math.round(accuracy * 100)}% de precisão nas predições`,
      priority: 'low',
      actionable: false,
      createdAt: new Date(),
      data: { accuracy }
    });

    return insights;
  };

  const getPredictionsByRisk = (riskLevel: 'low' | 'medium' | 'high') => {
    return predictions.filter(p => p.riskLevel === riskLevel);
  };

  const getHighRiskPredictions = () => getPredictionsByRisk('high');
  const getMediumRiskPredictions = () => getPredictionsByRisk('medium');
  const getLowRiskPredictions = () => getPredictionsByRisk('low');

  const getTodayPredictions = () => {
    const today = new Date();
    return predictions.filter(p => {
      const predDate = new Date(p.appointmentDate);
      return predDate.toDateString() === today.toDateString();
    });
  };

  const getAverageNoShowProbability = () => {
    if (predictions.length === 0) return 0;
    return predictions.reduce((sum, p) => sum + p.noShowProbability, 0) / predictions.length;
  };

  const markPredictionAsActioned = (appointmentId: string) => {
    setPredictions(prev => 
      prev.map(p => 
        p.appointmentId === appointmentId 
          ? { ...p, recommendedActions: [] }
          : p
      )
    );
  };

  return {
    predictions,
    insights,
    isLoading,
    accuracy,
    getPredictionsByRisk,
    getHighRiskPredictions,
    getMediumRiskPredictions,
    getLowRiskPredictions,
    getTodayPredictions,
    getAverageNoShowProbability,
    markPredictionAsActioned
  };
};

export type { AppointmentPrediction, AIInsight, Patient };