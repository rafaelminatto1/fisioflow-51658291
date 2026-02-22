/**
 * AI Scheduling Flow - Features de agendamento inteligente
 *
 * Fase 3: AI Scheduling Features
 */

import { z } from 'zod';
import { ai, gemini15Flash } from '../config';
import type { Appointment } from '../../types/models';
import { getFirestore } from 'firebase-admin/firestore';

// ============================================================================
// SCHEMAS
// ============================================================================

const SlotSuggestionSchema = z.object({
  date: z.string(),
  time: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  alternatives: z.array(z.object({
    date: z.string(),
    time: z.string(),
  })).default([]),
});

const CapacityOptimizationSchema = z.object({
  date: z.string(),
  currentCapacity: z.number(),
  recommendedCapacity: z.number(),
  reason: z.string(),
  expectedLoad: z.string(), // 'low', 'medium', 'high', 'overload'
});

const WaitlistPrioritySchema = z.object({
  waitlistEntryId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']),
  waitingDays: z.number(),
  score: z.number(),
  suggestedSlot: z.object({
    date: z.string(),
    time: z.string(),
  }).optional(),
});

// ============================================================================
// TOOLS
// ============================================================================

/**
 * Buscar histórico de agendamentos de um paciente
 */
export const getPatientAppointmentHistory = ai.defineTool({
  name: 'getPatientAppointmentHistory',
  description: 'Busca o histórico de agendamentos de um paciente para análise de padrões',
  inputSchema: z.object({
    patientId: z.string(),
    limit: z.number().min(1).max(100).default(30),
  }),
}, async (input) => {
  const db = getFirestore();

  const historySnapshot = await db
    .collection('appointments')
    .where('patientId', '==', input.patientId)
    .orderBy('date', 'desc')
    .limit(input.limit)
    .get();

  const appointments = historySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      patientId: data?.patientId,
      patientName: data?.patientName || '',
      date: data?.date || '',
      time: data?.time || '',
      status: data?.status || '',
      type: data?.type || '',
      duration: data?.duration || 60,
      createdAt: data?.createdAt || '',
    };
  });

  // Calcular estatísticas
  const total = appointments.length;
  const completed = appointments.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
  const noShows = appointments.filter(a => a.status === 'nao_compareceu' || a.status === 'falta').length;
  const noShowRate = total > 0 ? (noShows / total) * 100 : 0;

  // Horários mais comuns
  const timeSlots = appointments.map(a => {
    const [hour] = a.time.split(':').map(Number);
    return hour;
  });

  const hourCounts = timeSlots.reduce((acc, hour) => {
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const mostCommonHours = Object.entries(hourCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return {
    appointments,
    stats: {
      total,
      completed,
      noShows,
      noShowRate,
      mostCommonHours,
      averageDuration: appointments.reduce((sum, a) => sum + (a.duration || 60), 0) / total || 60,
    },
  };
});

/**
 * Verificar disponibilidade de capacidade para um slot específico
 */
export const checkSlotCapacity = ai.defineTool({
  name: 'checkSlotCapacity',
  description: 'Verifica a capacidade disponível e ocupação atual de um slot',
  inputSchema: z.object({
    date: z.string(),
    time: z.string(),
    organizationId: z.string(),
  }),
}, async (input) => {
  const db = getFirestore();

  // Buscar configuração de capacidade
  const capacityConfig = await db
    .collection('schedule_capacity_config')
    .where('organizationId', '==', input.organizationId)
    .where('date', '==', input.date)
    .get();

  if (capacityConfig.empty) {
    // Fallback: capacidade padrão
    return {
      capacity: 4,
      occupied: 0,
      available: 4,
      isBlocked: false,
    };
  }

  const config = capacityConfig.docs[0].data();
  const baseCapacity = config?.capacity || 4;

  // Contar agendamentos neste slot
  const appointmentsSnapshot = await db
    .collection('appointments')
    .where('organizationId', '==', input.organizationId)
    .where('date', '==', input.date)
    .where('time', '==', input.time)
    .where('status', 'in', ['confirmado', 'agendado', 'em_andamento'])
    .get();

  const occupied = appointmentsSnapshot.size;

  return {
    capacity: baseCapacity,
    occupied,
    available: baseCapacity - occupied,
    isBlocked: config?.isBlocked || false,
  };
});

/**
 * Obter preferências do paciente
 */
export const getPatientPreferences = ai.defineTool({
  name: 'getPatientPreferences',
  description: 'Obtém as preferências de agendamento de um paciente',
  inputSchema: z.object({
    patientId: z.string(),
  }),
}, async (input) => {
  const db = getFirestore();

  // Buscar dados do paciente
  const patientDoc = await db
    .collection('patients')
    .doc(input.patientId)
    .get();

  if (!patientDoc.exists) {
    throw new Error('Patient not found');
  }

  const patientData = patientDoc.data();

  // Calcular estatísticas de agendamento
  const appointmentsSnapshot = await db
    .collection('appointments')
    .where('patientId', '==', input.patientId)
    .limit(50)
    .get();

  const appointments = appointmentsSnapshot.docs.map(doc => doc.data() as Appointment);
  const total = appointments.length;
  const noShows = appointments.filter(a =>
    a.status === 'nao_compareceu' || a.status === 'falta'
  ).length;
  const noShowRate = total > 0 ? (noShows / total) * 100 : 0;

  // Horários mais frequentes
  const timeSlots = appointments.map(a => {
    const [hour] = (a.time || '09:00').split(':').map(Number);
    return hour;
  });

  const hourCounts: Record<number, number> = {};
  timeSlots.forEach(hour => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostCommonHours = Object.entries(hourCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([h]) => h);

  return {
    patientId: input.patientId,
    patientName: patientData?.name || '',
    preferredDays: patientData?.preferredDays || [],
    preferredTimes: patientData?.preferredTimes || [],
    preferredTherapistId: patientData?.preferredTherapistId,
    avoidTherapists: patientData?.avoidTherapists || [],
    treatmentType: patientData?.treatmentType || '',
    urgency: patientData?.urgency || 'medium',
    noShowRate,
    missedAppointmentsCount: noShows,
    totalAppointmentsCount: total,
    mostCommonHours,
    lastVisitDate: patientData?.lastVisitDate,
  };
});

// ============================================================================
// FLOW: Suggest Optimal Slot
// ============================================================================

export const suggestOptimalSlotFlow = ai.defineFlow({
  name: 'suggestOptimalSlot',
  inputSchema: z.object({
    patientId: z.string(),
    desiredDate: z.string().optional(),
    treatmentType: z.string().optional(),
    organizationId: z.string(),
  }),
  outputSchema: z.object({
    suggestions: z.array(SlotSuggestionSchema),
    reasoning: z.string(),
  }),
}, async (input) => {
  // 1. Obter preferências do paciente
  const preferences = await ai.run('getPatientPreferences', () => getPatientPreferences(input));

  // 2. Filtrar slots baseado em preferências
  let prompt = `Analise as preferências do paciente e sugira os melhores horários de agendamento.

Paciente: ${preferences.patientName}
Taxa de falta: ${preferences.noShowRate.toFixed(1)}%
Horários preferidos: ${preferences.mostCommonHours.join(', ')}
Urgência: ${preferences.urgency}

Retorne até 5 sugestões com:
- Data e hora no formato YYYY-MM-DDTHH:mm
- Nível de confiança (0-1)
- Justificativa breve`;

  const { output } = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: {
      schema: z.object({
        suggestions: z.array(z.object({
          date: z.string(),
          time: z.string(),
          confidence: z.number(),
          reason: z.string(),
        })),
        reasoning: z.string(),
      }),
    },
  });

  if (!output) throw new Error("AI generation failed");

  return {
    suggestions: output.suggestions.map((s: any) => ({
      date: s.date,
      time: s.time,
      confidence: s.confidence,
      reason: s.reason,
      alternatives: output.suggestions
        .filter((alt: any) => alt.date !== s.date || alt.time !== s.time)
        .slice(0, 3)
        .map((alt: any) => ({
          date: alt.date,
          time: alt.time,
        })),
    })),
    reasoning: output.reasoning,
  };
});

