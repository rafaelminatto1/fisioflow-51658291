/**
 * Exercise Suggestions Service - Sugestões Inteligentes de Exercícios
 * 
 * Usa IA para sugerir exercícios baseados em:
 * - Histórico do paciente
 * - Condições/lesões
 * - Progresso nas evoluções
 * - Protocolos recomendados
 */

import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

export interface PatientCondition {
  id: string;
  name: string;
  bodyPart: string;
  severity: 'mild' | 'moderate' | 'severe';
  chronic: boolean;
}

export interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  targetArea: string;
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  contraindications: string[];
  benefits: string[];
  progressMetrics: {
    previousScore?: number;
    targetScore: number;
    improvement: number;
  };
}

export interface SuggestionContext {
  patientId: string;
  conditions: PatientCondition[];
  recentEvolutions: any[];
  completedExercises: string[];
  painLevel: number;
  mobilityScore: number;
  goals: string[];
}

/**
 * Gera sugestões de exercícios usando IA
 */
export async function generateExerciseSuggestions(
  context: SuggestionContext
): Promise<ExerciseRecommendation[]> {
  try {
    const token = await authApi.getToken();
    
    const response = await fetch(`${config.apiUrl}/api/ai/exercise-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      // Fallback para sugestões locais
      return generateLocalSuggestions(context);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return generateLocalSuggestions(context);
  }
}

/**
 * Sugestões locais (fallback)
 */
function generateLocalSuggestions(context: SuggestionContext): ExerciseRecommendation[] {
  const suggestions: ExerciseRecommendation[] = [];
  
  // Mapear condições para exercícios recomendados
  const conditionExercises: Record<string, ExerciseRecommendation[]> = {
    'lumbar': [
      {
        exerciseId: 'cat-cow',
        exerciseName: 'Cat-Cow Stretch',
        reason: 'Melhora a mobilidade da coluna lombar',
        priority: 'high',
        targetArea: 'Lombar',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: ['Hérnia discal aguda'],
        benefits: ['Mobilidade', 'Flexibilidade', 'Alívio da dor'],
        progressMetrics: { targetScore: 80, improvement: 10 }
      },
      {
        exerciseId: 'bird-dog',
        exerciseName: 'Bird Dog',
        reason: 'Fortalece o core e estabiliza a coluna',
        priority: 'high',
        targetArea: 'Core/Lombar',
        estimatedDuration: 8,
        difficulty: 'medium',
        contraindications: [],
        benefits: ['Estabilidade', 'Força', 'Coordenação'],
        progressMetrics: { targetScore: 75, improvement: 15 }
      }
    ],
    'joelho': [
      {
        exerciseId: 'quad-stretch',
        exerciseName: 'Alongamento de Quadríceps',
        reason: 'Aumenta a flexibilidade do quadríceps',
        priority: 'medium',
        targetArea: 'Joelho/Quadríceps',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: ['Lesão aguda de LCA'],
        benefits: ['Flexibilidade', 'Mobilidade'],
        progressMetrics: { targetScore: 85, improvement: 10 }
      },
      {
        exerciseId: 'wall-sit',
        exerciseName: 'Sentar na Parede',
        reason: 'Fortalece quadríceps isometricamente',
        priority: 'high',
        targetArea: 'Joelho/Quadríceps',
        estimatedDuration: 6,
        difficulty: 'medium',
        contraindications: ['Condromalácia grave'],
        benefits: ['Força', 'Resistência', 'Estabilidade'],
        progressMetrics: { targetScore: 70, improvement: 12 }
      }
    ],
    'ombro': [
      {
        exerciseId: 'pendular-codman',
        exerciseName: 'Exercício Pendular de Codman',
        reason: 'Mobilização passiva do ombro',
        priority: 'high',
        targetArea: 'Ombro',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Mobilidade', 'Relaxamento'],
        progressMetrics: { targetScore: 80, improvement: 15 }
      },
      {
        exerciseId: 'rotator-cuff',
        exerciseName: 'Fortalecimento do Manguito',
        reason: 'Estabiliza a articulação do ombro',
        priority: 'medium',
        targetArea: 'Ombro/Manguito',
        estimatedDuration: 10,
        difficulty: 'medium',
        contraindications: ['Ruptura completa'],
        benefits: ['Força', 'Estabilidade'],
        progressMetrics: { targetScore: 75, improvement: 10 }
      }
    ],
    'cervical': [
      {
        exerciseId: 'chin-tuck',
        exerciseName: 'Retração Cervical (Chin Tuck)',
        reason: 'Corrige a postura da cabeça e pescoço',
        priority: 'high',
        targetArea: 'Cervical',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Postura', 'Alívio da dor', 'Fortalecimento'],
        progressMetrics: { targetScore: 85, improvement: 12 }
      }
    ]
  };

  // Buscar exercícios baseados nas condições
  for (const condition of context.conditions) {
    const bodyPart = condition.bodyPart.toLowerCase();
    
    // Verificar mapeamento direto
    if (conditionExercises[bodyPart]) {
      for (const exercise of conditionExercises[bodyPart]) {
        // Verificar se não é contraindicado
        const hasContraindication = exercise.contraindications.some(c => 
          context.conditions.some(cond => cond.name.includes(c))
        );
        
        if (!hasContraindication && !context.completedExercises.includes(exercise.exerciseId)) {
          // Ajustar prioridade baseado na severidade
          if (condition.severity === 'severe') {
            exercise.priority = 'high';
          } else if (condition.severity === 'mild') {
            exercise.priority = 'low';
          }
          
          // Ajustar baseado no nível de dor
          if (context.painLevel > 7) {
            exercise.difficulty = 'easy';
            exercise.reason += ' (versão adaptada para dor intensa)';
          }
          
          suggestions.push(exercise);
        }
      }
    }
  }

  // Ordenar por prioridade
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Retornar top 5
  return suggestions.slice(0, 5);
}

/**
 * Analisa o progresso do paciente
 */
export function analyzeProgress(evolutions: any[]): {
  trend: 'improving' | 'stable' | 'declining';
  averagePain: number;
  averageMobility: number;
  sessionsCount: number;
} {
  if (evolutions.length === 0) {
    return {
      trend: 'stable',
      averagePain: 0,
      averageMobility: 0,
      sessionsCount: 0
    };
  }

  const recentEvolutions = evolutions.slice(0, 10);
  
  const avgPain = recentEvolutions.reduce((sum, e) => sum + (e.painLevel || 0), 0) / recentEvolutions.length;
  const avgMobility = recentEvolutions.reduce((sum, e) => sum + (e.mobilityScore || 0), 0) / recentEvolutions.length;
  
  // Calcular tendência (comparar primeira metade com segunda metade)
  const half = Math.floor(recentEvolutions.length / 2);
  const firstHalf = recentEvolutions.slice(0, half);
  const secondHalf = recentEvolutions.slice(half);
  
  const firstHalfPain = firstHalf.reduce((sum, e) => sum + (e.painLevel || 0), 0) / firstHalf.length;
  const secondHalfPain = secondHalf.reduce((sum, e) => sum + (e.painLevel || 0), 0) / secondHalf.length;
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (secondHalfPain < firstHalfPain - 1) {
    trend = 'improving';
  } else if (secondHalfPain > firstHalfPain + 1) {
    trend = 'declining';
  }

  return {
    trend,
    averagePain: Math.round(avgPain * 10) / 10,
    averageMobility: Math.round(avgMobility * 10) / 10,
    sessionsCount: evolutions.length
  };
}

/**
 * Gera relatório de insights
 */
export function generateInsights(context: SuggestionContext): string[] {
  const insights: string[] = [];
  const progress = analyzeProgress(context.recentEvolutions);
  
  if (progress.trend === 'improving') {
    insights.push('📈 Paciente está mostrando melhora consistente no nível de dor.');
  } else if (progress.trend === 'declining') {
    insights.push('⚠️ Nível de dor está aumentando. Considere reavaliar o tratamento.');
  }
  
  if (context.painLevel > 7) {
    insights.push('🔴 Dor elevada. Priorize exercícios de baixo impacto e alongamentos.');
  }
  
  if (progress.sessionsCount < 3) {
    insights.push('💡 Poucas sessões realizadas. A adesão ao tratamento é fundamental.');
  } else if (progress.sessionsCount > 10) {
    insights.push('✅ Bom engajamento! Considere progredir para exercícios mais desafiadores.');
  }
  
  // Verificar condições crônicas
  const chronicConditions = context.conditions.filter(c => c.chronic);
  if (chronicConditions.length > 0) {
    insights.push('📋 Condição crônica detectada. Foco em manejo a longo prazo.');
  }
  
  return insights;
}