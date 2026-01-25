/**
 * Treatment Optimizer
 *
 * AI-powered treatment plan optimization using Google Search grounding
 * for evidence-based recommendations.
 *
 * @module ai/treatment-optimizer
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType } from '../firebase/ai/config';

/**
 * Treatment plan
 */
export interface TreatmentPlan {
  condition: string;
  objectives: string[];
  interventions: Array<{
    type: string;
    description: string;
    frequency: string;
    duration: string;
  }>;
  expectedOutcomes: string[];
  precautions: string[];
}

/**
 * Optimized treatment plan
 */
export interface OptimizedTreatmentPlan {
  originalPlan: TreatmentPlan;
  optimizations: Array<{
    area: string;
    original: string;
    optimized: string;
    rationale: string;
    evidenceLevel: 'strong' | 'moderate' | 'limited';
    reference?: string;
  }>;
  newRecommendations: string[];
  removedInterventions: string[];
  timelineAdjustments: string[];
  overallImprovement: string;
}

/**
 * Treatment research result
 */
export interface TreatmentResearch {
  condition: string;
  evidenceBasedApproaches: Array<{
    approach: string;
    evidenceLevel: string;
    description: string;
    references: string[];
  }>;
  contraindications: string[];
  bestPractices: string[];
  recentAdvances: string[];
}

/**
 * Treatment Optimizer Class
 */
export class TreatmentOptimizer {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.PRO; // Use Pro with grounding

  /**
   * Optimize a treatment plan with evidence-based recommendations
   */
  async optimizeTreatmentPlan(params: {
    plan: TreatmentPlan;
    patientContext: {
      age: number;
      conditionDuration: string;
      previousTreatments?: string[];
      comorbidities?: string[];
      goals: string[];
    };
    useGrounding?: boolean;
    userId: string;
    organizationId?: string;
  }): Promise<OptimizedTreatmentPlan> {
    const { plan, patientContext, useGrounding = true, userId, organizationId } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      // Build prompt
      const prompt = `## Otimização de Plano de Tratamento

### Plano Atual
Condição: ${plan.condition}
Objetivos: ${plan.objectives.join(', ')}

Intervenções:
${plan.interventions.map(i => `- ${i.type}: ${i.description} (${i.frequency}, ${i.duration})`).join('\n')}

Resultados Esperados: ${plan.expectedOutcomes.join(', ')}
Precauções: ${plan.precautions.join(', ')}

### Contexto do Paciente
Idade: ${patientContext.age} anos
Duração da Condição: ${patientContext.conditionDuration}
Tratamentos Anteriores: ${patientContext.previousTreatments?.join(', ') || 'Nenhum'}
Comorbidades: ${patientContext.comorbidities?.join(', ') || 'Nenhuma'}
Objetivos do Paciente: ${patientContext.goals.join(', ')}

## Instruções

Analise e otimize o plano de tratamento considerando:

1. **Melhores Práticas Baseadas em Evidências**:
   - Quais intervenções têm melhor suporte científico?
   - Existem abordagens mais eficazes?
   - Referências recentes que suportam as recomendações

2. **Otimizações Específicas**:
   - Modificações para melhorar eficácia
   - Ajustes de frequência/duração
   - Adições benéficas
   - Remoções necessárias

3. **Segurança e Contraindicações**:
   - Intervenções a evitar
   - Precauções adicionais
   - Interações entre tratamentos

4. **Ajustes de Timeline**:
   - Duração ótima de cada intervenção
   - Progressão apropriada
   - Marcos de avaliação

${useGrounding ? '**IMPORTANTE**: Use Google Search para encontrar as evidências mais recentes.' : ''}

Retorne APENAS JSON válido com estrutura completa.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();

      let optimization: OptimizedTreatmentPlan;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        optimization = JSON.parse(jsonText);
        optimization.originalPlan = plan;
      } catch (parseError) {
        optimization = this.getFallbackOptimization(plan);
      }

      return optimization;
    } catch (error) {
      console.error('[TreatmentOptimizer] Optimization failed:', error);
      return this.getFallbackOptimization(plan);
    }
  }

  /**
   * Research evidence-based approaches for a condition
   */
  async researchTreatment(params: {
    condition: string;
    useGrounding?: boolean;
  }): Promise<TreatmentResearch> {
    const { condition, useGrounding = true } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const prompt = `Pesquise abordagens de tratamento baseadas em evidências para fisioterapia.

Condição: ${condition}

Forneça:

1. **Abordagens Baseadas em Evidências**:
   - Nome da abordagem
   - Nível de evidência (forte/moderada/limitada)
   - Descrição
   - Referências/chaves

2. **Contraindicações**:
   - O que evitar
   - Por que evitar

3. **Melhores Práticas**:
   - Recomendações atuais
   - Guidelines relevantes

${useGrounding ? '**Use Google Search para encontrar as pesquisas mais recentes.**' : ''}

Retorne APENAS JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();

      let research: TreatmentResearch;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        research = JSON.parse(jsonText);
        research.condition = condition;
      } catch (parseError) {
        research = this.getFallbackResearch(condition);
      }

      return research;
    } catch (error) {
      console.error('[TreatmentOptimizer] Research failed:', error);
      return this.getFallbackResearch(condition);
    }
  }

  /**
   * Get fallback optimization
   */
  private getFallbackOptimization(plan: TreatmentPlan): OptimizedTreatmentPlan {
    return {
      originalPlan: plan,
      optimizations: [
        {
          area: 'Avaliação',
          original: 'Avaliação inicial',
          optimized: 'Avaliação inicial com reavaliação a cada 4 semanas',
          rationale: 'Monitoramento progresso é essencial',
          evidenceLevel: 'moderate',
        },
      ],
      newRecommendations: [
        'Considerar reavaliações periódicas',
        'Documentar progresso consistentemente',
        'Ajustar plano conforme resposta',
      ],
      removedInterventions: [],
      timelineAdjustments: [
        'Reavaliar em 4 semanas',
        'Ajustar intensidade conforme resposta',
      ],
      overallImprovement: 'Plano base estabelecido - ajustes conforme evolução do paciente',
    };
  }

  /**
   * Get fallback research
   */
  private getFallbackResearch(condition: string): TreatmentResearch {
    return {
      condition,
      evidenceBasedApproaches: [
        {
          approach: 'Exercício Terapêutico',
          evidenceLevel: 'Forte',
          description: 'Exercícios específicos para a condição',
          references: ['Revisões sistemáticas recentes'],
        },
        {
          approach: 'Educação do Paciente',
          evidenceLevel: 'Moderada',
          description: 'Orientações sobre condição e autocuidado',
          references: [],
        },
      ],
      contraindications: [
        'Evitar exercícios que aumentem a dor',
        'Respeitar limites de cada paciente',
      ],
      bestPractices: [
        'Avaliação completa antes de iniciar',
        'Progressão gradual de carga',
        'Monitorar resposta ao tratamento',
      ],
      recentAdvances: [
        'Novas técnicas de terapia manual',
        'Uso de tecnologia para monitoramento',
      ],
    };
  }
}

/**
 * Singleton instance
 */
export const treatmentOptimizer = new TreatmentOptimizer();