// ============================================================================
// FLOW: Predict No Show
// ============================================================================

export const predictNoShowFlow = ai.defineFlow({
  name: 'predictNoShow',
  inputSchema: z.object({
    patientId: z.string(),
    appointmentDate: z.string(),
    appointmentTime: z.string(),
    organizationId: z.string(),
  }),
  outputSchema: z.object({
    prediction: z.enum(['low', 'medium', 'high', 'very-high']),
    probability: z.number().min(0).max(1),
    riskFactors: z.array(z.string()),
    recommendation: z.string(),
  }),
}, async (input) => {
  // Obter histórico e preferências
  const history = await ai.run('getPatientHistory', () => getPatientAppointmentHistory({ patientId: input.patientId, limit: 50 }));

  // Analisar fatores de risco
  const riskFactors: string[] = [];

  if (history.stats.noShowRate > 20) {
    riskFactors.push('Alta taxa histórica de não comparecimento');
  }

  // Usar AI para refinar predição
  let prompt = `Analise o risco de não comparecimento para este agendamento:

Histórico do paciente:
- Taxa de falta: ${history.stats.noShowRate.toFixed(1)}%
- Total de agendamentos: ${history.stats.total}
- Agendamentos concluídos: ${history.stats.completed}

Agendamento atual:
- Data: ${input.appointmentDate}
- Hora: ${input.appointmentTime}

Retorne:
1. Nível de risco (low, medium, high, very-high)
2. Probabilidade numérica (0-1)
3. Lista de fatores de risco
4. Recomendação de ação`;

  const { output } = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: {
      schema: z.object({
        prediction: z.enum(['low', 'medium', 'high', 'very-high']),
        probability: z.number(),
        riskFactors: z.array(z.string()),
        recommendation: z.string(),
      }),
    },
  });

  if (!output) throw new Error("AI generation failed");

  return {
    prediction: output.prediction,
    probability: output.probability,
    riskFactors: output.riskFactors,
    recommendation: output.recommendation,
  };
});

