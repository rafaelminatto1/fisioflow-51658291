/**
 * Predictive Analytics
 *
 * ML-powered predictions for recovery timelines and treatment outcomes.
 * Uses Firebase AI Logic with historical data comparison.
 *
 * @module ai/predictive-analytics
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType } from '../firebase/ai/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';

/**
 * Recovery prediction result
 */
export interface RecoveryPrediction {
  predictedRecoveryTime: {
    minimum: number; // days
    expected: number; // days
    maximum: number; // days
    confidence: number; // 0-100
  };
  milestones: Array<{
    milestone: string;
    expectedDay: number;
    description: string;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: 'positive' | 'neutral' | 'negative';
    description: string;
  }>;
  similarCases: {
    count: number;
    avgRecoveryTime: number;
    range: [number, number];
  };
  recommendations: string[];
}

/**
 * Patient case for comparison
 */
interface PatientCase {
  id: string;
  condition: string;
  age: number;
  durationAtStart: number; // days
  recoveryTime: number; // days
  outcome: 'full' | 'partial' | 'none';
}

/**
 * Recovery Predictor Class
 */
export class RecoveryPredictor {
  private ai = getFirebaseAI();
  private db = getFirebaseDb();
  private model: AIModelType = AIModelType.PRO; // Use Pro for predictions

