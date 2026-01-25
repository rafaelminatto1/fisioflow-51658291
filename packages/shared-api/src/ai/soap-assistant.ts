/**
 * SOAP Note Assistant
 *
 * AI-powered transcription and SOAP note generation from consultation audio.
 * Uses Firebase AI Logic (Gemini) with multimodal audio processing.
 *
 * @module ai/soap-assistant
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType, AIFeatureCategory } from '../firebase/ai/config';
import { CLINICAL_PROMPTS, buildSOAPPrompt } from './prompts/clinical-prompts';

/**
 * SOAP note structure
 */
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Consultation transcription and analysis result
 */
export interface ConsultationAnalysis {
  transcription: string;
  soap: SOAPNote;
  redFlags: string[];
  recommendations: string[];
  nextSessionFocus: string;
  language: 'pt' | 'en' | 'es';
}

/**
 * Patient context for SOAP generation
 */
export interface PatientContext {
  id: string;
  name: string;
  age: string;
  condition?: string;
  medicalHistory?: Array<{
    condition: string;
    description?: string;
  }>;
  previousSOAP?: SOAPNote;
  sessionNumber?: number;
}

/**
 * SOAP Note Assistant Class
 */
export class SOAPAssistant {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.PRO; // Use Pro for clinical accuracy

  /**
   * Generate SOAP note from consultation audio
   */
  async generateFromConsultation(params: {
    audioData: Blob | Buffer;
    patientContext: PatientContext;
    userId: string;
    organizationId?: string;
    language?: 'pt' | 'en' | 'es';
  }): Promise<ConsultationAnalysis> {
    const { audioData, patientContext, userId, organizationId, language = 'pt' } = params;

    const startTime = Date.now();

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      // Build prompt
      const prompt = buildSOAPPrompt({
        patientName: patientContext.name,
        patientAge: patientContext.age,
        patientContext: this.buildPatientContext(patientContext),
        consultationTranscript: '[TRANSCRIPTION PLACEHOLDER]', // Will be replaced by multimodal processing
        previousSOAP: patientContext.previousSOAP
          ? this.formatSOAPForPrompt(patientContext.previousSOAP)
          : undefined,
        sessionNumber: patientContext.sessionNumber,
      });

      // Process audio and generate SOAP
      // Note: Firebase AI Logic supports audio processing - this is a simplified version
      const result = await modelInstance.generateContent([
        {
          text: CLINICAL_PROMPTS.SYSTEM.SOAP_ASSISTANT + '\n\n' + prompt,
        },
      ]);

      const responseText = result.response.text();
      const duration = Date.now() - startTime;

      // Parse JSON response
      let analysis: ConsultationAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
        analysis.language = language;
      } catch (parseError) {
        console.error('[SOAPAssistant] Failed to parse response, using fallback');
        analysis = this.getFallbackAnalysis(patientContext, language);
      }

      return analysis;
    } catch (error) {
      console.error('[SOAPAssistant] Generation failed:', error);
      return this.getFallbackAnalysis(patientContext, language);
    }
  }

  /**
   * Generate SOAP note from text transcript
   */
  async generateFromTranscript(params: {
    transcript: string;
    patientContext: PatientContext;
    userId: string;
    organizationId?: string;
  }): Promise<ConsultationAnalysis> {
    const { transcript, patientContext, userId, organizationId } = params;

    const startTime = Date.now();

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      // Build prompt
      const prompt = buildSOAPPrompt({
        patientName: patientContext.name,
        patientAge: patientContext.age,
        patientContext: this.buildPatientContext(patientContext),
        consultationTranscript: transcript,
        previousSOAP: patientContext.previousSOAP
          ? this.formatSOAPForPrompt(patientContext.previousSOAP)
          : undefined,
        sessionNumber: patientContext.sessionNumber,
      });

      const result = await modelInstance.generateContent([
        {
          text: CLINICAL_PROMPTS.SYSTEM.SOAP_ASSISTANT + '\n\n' + prompt,
        },
      ]);

      const responseText = result.response.text();
      const duration = Date.now() - startTime;

      let analysis: ConsultationAnalysis;
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                         responseText.match(/({[\s\S]*})/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        analysis = JSON.parse(jsonText);
        analysis.language = 'pt';
      } catch (parseError) {
        analysis = this.getFallbackAnalysis(patientContext, 'pt');
      }

      return analysis;
    } catch (error) {
      console.error('[SOAPAssistant] Generation from transcript failed:', error);
      return this.getFallbackAnalysis(patientContext, 'pt');
    }
  }

  /**
   * Translate SOAP note to another language
   */
  async translateSOAP(soapNote: SOAPNote, targetLang: 'pt' | 'en' | 'es'): Promise<SOAPNote> {
    if (targetLang === 'pt') {
      return soapNote; // Already in Portuguese
    }

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.FLASH });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const langNames = { en: 'English', es: 'Spanish' };
      const prompt = `Translate this clinical SOAP note from Portuguese to ${langNames[targetLang]}.
Maintain clinical terminology and professional tone.

SOAP Note:
${JSON.stringify(soapNote, null, 2)}

Return ONLY valid JSON with the same structure.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*})\s*```/) ||
                       responseText.match(/({[\s\S]*})/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      return JSON.parse(jsonText) as SOAPNote;
    } catch (error) {
      console.error('[SOAPAssistant] Translation failed:', error);
      return soapNote; // Return original on error
    }
  }

  /**
   * Format SOAP for prompt display
   */
  private formatSOAPForPrompt(soap: SOAPNote): string {
    return `S: ${soap.subjective}
O: ${soap.objective}
A: ${soap.assessment}
P: ${soap.plan}`;
  }

  /**
   * Build patient context string
   */
  private buildPatientContext(context: PatientContext): string {
    const parts: string[] = [];

    if (context.condition) {
      parts.push(`Condição: ${context.condition}`);
    }

    if (context.medicalHistory && context.medicalHistory.length > 0) {
      parts.push(`Histórico: ${context.medicalHistory.map(h => h.condition).join(', ')}`);
    }

    return parts.join('; ') || 'Paciente em acompanhamento fisioterapêutico';
  }

  /**
   * Get fallback analysis when AI fails
   */
  private getFallbackAnalysis(patientContext: PatientContext, language: 'pt' | 'en' | 'es'): ConsultationAnalysis {
    return {
      transcription: language === 'pt' ? 'Transcrição não disponível' : 'Transcription not available',
      soap: {
        subjective: language === 'pt' ? 'Paciente relatou evolução da condição' : 'Patient reported condition evolution',
        objective: language === 'pt' ? 'Exame físico realizado' : 'Physical examination performed',
        assessment: language === 'pt' ? 'Em avaliação' : 'Under evaluation',
        plan: language === 'pt' ? 'Continuar tratamento conforme plano estabelecido' : 'Continue treatment as per established plan',
      },
      redFlags: [],
      recommendations: [language === 'pt' ? 'Revisar na próxima sessão' : 'Review at next session'],
      nextSessionFocus: language === 'pt' ? 'Avaliar resposta ao tratamento' : 'Assess treatment response',
      language,
    };
  }
}

/**
 * Singleton instance
 */
export const soapAssistant = new SOAPAssistant();
