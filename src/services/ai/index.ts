/**
 * AI Services Index
 *
 * Exporta todos os serviços de IA disponíveis
 */

// Marketing AI Template Service
export * from './marketingAITemplateService';

// Gemini Vision Service
export * from './geminiVisionService';

// AI runtime service
export * from '@/integrations/neon/ai';

export type {
  GenerateReviewTemplateInput,
  GenerateBirthdayTemplateInput,
  GenerateRecallTemplateInput,
  GenerateFisiolinkTemplateInput,
  GeneratedTemplateResponse,
  GenerateSOAPTemplateInput,
  SOAPTemplateResponse,
  GenerateMythVsTruthInput,
} from './marketingAITemplateService';