// ============================================================================
// FLOW: Optimize Capacity
// ============================================================================

export const optimizeCapacityFlow = ai.defineFlow({
  name: 'optimizeCapacity',
  inputSchema: z.object({
    organizationId: z.string(),
    date: z.string(),
    currentCapacity: z.number(),
  }),
  outputSchema: z.object({
    recommendations: z.array(CapacityOptimizationSchema),
    overallOptimization: z.string(),
  }),
}, async (input) => {
  const prompt = `Analise a capacidade de agendamento e sugira otimizações para a data ${input.date} com capacidade atual ${input.currentCapacity}.`;

  const { output } = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: {
      schema: z.object({
        recommendations: z.array(CapacityOptimizationSchema),
        overallOptimization: z.string(),
      }),
    },
  });

  if (!output) throw new Error("AI generation failed");

  return {
    recommendations: output.recommendations,
    overallOptimization: output.overallOptimization,
  };
});

// ============================================================================
// FLOW: Waitlist Prioritization
// ============================================================================

export const waitlistPrioritizationFlow = ai.defineFlow({
  name: 'waitlistPrioritization',
  inputSchema: z.object({
    organizationId: z.string(),
    limit: z.number().default(50),
    sortBy: z.enum(['priority', 'waitingTime', 'mixed']).default('priority'),
    filterStatus: z.array(z.string()).default([]),
  }),
  outputSchema: z.object({
    rankedEntries: z.array(WaitlistPrioritySchema),
    summary: z.object({
      totalEntries: z.number(),
      highPriority: z.number(),
      mediumPriority: z.number(),
      lowPriority: z.number(),
    }),
  }),
}, async (input) => {
  const db = getFirestore();

  // Buscar lista de espera
  let query = db
    .collection('waitlist')
    .where('organizationId', '==', input.organizationId)
    .where('status', '==', 'pending');

  if (input.filterStatus.length > 0) {
    query = query.where('urgency', 'in', input.filterStatus);
  }

  const snapshot = await query.limit(input.limit).get();

  const entries = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const patientDoc = await db.collection('patients').doc(data.patientId).get();

    // Calcular score de priorização
    const waitingDays = Math.floor((Date.now() - new Date(data.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
    let score = 0;

    // Pontuação por urgência
    switch (data.urgency || 'medium') {
      case 'urgent': score += 100; break;
      case 'high': score += 50; break;
      case 'medium': score += 10; break;
      case 'low': score += 5; break;
    }

    score += Math.min(waitingDays * 2, 60);
    const patientData = patientDoc.exists ? patientDoc.data() : null;

    return {
      waitlistEntryId: doc.id,
      patientId: data.patientId,
      patientName: patientData?.name || '',
      urgency: data.urgency || 'medium',
      waitingDays,
      score,
    };
  }));

  // Ordenar entries
  const sortedEntries = entries.sort((a, b) => b.score - a.score);

  // Resumo por prioridade
  const highPriority = entries.filter(e => e.urgency === 'urgent' || e.urgency === 'high').length;
  const mediumPriority = entries.filter(e => e.urgency === 'medium').length;
  const lowPriority = entries.filter(e => e.urgency === 'low').length;

  return {
    rankedEntries: sortedEntries.map(e => ({
      waitlistEntryId: e.waitlistEntryId,
      patientId: e.patientId,
      patientName: e.patientName,
      urgency: e.urgency as any,
      waitingDays: e.waitingDays,
      score: e.score,
    })),
    summary: {
      totalEntries: entries.length,
      highPriority,
      mediumPriority,
      lowPriority,
    },
  };
});
