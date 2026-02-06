/**
 * Google AI Client - Frontend
 *
 * Serviço cliente para chamadas diretas às APIs do Google AI (Gemini)
 * Usa a API key configurada nas variáveis de ambiente
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Tipos de modelos Gemini disponíveis */
export enum GeminiModel {
  GEMINI_2_5_FLASH = 'gemini-2.5-flash-lite-preview-06-17',
  GEMINI_2_5_PRO = 'gemini-2.5-pro-preview-03-25',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_1_5_PRO = 'gemini-1.5-pro',
}

export interface GenerateContentOptions {
  model?: GeminiModel;
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export interface GenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Classe cliente para Google Gemini API
 */
export class GeminiClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || GEMINI_API_KEY;
    this.apiUrl = GEMINI_API_URL;

    if (!this.apiKey) {
      console.warn('Gemini API Key não configurada. Usando modo mock.');
    }
  }

  /**
   * Gera conteúdo de texto com Gemini
   */
  async generateContent(
    prompt: string,
    options: GenerateContentOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      return this.mockResponse(prompt);
    }

    const model = options.model || GeminiModel.GEMINI_2_5_FLASH;

    try {
      const response = await fetch(
        `${this.apiUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 8192,
              topK: options.topK ?? 40,
              topP: options.topP ?? 0.95,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data: GenerateContentResponse = await response.json();

      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Erro ao chamar Gemini API:', error);
      throw error;
    }
  }

  /**
   * Chat com histórico de mensagens
   */
  async chat(
    messages: ChatMessage[],
    options: GenerateContentOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      return this.mockResponse(messages[messages.length - 1]?.parts[0]?.text || '');
    }

    const model = options.model || GeminiModel.GEMINI_2_5_PRO;

    try {
      const response = await fetch(
        `${this.apiUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 8192,
              topK: options.topK ?? 40,
              topP: options.topP ?? 0.95,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data: GenerateContentResponse = await response.json();

      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Erro ao chamar Gemini API:', error);
      throw error;
    }
  }

  /**
   * Gera conteúdo com streaming
   */
  async *generateContentStream(
    prompt: string,
    options: GenerateContentOptions = {}
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      yield this.mockResponse(prompt);
      return;
    }

    const model = options.model || GeminiModel.GEMINI_2_5_FLASH;

    try {
      const response = await fetch(
        `${this.apiUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro no streaming:', error);
      throw error;
    }
  }

  /**
   * Analisa imagem com Gemini Vision
   */
  async analyzeImage(
    imageData: string, // Base64 ou URL
    prompt: string,
    options: GenerateContentOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      return this.mockResponse(prompt);
    }

    const model = options.model || GeminiModel.GEMINI_2_5_PRO;

    try {
      const response = await fetch(
        `${this.apiUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: imageData.startsWith('data:')
                        ? imageData.split(',')[1]
                        : imageData,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Gemini Vision API error:', error);
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data: GenerateContentResponse = await response.json();

      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      throw error;
    }
  }

  /**
   * Resposta mockada para quando não há API key configurada
   */
  private mockResponse(prompt: string): string {
    if (prompt.toLowerCase().includes('classifique') || prompt.toLowerCase().includes('tipo')) {
      return JSON.stringify({
        type: 'clinical_report',
        confidence: 0.85,
      });
    }

    if (prompt.toLowerCase().includes('resumo') || prompt.toLowerCase().includes('achevedos')) {
      return JSON.stringify({
        keyFindings: ['Paciente apresenta melhora na mobilidade', 'Dor reduzida de 7 para 3 na EVA'],
        impression: 'Evolução favorável no tratamento fisioterapêutico',
        recommendations: ['Continuar protocolo atual', 'Adicionar exercícios de fortalecimento'],
      });
    }

    return 'Esta é uma resposta simulada do Gemini. Configure a VITE_GEMINI_API_KEY para usar a API real.';
  }

  /**
   * Verifica se a API key está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '' && this.apiKey !== 'your-google-ai-api-key-here';
  }
}

/**
 * Instância singleton do cliente
 */
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient();
  }
  return geminiClientInstance;
}

/**
 * Helper para gerar conteúdo de forma simples
 */
export async function generateText(
  prompt: string,
  options?: GenerateContentOptions
): Promise<string> {
  const client = getGeminiClient();
  return client.generateContent(prompt, options);
}

/**
 * Helper para chat simples
 */
export async function chat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  options?: GenerateContentOptions
): Promise<string> {
  const client = getGeminiClient();

  const messages: ChatMessage[] = [
    ...history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  return client.chat(messages, options);
}
