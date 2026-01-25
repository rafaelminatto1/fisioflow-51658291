/**
 * Pain Map Analysis
 *
 * AI-powered analysis of pain patterns and evolution across multiple assessments.
 *
 * @module ai/pain-analysis
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType } from '../firebase/ai/config';
import type { BodyPart } from '@fisioflow/shared-types';

/**
 * Pain map data point
 */
export interface PainMapData {
  date: string;
  painAreas: Array<{
    part: BodyPart;
    level: number; // 0-10
    side?: 'left' | 'right' | 'bilateral';
    type?: 'acute' | 'chronic' | 'radicular';
  }>;
  notes?: string;
}

/**
 * Pain pattern analysis result
 */
export interface PainPatternAnalysis {
  evolution: {
    overallTrend: 'improving' | 'stable' | 'worsening';
    improvementPercentage: number;
    summary: string;
  };
  painMigration: Array<{
    from: BodyPart;
    to: BodyPart;
    description: string;
  }>;
  responseToTreatment: {
    responding: boolean;
    areas: Array<{
      part: BodyPart;
      response: 'good' | 'moderate' | 'poor';
    }>;
  };
  emergingAreas: BodyPart[];
  prognosisIndicators: string[];
  recommendations: string[];
}

/**
 * Pain Map Analyzer Class
 */
export class PainMapAnalyzer {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.FLASH;

  /**
   * Analyze pain patterns across multiple assessments
   */
  async analyzePainPatterns(params: {
    painMaps: PainMapData[];
    patientCondition: string;
    treatmentStartDate: string;
    userId: string;
    organizationId?: string;
  }): Promise<PainPatternAnalysis> {
    const { painMaps, patientCondition, treatmentStartDate, userId, organizationId } = params;

    if (painMaps.length < 2) {
      return this.getInsufficientDataAnalysis();
    }

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      // Build prompt
      const painMapsText = painMaps.map((map, i) => {
        const areas = map.painAreas.map(a =>
          `${a.part}${a.side ? ` (${a.side})` : ''}: ${a.level}/10${a.type ? ` - ${a.type}` : ''}`
        ).join(', ');
        return `Avaliação ${i + 1} (${map.date}): ${areas}${map.notes ? `. Notas: ${map.notes}` : ''}`;
      }).join('\n');

      const prompt = `## Análise de Evolução da Dor

### Condição
${patientCondition}

### Início do Tratamento
${treatmentStartDate}

### Histórico de Avaliações de Dor (${painMaps.length} avaliações)
${painMapsText}

## Análise Solicitada

Por favor, forneça:

1. **Evolução Geral**:
   - Tendência: melhorando/estável/piorando
   - Porcentagem de melhora
   - Resumo da evolução

2. **Migração da Dor**:
   - Áreas que mudaram de local
   - Padrões de migração identificados

3. **Resposta ao Tratamento**:
   - Está respondendo?
   - Quais áreas respondem melhor/pior

4. **Áreas Emergentes**:
   - Novas áreas de dor que surgiram
   - Áreas que requerem atenção

5. **Indicadores de Prognóstico**:
   - Sinais positivos
   - Sinais de preocupação

6. **Recomendações**:
   - Ajustes no tratamento
   - Áreas para focar

Retorne APENAS JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();

      let analysis: PainPatternAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysis = this.calculateBasicAnalysis(painMaps);
      }

      return analysis;
    } catch (error) {
      console.error('[PainAnalyzer] Analysis failed:', error);
      return this.calculateBasicAnalysis(painMaps);
    }
  }

  /**
   * Calculate basic analysis without AI
   */
  private calculateBasicAnalysis(painMaps: PainMapData[]): PainPatternAnalysis {
    const first = painMaps[0];
    const last = painMaps[painMaps.length - 1];

    // Calculate average pain levels
    const firstAvg = first.painAreas.reduce((sum, a) => sum + a.level, 0) / Math.max(1, first.painAreas.length);
    const lastAvg = last.painAreas.reduce((sum, a) => sum + a.level, 0) / Math.max(1, last.painAreas.length);

    const improvementPercentage = firstAvg > 0 ? ((firstAvg - lastAvg) / firstAvg) * 100 : 0;

    let overallTrend: 'improving' | 'stable' | 'worsening';
    if (improvementPercentage > 10) overallTrend = 'improving';
    else if (improvementPercentage < -10) overallTrend = 'worsening';
    else overallTrend = 'stable';

    // Identify emerging areas
    const firstAreas = new Set(first.painAreas.map(a => a.part));
    const lastAreas = new Set(last.painAreas.map(a => a.part));
    const emergingAreas = Array.from(lastAreas).filter(a => !firstAreas.has(a)) as BodyPart[];

    return {
      evolution: {
        overallTrend,
        improvementPercentage,
        summary: this.getEvolutionSummary(overallTrend, improvementPercentage),
      },
      painMigration: [],
      responseToTreatment: {
        responding: overallTrend === 'improving',
        areas: last.painAreas.map(a => ({
          part: a.part,
          response: a.level <= 3 ? 'good' : a.level <= 6 ? 'moderate' : 'poor',
        })),
      },
      emergingAreas,
      prognosisIndicators: overallTrend === 'improving'
        ? ['Resposta positiva ao tratamento', 'Redução da dor']
        : overallTrend === 'worsening'
        ? ['Aumento da dor', 'Possível necessidade de ajuste']
        : ['Estabilidade dos sintomas'],
      recommendations: overallTrend === 'improving'
        ? ['Continuar tratamento atual', 'Monitorar áreas remanescentes']
        : overallTrend === 'worsening'
        ? ['Reavaliar plano de tratamento', 'Investigar causas de piora']
        : ['Considerar progressão do tratamento', 'Monitorar evolução'],
    };
  }

  /**
   * Get evolution summary
   */
  private getEvolutionSummary(trend: string, percentage: number): string {
    if (trend === 'improving') {
      return `Melhora de ${percentage.toFixed(0)}% na intensidade da dor`;
    } else if (trend === 'worsening') {
      return `Piora de ${Math.abs(percentage).toFixed(0)}% na intensidade da dor`;
    }
    return 'Estabilidade dos sintomas dolorosos';
  }

  /**
   * Get insufficient data analysis
   */
  private getInsufficientDataAnalysis(): PainPatternAnalysis {
    return {
      evolution: {
        overallTrend: 'stable',
        improvementPercentage: 0,
        summary: 'Dados insuficientes para análise (mínimo 2 avaliações necessárias)',
      },
      painMigration: [],
      responseToTreatment: {
        responding: false,
        areas: [],
      },
      emergingAreas: [],
      prognosisIndicators: ['Mais avaliações necessárias'],
      recommendations: ['Continue monitorando a dor regularmente'],
    };
  }
}

/**
 * Singleton instance
 */
export const painMapAnalyzer = new PainMapAnalyzer();
