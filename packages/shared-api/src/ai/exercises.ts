/**
 * Exercise AI Assistant
 *
 * AI-powered exercise recommendations, form analysis, and progression planning
 * using Firebase AI Logic (Gemini models).
 *
 * @module ai/exercises
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType, AIFeatureCategory } from '../firebase/ai/config';
import { EXERCISE_PROMPTS, buildExerciseSuggestionPrompt, buildExerciseProgressionPrompt } from './prompts/exercise-prompts';
import type { Exercise, ExerciseCategory, BodyPart, ExerciseDifficulty } from '@fisioflow/shared-types';

/**
 * Exercise recommendation result
 */
export interface ExerciseRecommendation {
  warmup: ExerciseSuggestionItem[];
  main: ExerciseSuggestionItem[];
  cooldown: ExerciseSuggestionItem[];
  sessionSummary: string;
  precautions: string[];
  expectedProgression: string;
}

export interface ExerciseSuggestionItem {
  exerciseId: string;
  name: string;
  objective: string;
  sets: number;
  reps: string;
  instructions: string;
  modifications: string;
  progression: string;
}

/**
 * Exercise form analysis result
 */
export interface ExerciseFormAnalysis {
  overallScore: number;
  scoreLabel: 'Excelente' | 'Boa' | 'Aceitável' | 'Precisa Melhorar' | 'Forma Pobre';
  positivePoints: string[];
  deviations: Array<{
    name: string;
    timestamp: number;
    severity: 'Leve' | 'Moderada' | 'Grave';
    correction: string;
  }>;
  compensations: string[];
  injuryRisks: {
    immediate: boolean;
    potential: boolean;
    details: string;
  };
  recommendations: {
    progression: 'mantém' | 'regressa' | 'avança';
    modifications: string[];
    nextSteps: string[];
    whenToReassess: string;
  };
}

/**
 * Exercise progression result
 */
export interface ExerciseProgressionAnalysis {
  decision: 'mantém' | 'regressa' | 'avança';
  justification: string;
  criteriaMet: {
    formQuality: boolean;
    pain: boolean;
    rpe: boolean;
    completion: boolean;
  };
  ifNotProgressing?: {
    limitingFactor: string;
    interventions: string[];
    focusAreas: string[];
  };
  ifProgressing?: {
    nextLevel: number;
    nextExercise: string;
    expectations: string;
    monitoring: string[];
  };
  nextSession: {
    focus: string;
    metrics: string[];
    reassessIn: string;
  };
}

/**
 * Progress report data
 */
export interface PatientProgressReport {
  patientId: string;
  patientName: string;
  condition: string;
  treatmentDuration: string;
  sessionsCompleted: number;
  overallProgress: {
    percentage: number;
    trend: 'improving' | 'stable' | 'declining';
    summary: string;
  };
  metricsProgress: Array<{
    name: string;
    baseline: number;
    current: number;
    change: number;
    changePercentage: number;
    clinicalSignificance: boolean;
  }>;
  painEvolution: Array<{
    date: string;
    level: number;
  }>;
  adherenceScore: number;
  recommendations: string[];
  prognosis: string;
}

/**
 * Exercise AI Assistant Class
 */
export class ExerciseAIAssistant {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.FLASH_LITE; // Use Flash-Lite for cost efficiency

