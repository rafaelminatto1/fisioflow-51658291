import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import Groq from 'groq-sdk';
import { logger } from '../lib/logger';

const GROQ_API_KEY = defineString('GROQ_API_KEY');

let groq: Groq;

const getGroq = () => {
  if (!groq) {
    const key = GROQ_API_KEY.value();
    if (!key) throw new Error('GROQ_API_KEY not configured');
    groq = new Groq({ apiKey: key });
  }
  return groq;
};

/**
 * Processamento ultra-rápido de texto (Correção, Formatação, Extração)
 */
export const aiFastProcessingHandler = async (request: any) => {
  const { text, mode } = request.data;

  if (!text) {
    throw new HttpsError('invalid-argument', 'Text is required');
  }

  try {
    const client = getGroq();
    let systemPrompt = '';

    switch (mode) {
      case 'fix_grammar':
        systemPrompt = `Você é um assistente médico especialista em fisioterapia. 
        Sua tarefa é corrigir a gramática, expandir abreviações médicas comuns (ex: ADM -> Amplitude de Movimento, MMII -> Membros Inferiores) e tornar o texto mais profissional para um prontuário.
        Mantenha o tom técnico. Não adicione informações que não existem no texto original. Responda APENAS com o texto corrigido.`;
        break;
      
      case 'summarize':
        systemPrompt = 'Resuma o seguinte texto clínico em tópicos (bullet points) concisos. Responda APENAS com os tópicos.';
        break;

      default:
        systemPrompt = 'Melhore o seguinte texto.';
    }

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      model: 'llama3-70b-8192', // Modelo rápido e inteligente
      temperature: 0.3, // Baixa temperatura para ser mais determinístico/técnico
      max_tokens: 1024,
    });

    const result = completion.choices[0]?.message?.content || '';
    
    return { 
      result: result.trim(),
      model: 'llama3-70b-8192-groq'
    };

  } catch (error: any) {
    logger.error('Groq AI Error', error);
    throw new HttpsError('internal', 'AI processing failed: ' + error.message);
  }
};

export const aiFastProcessing = onCall({ region: 'southamerica-east1' }, aiFastProcessingHandler);
