/**
 * Clinical Decision Support
 *
 * AI-powered clinical decision support system for physiotherapy.
 * Provides evidence-based recommendations and red flag detection.
 *
 * @module ai/clinical-support
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType } from '../firebase/ai/config';
import { CLINICAL_PROMPTS, buildClinicalSupportPrompt } from './prompts/clinical-prompts';
import type { Patient } from '@fisioflow/shared-types';

/**
 * Clinical analysis result
 */
export interface ClinicalAnalysis {
  redFlags: Array<{
    flag: string;
    urgency: 'immediate' | 'urgent' | 'monitor';
    explanation: string;
    action: string;
  }>;
  evidenceBasedApproaches: Array<{
    approach: string;
    evidenceLevel: 'strong' | 'moderate' | 'limited' | 'expert_opinion';
    description: string;
    reference?: string;
  }>;
  recommendedAssessments: Array<{
    name: string;
    purpose: string;
    description: string;
  }>;
  prognosis: {
    expectedRecoveryTime: string;
    factors: string[];
    milestones: string[];
  };
  precautions: string[];
  contraindications: string[];
}

/**
 * Clinical Decision Support Class
 */
export class ClinicalDecisionSupport {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.PRO; // Use Pro for clinical decisions

  /**
   * Analyze a clinical case and provide decision support
   */
  async analyzeCase(params: {
    patientData: Partial<Patient>;
    currentCondition: string;
    symptoms: string[];
    duration: string;
    previousTreatments?: string[];
    assessmentFindings?: string;
    userId: string;
    organizationId?: string;
  }): Promise<ClinicalAnalysis> {
    const {
      patientData,
      currentCondition,
      symptoms,
      duration,
      previousTreatments,
      assessmentFindings,
      userId,
      organizationId,
    } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const prompt = buildClinicalSupportPrompt({
        patientData,
        currentCondition,
        symptoms,
        duration,
        previousTreatments,
        assessmentFindings,
      });

      const result = await modelInstance.generateContent([
        {
          text: CLINICAL_PROMPTS.SYSTEM.CLINICAL_SUPPORT + '\n\n' + prompt,
        },
      ]);

      const responseText = result.response.text();

      let analysis: ClinicalAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysis = this.getFallbackAnalysis(currentCondition, symptoms);
      }

      return analysis;
    } catch (error) {
      console.error('[ClinicalSupport] Analysis failed:', error);
      return this.getFallbackAnalysis(currentCondition, symptoms);
    }
  }

  /**
   * Get red flags for a specific condition
   */
  async getRedFlags(condition: string, symptoms: string[]): Promise<string[]> {
    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.FLASH_LITE });
      if (!modelInstance) {
        return [];
      }

      const prompt = `Liste sinais de alerta (red flags) para fisioterapia que requerem encaminhamento médico urgente.

Condição: ${condition}
Sintomas atuais: ${symptoms.join(', ')}

Retorne APENAS um array JSON de strings com os red flags.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
                       responseText.match(/(\[[\s\S]*\])/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      return JSON.parse(jsonText) as string[];
    } catch (error) {
      console.error('[ClinicalSupport] Red flags check failed:', error);
      return [];
    }
  }

  /**
   * Get evidence-based treatment approaches
   */
  async getEvidenceBasedApproaches(condition: string): Promise<
    Array<{ approach: string; evidenceLevel: string; description: string }>
  > {
    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.FLASH });
      if (!modelInstance) {
        return [];
      }

      const prompt = `Liste abordagens de tratamento baseadas em evidências para fisioterapia.

Condição: ${condition}

Para cada abordagem, inclua:
- Nome da abordagem
- Nível de evidência (forte/moderada/limitada)
- Descrição breve

Retorne APENAS um array JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
                       responseText.match(/(\[[\s\S]*\])/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[ClinicalSupport] Evidence-based approaches failed:', error);
      return [];
    }
  }

  /**
   * Get fallback analysis
   */
  private getFallbackAnalysis(condition: string, symptoms: string[]): ClinicalAnalysis {
    return {
      redFlags: [
        {
          flag: 'Dor torácica ou falta de ar',
          urgency: 'immediate',
          explanation: 'Sinais de emergência médica',
          action: 'Encaminhar para emergência imediatamente',
        },
      ],
      evidenceBasedApproaches: [
        {
          approach: 'Avaliação e tratamento individualizado',
          evidenceLevel: 'expert_opinion',
          description: 'Plano baseado em avaliação completa do paciente',
        },
      ],
      recommendedAssessments: [
        {
          name: 'Avaliação física completa',
          purpose: 'Estabelecer baseline',
          description: 'Avaliar amplitude de movimento, força, funcionalidade',
        },
      ],
      prognosis: {
        expectedRecoveryTime: 'Depende da condição específica',
        factors: ['Adesão ao tratamento', 'Gravidade da condição', 'Comorbidades'],
        milestones: ['Melhora dos sintomas', 'Retorno às atividades', 'Alta fisioterapêutica'],
      },
      precautions: [
        'Respeitar limites de dor',
        'Monitorar resposta ao tratamento',
        'Interromper se houver piora',
      ],
      contraindications: [],
    };
  }
}

/**
 * Singleton instance
 */
export const clinicalSupport = new ClinicalDecisionSupport();