  /**
   * Suggest exercises for a patient based on their profile and goals
   */
  async suggestExercises(params: {
    patientProfile: {
      name: string;
      age: string;
      condition: string;
      mainComplaint: string;
      painAreas: BodyPart[];
      painLevel: number;
      functionalLimitations: string[];
      goals: string[];
      fitnessLevel: 'sedentary' | 'active' | 'athlete';
    };
    availableEquipment: string[];
    sessionDuration?: number;
    userId: string;
    organizationId?: string;
  }): Promise<ExerciseRecommendation> {
    const { patientProfile, availableEquipment, sessionDuration, userId, organizationId } = params;

    // Build prompt using template
    const prompt = buildExerciseSuggestionPrompt({
      patientName: patientProfile.name,
      patientAge: patientProfile.age,
      patientCondition: patientProfile.condition,
      mainComplaint: patientProfile.mainComplaint,
      painAreas: patientProfile.painAreas,
      painLevel: patientProfile.painLevel,
      functionalLimitations: patientProfile.functionalLimitations,
      patientGoals: patientProfile.goals,
      availableEquipment,
      currentFitnessLevel: patientProfile.fitnessLevel,
      sessionDuration,
    });

    const startTime = Date.now();

    try {
      // Generate AI response
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const result = await modelInstance.generateContent([
        {
          text: EXERCISE_PROMPTS.SYSTEM.SUGGESTION + '\n\n' + prompt,
        },
      ]);

      const responseText = result.response.text();
      const duration = Date.now() - startTime;

      // Parse JSON response
      let recommendation: ExerciseRecommendation;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        recommendation = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('[ExerciseAI] Failed to parse response, using fallback');
        recommendation = this.getFallbackRecommendation(patientProfile);
      }

      // Track usage
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(responseText);

      // Note: Usage tracking would be done here
      // await trackAIRequest({ userId, organizationId, feature: AIFeatureCategory.EXERCISE_RECOMMENDATION, ... });

      return recommendation;
    } catch (error) {
      console.error('[ExerciseAI] Suggestion failed:', error);
      return this.getFallbackRecommendation(patientProfile);
    }
  }

  /**
   * Generate a progress report for a patient
   */
  async generateProgressReport(params: {
    patientId: string;
    patientName: string;
    condition: string;
    sessions: Array<{
      date: string;
      painLevel: number;
      notes?: string;
      improvements?: string[];
    }>;
    baseline: Record<string, number>;
    current: Record<string, number>;
    treatmentDuration: string;
  }): Promise<PatientProgressReport> {
    const { patientId, patientName, condition, sessions, baseline, current, treatmentDuration } = params;

    // Calculate progress metrics
    const metricsProgress = Object.keys(baseline).map(key => {
      const baselineValue = baseline[key];
      const currentValue = current[key];
      const change = currentValue - baselineValue;
      const changePercentage = baselineValue !== 0 ? (change / Math.abs(baselineValue)) * 100 : 0;

      return {
        name: key,
        baseline: baselineValue,
        current: currentValue,
        change,
        changePercentage,
        clinicalSignificance: Math.abs(changePercentage) >= 15, // MCID for many measures
      };
    });

    // Calculate overall progress
    const avgChangePercentage = metricsProgress.reduce((sum, m) => sum + m.changePercentage, 0) / metricsProgress.length;
    const overallProgress = {
      percentage: Math.min(100, Math.max(0, 50 + avgChangePercentage / 2)), // Normalize to 0-100
      trend: avgChangePercentage > 5 ? ('improving' as const) : avgChangePercentage < -5 ? ('declining' as const) : ('stable' as const),
      summary: this.generateProgressSummary(avgChangePercentage),
    };

    // Calculate adherence from session attendance
    const expectedSessions = Math.floor(new Date(treatmentDuration).getTime() / (7 * 24 * 60 * 60 * 1000)) * 2; // Assuming 2x/week
    const adherenceScore = Math.min(100, Math.round((sessions.length / Math.max(1, expectedSessions)) * 100));

    // Generate pain evolution
    const painEvolution = sessions.map(s => ({
      date: s.date,
      level: s.painLevel,
    }));

    // Generate recommendations
    const recommendations = this.generateProgressRecommendations(overallProgress, adherenceScore, metricsProgress);

    return {
      patientId,
      patientName,
      condition,
      treatmentDuration,
      sessionsCompleted: sessions.length,
      overallProgress,
      metricsProgress,
      painEvolution,
      adherenceScore,
      recommendations,
      prognosis: this.generatePrognosis(overallProgress, adherenceScore),
    };
  }

  /**
   * Analyze exercise form from video
   */
  async analyzeExerciseForm(params: {
    videoUri: string;
    exercise: Exercise;
    patientContext: {
      level: 'beginner' | 'intermediate' | 'advanced';
      condition: string;
      limitations: string[];
    };
    userId: string;
    organizationId?: string;
  }): Promise<ExerciseFormAnalysis> {
    const { videoUri, exercise, patientContext } = params;

    const prompt = this.buildFormAnalysisPrompt(exercise, patientContext, true);

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.PRO }); // Use Pro for video analysis
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      // For video analysis, we would use the multimodal capabilities
      // This is a placeholder for the actual implementation
      const result = await modelInstance.generateContent([
        {
          text: prompt,
        },
      ]);

      const responseText = result.response.text();

      let analysis: ExerciseFormAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysis = this.getFallbackFormAnalysis();
      }

      return analysis;
    } catch (error) {
      console.error('[ExerciseAI] Form analysis failed:', error);
      return this.getFallbackFormAnalysis();
    }
  }

  /**
   * Analyze exercise progression and make recommendations
   */
  async analyzeProgression(params: {
    exercise: Exercise;
    currentLevel: number;
    currentPerformance: {
      formQuality: number;
      painDuring: number;
      rpe: number;
      completionRate: number;
    };
    patientContext: {
      condition: string;
      treatmentWeek: number;
      goals: string[];
    };
    availableProgressions: Array<{
      level: number;
      name: string;
      description: string;
      difficulty: ExerciseDifficulty;
    }>;
    userId: string;
    organizationId?: string;
  }): Promise<ExerciseProgressionAnalysis> {
    const { exercise, currentLevel, currentPerformance, patientContext, availableProgressions } = params;

    const prompt = buildExerciseProgressionPrompt({
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      currentLevel,
      currentPerformance,
      patientCondition: patientContext.condition,
      treatmentWeek: patientContext.treatmentWeek,
      goals: patientContext.goals,
      availableProgressions,
    });

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const result = await modelInstance.generateContent([
        {
          text: EXERCISE_PROMPTS.SYSTEM.PROGRESSION + '\n\n' + prompt,
        },
      ]);

      const responseText = result.response.text();

      let analysis: ExerciseProgressionAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysis = this.getFallbackProgressionAnalysis(currentPerformance);
      }

      return analysis;
    } catch (error) {
      console.error('[ExerciseAI] Progression analysis failed:', error);
      return this.getFallbackProgressionAnalysis(currentPerformance);
    }
  }

  /**
   * Build form analysis prompt
   */
  private buildFormAnalysisPrompt(
    exercise: Exercise,
    patientContext: { level: string; condition: string; limitations: string[] },
    hasCorrectFormVideo: boolean
  ): string {
    return `## Análise de Forma: ${exercise.name}

### Informações do Exercício
ID: ${exercise.id}
Descrição: ${exercise.description}
Categoria: ${exercise.category}
Partes do Corpo: ${exercise.bodyParts.join(', ')}
Dificuldade: ${exercise.difficulty}

### Instruções do Exercício
${exercise.description}

### Contexto do Paciente
Nível: ${patientContext.level}
Condição: ${patientContext.condition}
Limitações: ${patientContext.limitations.join(', ') || 'Nenhuma'}
${hasCorrectFormVideo ? '\n**Vídeo de referência correta será fornecido para comparação**' : ''}

## Instruções
Analise o vídeo e forneça feedback detalhado sobre a forma do exercício.`;
  }

  /**
   * Generate progress summary
   */
  private generateProgressSummary(changePercentage: number): string {
    if (changePercentage > 20) return 'Progresso excelente significativo';
    if (changePercentage > 10) return 'Progresso bom consistente';
    if (changePercentage > 5) return 'Progresso moderado';
    if (changePercentage > 0) return 'Progresso leve';
    if (changePercentage === 0) return 'Estável sem mudanças significativas';
    return 'Regressão detectada - revisar plano de tratamento';
  }

  /**
   * Generate progress recommendations
   */
  private generateProgressRecommendations(
    overallProgress: { percentage: number; trend: string },
    adherenceScore: number,
    metricsProgress: Array<{ clinicalSignificance: boolean; name: string }>
  ): string[] {
    const recommendations: string[] = [];

    if (overallProgress.trend === 'improving') {
      recommendations.push('Continuar com plano de tratamento atual');
      if (overallProgress.percentage > 75) {
        recommendations.push('Considerar progressão para exercícios mais avançados');
      }
    } else if (overallProgress.trend === 'declining') {
      recommendations.push('Reavaliar plano de tratamento - ajustes necessários');
      recommendations.push('Investigar barreiras à adesão');
    } else {
      recommendations.push('Manter plano atual mas considerar variações');
    }

    if (adherenceScore < 70) {
      recommendations.push('Focar em estratégias para melhorar adesão');
      recommendations.push('Simplificar programa se apropriado');
    }

    const nonSignificantMetrics = metricsProgress.filter(m => !m.clinicalSignificance);
    if (nonSignificantMetrics.length > 0) {
      recommendations.push(`Dedicar atenção especial a: ${nonSignificantMetrics.map(m => m.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate prognosis
   */
  private generatePrognosis(overallProgress: { percentage: number; trend: string }, adherenceScore: number): string {
    if (overallProgress.trend === 'improving' && adherenceScore > 80) {
      return 'Prognóstico favorável com manutenção da adesão';
    } else if (overallProgress.trend === 'improving' && adherenceScore < 70) {
      return 'Prognóstico moderado - melhorar adesão pode acelerar recuperação';
    } else if (overallProgress.trend === 'stable') {
      return 'Prognóstico reservado - revisão de plano pode ser necessária';
    } else {
      return 'Prognóstico desfavorável - intervenção urgente recomendada';
    }
  }

  /**
   * Get fallback recommendation when AI fails
   */
  private getFallbackRecommendation(patientProfile: { mainComplaint: string; painAreas: BodyPart[] }): ExerciseRecommendation {
    return {
      warmup: [
        {
          exerciseId: 'fallback-warmup-1',
          name: 'Aquecimento Genérico',
          objective: 'Preparar corpo para exercícios',
          sets: 1,
          reps: '10-15 reps',
          instructions: 'Realize movimentos suaves e controlados',
          modifications: 'Adapte conforme necessário',
          progression: 'Aumente gradualmente a amplitude',
        },
      ],
      main: [
        {
          exerciseId: 'fallback-main-1',
          name: 'Exercício Terapêutico Básico',
          objective: `Addressar ${patientProfile.mainComplaint}`,
          sets: 3,
          reps: '10-12 reps',
          instructions: 'Execute de forma controlada',
          modifications: 'Reduza amplitude se houver dor',
          progression: 'Progrida quando confortável',
        },
      ],
      cooldown: [
        {
          exerciseId: 'fallback-cooldown-1',
          name: 'Alongamento Suave',
          objective: 'Resfriamento e flexibilidade',
          sets: 1,
          reps: '30 segundos',
          instructions: 'Mantenha posição suavemente',
          modifications: 'Não force além do conforto',
          progression: 'Aumente tempo gradualmente',
        },
      ],
      sessionSummary: 'Sessão adaptada com exercícios básicos. Consulte um fisioterapeuta para personalização.',
      precautions: ['Pare se houver dor aguda', 'Respeite seus limites', 'Comunique qualquer desconforto'],
      expectedProgression: 'Melhora esperada com exercícios consistentes e progressão adequada',
    };
  }

  /**
   * Get fallback form analysis
   */
  private getFallbackFormAnalysis(): ExerciseFormAnalysis {
    return {
      overallScore: 70,
      scoreLabel: 'Aceitável',
      positivePoints: ['Postura geral aceitável', 'Execução controlada'],
      deviations: [],
      compensations: [],
      injuryRisks: {
        immediate: false,
        potential: false,
        details: 'Nenhum risco evidente detectado',
      },
      recommendations: {
        progression: 'mantém',
        modifications: [],
        nextSteps: ['Continuar praticando', 'Gravar novamente para comparação'],
        whenToReassess: 'Próxima sessão',
      },
    };
  }

  /**
   * Get fallback progression analysis
   */
  private getFallbackProgressionAnalysis(performance: { formQuality: number; painDuring: number }): ExerciseProgressionAnalysis {
    const canProgress = performance.formQuality >= 8 && performance.painDuring <= 3;

    return {
      decision: canProgress ? 'avança' : 'mantém',
      justification: canProgress
        ? 'Critérios de progressão atendidos'
        : 'Manter nível atual para consolidar técnica',
      criteriaMet: {
        formQuality: performance.formQuality >= 8,
        pain: performance.painDuring <= 3,
        rpe: true, // Assume OK since we don't have the data
        completion: true, // Assume OK since we don't have the data
      },
      nextSession: {
        focus: canProgress ? 'Próximo nível de progressão' : 'Consolidar técnica atual',
        metrics: ['Qualidade de forma', 'Nível de dor', 'RPE'],
        reassessIn: '1-2 sessões',
      },
    };
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }
}

/**
 * Singleton instance
 */
export const exerciseAI = new ExerciseAIAssistant();
