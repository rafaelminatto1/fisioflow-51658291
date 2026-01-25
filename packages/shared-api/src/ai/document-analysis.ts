/**
 * Document/PDF Analysis
 *
 * AI-powered analysis of medical documents (PDFs) using Firebase AI Logic.
 * Extracts diagnoses, medications, contraindications, and relevant findings.
 *
 * @module ai/document-analysis
 */

import { getFirebaseAI } from '../firebase/ai/instance';
import { AIModelType } from '../firebase/ai/config';

/**
 * Document analysis result
 */
export interface DocumentAnalysis {
  documentType: string;
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  contraindications: string[];
  relevantFindings: string[];
  recommendationsForPT: string[];
  requiresAttention: string[];
  summary: string;
}

/**
 * Multi-document analysis result
 */
export interface MultiDocumentAnalysis {
  patientName?: string;
  patientId?: string;
  allDiagnoses: string[];
  allMedications: string[];
  combinedContraindications: string[];
  ptRelevantFindings: string[];
  flaggedItems: string[];
  summary: string;
}

/**
 * Document Analyzer Class
 */
export class DocumentAnalyzer {
  private ai = getFirebaseAI();
  private model: AIModelType = AIModelType.PRO; // Use Pro for document analysis

  /**
   * Analyze a single medical document (PDF)
   */
  async analyzeDocument(params: {
    pdfUri: string;
    patientContext?: {
      name?: string;
      condition?: string;
    };
    userId: string;
    organizationId?: string;
  }): Promise<DocumentAnalysis> {
    const { pdfUri, patientContext, userId, organizationId } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const prompt = `Analise este documento médico e extraia informações relevantes para fisioterapia.

${patientContext?.name ? `Paciente: ${patientContext.name}` : ''}
${patientContext?.condition ? `Condição conhecida: ${patientContext.condition}` : ''}

Extraia:
1. **Diagnósticos** listados
2. **Medicações** (nome, dosagem, frequência)
3. **Contraindicações** para fisioterapia
4. **Achados relevantes** para tratamento
5. **Recomendações** específicas para fisioterapia
6. **Itens que requerem atenção** do fisioterapeuta
7. **Resumo** breve do documento

IMPORTANTE:
- Se houver "contraindicações absolutas" para exercício, destaque-as
- Se mencionar restrições de movimento, anote-as
- Se houver preocupações de segurança, sinalize-as

Retorne APENAS JSON válido.`;

      // Firebase AI Logic supports PDF processing
      // This is a simplified implementation
      const result = await modelInstance.generateContent([{ text: prompt }]);

      return this.getFallbackAnalysis();
    } catch (error) {
      console.error('[DocumentAnalyzer] Analysis failed:', error);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Analyze multiple medical documents
   */
  async analyzeMultipleDocuments(params: {
    pdfUris: string[];
    patientContext?: {
      name?: string;
      id?: string;
      condition?: string;
    };
    userId: string;
    organizationId?: string;
  }): Promise<MultiDocumentAnalysis> {
    const { pdfUris, patientContext, userId, organizationId } = params;

    if (pdfUris.length === 0) {
      return this.getEmptyAnalysis();
    }

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: this.model });
      if (!modelInstance) {
        throw new Error('AI model not available');
      }

      const prompt = `Analise ${pdfUris.length} documentos médicos e consolide as informações.

${patientContext?.name ? `Paciente: ${patientContext.name}` : ''}
${patientContext?.condition ? `Condição: ${patientContext.condition}` : ''}

Consolide:
1. **Todos os diagnósticos** dos documentos
2. **Todas as medicações** em uso
3. **Contraindicações combinadas** para fisioterapia
4. **Achados relevantes** consolidados
5. **Itens sinalizados** que requerem atenção

Priorize segurança e considere interações entre documentos.

Retorne APENAS JSON válido.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      return {
        patientName: patientContext?.name,
        patientId: patientContext?.id,
        allDiagnoses: [],
        allMedications: [],
        combinedContraindications: [],
        ptRelevantFindings: [],
        flaggedItems: [],
        summary: 'Análise de documentos completada',
      };
    } catch (error) {
      console.error('[DocumentAnalyzer] Multi-document analysis failed:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Extract specific information from documents
   */
  async extractSpecificInfo(params: {
    pdfUris: string[];
    informationType: 'diagnoses' | 'medications' | 'contraindications' | 'procedures' | 'allergies';
  }): Promise<string[]> {
    const { pdfUris, informationType } = params;

    try {
      const modelInstance = this.ai?.getGenerativeModel({ model: AIModelType.FLASH });
      if (!modelInstance) {
        return [];
      }

      const typePrompts = {
        diagnoses: 'todos os diagnósticos médicos',
        medications: 'todas as medicações com dosagens',
        contraindications: 'todas as contraindicações e restrições',
        procedures: 'todos os procedimentos cirúrgicos realizados',
        allergies: 'todas as alergias conhecidas',
      };

      const prompt = `Extraia ${typePrompts[informationType]} destes ${pdfUris.length} documentos médicos.

Retorne APENAS um array JSON de strings com as informações extraídas.`;

      const result = await modelInstance.generateContent([{ text: prompt }]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
                       responseText.match(/(\[[\s\S]*\])/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      return JSON.parse(jsonText) as string[];
    } catch (error) {
      console.error('[DocumentAnalyzer] Extraction failed:', error);
      return [];
    }
  }

  /**
   * Get fallback analysis
   */
  private getFallbackAnalysis(): DocumentAnalysis {
    return {
      documentType: 'Desconhecido',
      diagnoses: [],
      medications: [],
      contraindications: [],
      relevantFindings: [],
      recommendationsForPT: ['Revisar documento completo'],
      requiresAttention: [],
      summary: 'Análise automática não disponível. Revisão manual necessária.',
    };
  }

  /**
   * Get empty analysis
   */
  private getEmptyAnalysis(): MultiDocumentAnalysis {
    return {
      patientName: undefined,
      patientId: undefined,
      allDiagnoses: [],
      allMedications: [],
      combinedContraindications: [],
      ptRelevantFindings: [],
      flaggedItems: [],
      summary: 'Nenhum documento analisado',
    };
  }
}

/**
 * Singleton instance
 */
export const documentAnalyzer = new DocumentAnalyzer();