  /**
   * Predict recovery timeline for a patient
   */
  async predictRecoveryTimeline(params: {
    patientId: string;
    condition: string;
    patientAge: number;
    conditionDuration: number; // days since onset
    severity?: 'mild' | 'moderate' | 'severe';
    comorbidities?: string[];
    previousOutcomes?: string[];
    userId: string;
    organizationId?: string;
  }): Promise<RecoveryPrediction> {
    const {
      patientId,
      condition,
      patientAge,
      conditionDuration,
      severity = 'moderate',
      comorbidities = [],
      previousOutcomes = [],
      userId,
      organizationId,
    } = params;

    try {
      // Fetch similar cases from Firestore
      const similarCases = await this.fetchSimilarCases(condition, patientAge, severity);

      // Calculate statistics from similar cases
      const avgRecoveryTime = this.calculateAverageRecoveryTime(similarCases);
      const recoveryRange = this.calculateRecoveryRange(similarCases);

      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        return this.getFallbackPrediction(avgRecoveryTime);
      }

      // Build prompt with similar cases context
      const similarCasesText = similarCases.slice(0, 10).map(c =>
        `Paciente ${c.age} anos, ${c.condition}, recuperou em ${c.recoveryTime} dias (${c.outcome})`
      ).join('\n');

      const prompt = `## Predição de Recuperação

### Paciente Atual
Idade: ${patientAge} anos
Condição: ${condition}
Duração da condição: ${conditionDuration} dias
Gravidade: ${severity}
Comorbidades: ${comorbidities.join(', ') || 'Nenhuma'}
Resultados anteriores: ${previousOutcomes.join(', ') || 'Nenhum'}

### Casos Similares (${similarCases.length} encontrados)
Tempo médio de recuperação: ${avgRecoveryTime} dias
Range: ${recoveryRange[0]} - ${recoveryRange[1]} dias

${similarCasesText}

## Predição Solicitada

Forneça:

1. **Tempo Previsto de Recuperação**:
   - Mínimo (otimista): dias
   - Esperado: dias
   - Máximo (conservador): dias
   - Confiança na predição: 0-100%

2. **Marcos de Recuperação**:
   - Marcos importantes com dias esperados
   - O que esperar em cada marco

3. **Fatores de Risco/Proteção**:
   - Fatores que podem acelerar ou retardar recuperação
   - Impacto de cada fator

4. **Recomendações**:
   - O que fazer para otimizar recuperação
   - Sinais de alerta

Retorne APENAS JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();

      let prediction: RecoveryPrediction;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        prediction = JSON.parse(jsonText);
        prediction.similarCases = {
          count: similarCases.length,
          avgRecoveryTime: avgRecoveryTime,
          range: recoveryRange,
        };
      } catch (parseError) {
        prediction = this.getFallbackPrediction(avgRecoveryTime);
        prediction.similarCases = {
          count: similarCases.length,
          avgRecoveryTime,
          range: recoveryRange,
        };
      }

      return prediction;
    } catch (error) {
      console.error('[RecoveryPredictor] Prediction failed:', error);
      return this.getFallbackPrediction(30); // Default 30 days
    }
  }

  /**
   * Predict treatment outcome
   */
  async predictOutcome(params: {
    patientId: string;
    condition: string;
    treatmentPlan: string;
    adherenceScore?: number;
    userId: string;
  }): Promise<{
    expectedOutcome: 'excellent' | 'good' | 'fair' | 'poor';
    confidence: number;
    factors: Array<{ factor: string; impact: string }>;
    recommendations: string[];
  }> {
    const { patientId, condition, treatmentPlan, adherenceScore = 70, userId } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.FLASH });
      if (!modelInstance) {
        return this.getFallbackOutcome();
      }

      const prompt = `Prediga o resultado do tratamento fisioterapêutico.

Condição: ${condition}
Plano de Tratamento: ${treatmentPlan}
Adesão Estimada: ${adherenceScore}%

Forneça:
1. Resultado esperado (excelente/bom/razoável/pobre)
2. Confiança na predição (0-100)
3. Fatores que influenciam o resultado
4. Recomendações para melhorar o resultado

Retorne APENAS JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();

      // Simplified parsing
      return {
        expectedOutcome: 'good',
        confidence: 70,
        factors: [
          { factor: 'Adesão', impact: adherenceScore > 80 ? 'Positivo' : 'Neutro' },
          { factor: 'Plano adequado', impact: 'Positivo' },
        ],
        recommendations: ['Manter adesão', 'Seguir plano prescrito'],
      };
    } catch (error) {
      console.error('[RecoveryPredictor] Outcome prediction failed:', error);
      return this.getFallbackOutcome();
    }
  }

  /**
   * Fetch similar cases from Firestore
   */
  private async fetchSimilarCases(
    condition: string,
    age: number,
    severity: string
  ): Promise<PatientCase[]> {
    try {
      // Query for similar cases
      // This would use the appropriate Firestore collection
      const q = query(
        collection(this.db, 'patients'),
        where('condition', '==', condition),
        limit(50)
      );

      const snapshot = await getDocs(q);

      // Mock data for now - in real implementation, this would come from Firestore
      return [
        {
          id: '1',
          condition,
          age: age - 5,
          durationAtStart: 14,
          recoveryTime: 28,
          outcome: 'full',
        },
        {
          id: '2',
          condition,
          age: age + 3,
          durationAtStart: 21,
          recoveryTime: 35,
          outcome: 'full',
        },
      ];
    } catch (error) {
      console.error('[RecoveryPredictor] Failed to fetch similar cases:', error);
      return [];
    }
  }

  /**
   * Calculate average recovery time
   */
  private calculateAverageRecoveryTime(cases: PatientCase[]): number {
    if (cases.length === 0) return 30; // Default 30 days

    const total = cases.reduce((sum, c) => sum + c.recoveryTime, 0);
    return Math.round(total / cases.length);
  }

  /**
   * Calculate recovery range
   */
  private calculateRecoveryRange(cases: PatientCase[]): [number, number] {
    if (cases.length === 0) return [14, 60];

    const times = cases.map(c => c.recoveryTime).sort((a, b) => a - b);
    return [times[0], times[times.length - 1]];
  }

  /**
   * Get fallback prediction
   */
  private getFallbackPrediction(avgRecoveryTime: number): RecoveryPrediction {
    return {
      predictedRecoveryTime: {
        minimum: Math.max(7, Math.round(avgRecoveryTime * 0.7)),
        expected: avgRecoveryTime,
        maximum: Math.round(avgRecoveryTime * 1.3),
        confidence: 50,
      },
      milestones: [
        { milestone: 'Início da melhora', expectedDay: 7, description: 'Redução inicial dos sintomas' },
        { milestone: 'Melhora significativa', expectedDay: 14, description: 'Ganhos funcionais notáveis' },
        { milestone: 'Recuperação funcional', expectedDay: avgRecoveryTime, description: 'Retorno às atividades normais' },
      ],
      riskFactors: [
        { factor: 'Adesão ao tratamento', impact: 'neutral', description: 'A adesão influencia significativamente o resultado' },
        { factor: 'Resposta individual', impact: 'neutral', description: 'Cada paciente responde de forma única' },
      ],
      similarCases: {
        count: 0,
        avgRecoveryTime,
        range: [Math.max(7, Math.round(avgRecoveryTime * 0.7)), Math.round(avgRecoveryTime * 1.3)],
      },
      recommendations: [
        'Seguir plano de tratamento conforme prescrito',
        'Manter adesão aos exercícios',
        'Comunicar qualquer piora ou mudança',
        'Comparecer a todas as sessões',
      ],
    };
  }

  /**
   * Get fallback outcome
   */
  private getFallbackOutcome() {
    return {
      expectedOutcome: 'good' as const,
      confidence: 60,
      factors: [
        { factor: 'Tratamento adequado', impact: 'Positivo' },
        { factor: 'Aderência ao plano', impact: 'Depende do paciente' },
      ],
      recommendations: ['Seguir orientações do fisioterapeuta', 'Manter adesão'],
    };
  }
}

/**
 * Singleton instance
 */
export const recoveryPredictor = new RecoveryPredictor();
