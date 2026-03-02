/**
 * Marketing AI Service
 *
 * Serviço para geração automática de templates de marketing usando IA
 * Usa a API Gemini gratuita (100 requisições/dia)
 */

import { callFunctionHttp } from '@/integrations/firebase/functions';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateReviewTemplateInput {
  clinicName?: string;
  clinicSpecialty?: string;
  tone?: 'professional' | 'friendly' | 'casual';
  includeDiscount?: boolean;
  discountValue?: number;
  delayHours?: number;
}

export interface GenerateBirthdayTemplateInput {
  patientName?: string;
  clinicName?: string;
  relationship?: 'formal' | 'friendly' | 'warm';
  includeOffer?: boolean;
}

export interface GenerateRecallTemplateInput {
  patientName?: string;
  daysWithoutVisit?: number;
  clinicName?: string;
  clinicSpecialty?: string;
  motivationType?: 'health' | 'followup' | 'promotion';
}

export interface GenerateFisiolinkTemplateInput {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  whatsappNumber?: string;
  googleMapsUrl?: string;
  clinicDescription?: string;
}

export interface GenerateMythVsTruthInput {
  topic: string;
  tone?: 'educational' | 'surprising' | 'direct';
}

export interface GeneratedTemplateResponse {
  success: boolean;
  template?: string;
  error?: string;
  suggestions?: string[];
}

export interface GenerateMarketingContentInput {
  type: 'review' | 'birthday' | 'recall' | 'fisiolink' | 'caption';
  context?: Record<string, any>;
  tone?: 'professional' | 'friendly' | 'casual';
  language?: string;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const REVIEW_PROMPT_TEMPLATE = (input: GenerateReviewTemplateInput) => `
Como especialista em marketing para fisioterapia, gere uma mensagem para solicitar avaliações no Google.

Contexto:
- Nome da clínica: ${input.clinicName || 'Sua Clínica'}
- Especialidade: ${input.clinicSpecialty || 'Fisioterapia'}
- Tom: ${input.tone || 'profissional'}
${input.includeDiscount ? `- Incluir oferta de desconto: ${input.discountValue || 10}%` : ''}
${input.delayHours ? `- Delay após alta: ${input.delayHours} horas` : ''}

Requisitos:
1. Mensagem curta e persuasiva (máximo 200 caracteres)
2. Usar variáveis disponíveis: {nome}, {review_link}
3. Tom ${input.tone || 'profissional'} mas acolhedor
4. Incluir call-to-action claro
5. Usar emoji apropriado
6. Retornar APENAS a mensagem, sem explicações

Retorne no formato JSON:
{
  "template": "mensagem gerada com variáveis",
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

const BIRTHDAY_PROMPT_TEMPLATE = (input: GenerateBirthdayTemplateInput) => `
Como especialista em relacionamento com pacientes, gere uma mensagem de aniversário.

Contexto:
- Nome do paciente: ${input.patientName || '[Nome do Paciente]'}
- Nome da clínica: ${input.clinicName || 'Sua Clínica'}
- Relacionamento: ${input.relationship || 'friendly'}
${input.includeOffer ? '- Incluir uma oferta especial de aniversário' : ''}

Requisitos:
1. Mensagem calorosa e personalizada (máximo 180 caracteres)
2. Usar variáveis disponíveis: {nome}
3. Tom ${input.relationship || 'amigável'}
4. Incluir emojis de celebração apropriados
5. Retornar APENAS a mensagem, sem explicações

Retorne no formato JSON:
{
  "template": "mensagem gerada com variáveis",
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

const RECALL_PROMPT_TEMPLATE = (input: GenerateRecallTemplateInput) => `
Como especialista em recall de pacientes, gere uma mensagem para pacientes que não visitam há muito tempo.

Contexto:
- Nome do paciente: ${input.patientName || '[Nome do Paciente]'}
- Dias sem visita: ${input.daysWithoutVisit || 180}
- Nome da clínica: ${input.clinicName || 'Sua Clínica'}
- Especialidade: ${input.clinicSpecialty || 'Fisioterapia'}
- Tipo de motivação: ${input.motivationType || 'saúde'}

Requisitos:
1. Mensagem cuidadosa e acolhedora (máximo 180 caracteres)
2. Usar variáveis disponíveis: {nome}, {dias}
3. Tom amigável mas profissional
4. Incluir call-to-action claro
5. Retornar APENAS a mensagem, sem explicações

Retorne no formato JSON:
{
  "template": "mensagem gerada com variáveis",
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

const FISIOLINK_PROMPT_TEMPLATE = (input: GenerateFisiolinkTemplateInput) => `
Como especialista em bio links para redes sociais, gere descrições para um FisioLink.

Contexto:
- Nome da clínica: ${input.clinicName || 'Sua Clínica'}
- Endereço: ${input.clinicAddress || '[Endereço]'}
- Telefone: ${input.clinicPhone || '[Telefone]'}
- Email: ${input.clinicEmail || '[Email]'}
- WhatsApp: ${input.whatsappNumber || '[WhatsApp]'}
- Descrição: ${input.clinicDescription || '[Descrição]'}

Requisitos:
1. Gerar 3 opções de biografia (curta, média, completa)
2. Incluir emojis apropriados
3. Tom profissional e convidativo
4. Destacar principais serviços
5. Retornar no formato JSON com opções

Retorne no formato JSON:
{
  "templates": {
    "short": "bio curta (máx 80 caracteres)",
    "medium": "bio média (máx 150 caracteres)",
    "full": "bio completa"
  },
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

const SOCIAL_CAPTION_PROMPT_TEMPLATE = (type: string, context: Record<string, any>) => `
Como especialista em marketing para fisioterapia, gere uma legenda para redes sociais.

Tipo de conteúdo: ${type}
Contexto: ${JSON.stringify(context)}

Requisitos:
1. Legenda atraente e profissional
2. Usar hashtags relevantes
3. Incluir emojis apropriados
4. Call-to-action quando aplicável
5. Retornar no formato JSON com legenda e hashtags

Retorne no formato JSON:
{
  "caption": "legenda gerada",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

const MYTH_PROMPT_TEMPLATE = (input: GenerateMythVsTruthInput) => `
Como especialista em educação em saúde e fisioterapia, gere um conteúdo no formato "Mito vs Verdade".

Tópico: ${input.topic}
Tom: ${input.tone || 'educativo'}

Requisitos:
1. Identifique um mito comum e difundido sobre o tópico
2. Apresente a verdade científica baseada em evidências
3. Forneça uma explicação concisa (máximo 250 caracteres)
4. Use linguagem clara para o paciente
5. Retorne APENAS o JSON estruturado

Retorne no formato JSON:
{
  "myth": "o mito identificado",
  "truth": "a verdade científica",
  "explanation": "explicação detalhada concisa",
  "suggestions": ["sugestão de imagem 1", "sugestão de hashtag"]
}
`;

// ============================================================================
// TEMPLATES DEFAULT (fallback quando IA não está disponível)
// ============================================================================

const DEFAULT_REVIEW_TEMPLATES = {
  professional: 'Olá {nome}! 🌟 Gostaríamos de saber sua opinião sobre nosso atendimento. Sua avaliação ajuda muito! Agradeçemos por seu tempo. ⭐ {review_link}',
  friendly: 'Oi {nome}! 😊 Como foi sua experiência? Se puder, deixe uma avaliaçãozinha pra gente! Faz toda a diferença! ❤️ {review_link}',
  casual: 'E aí {nome}! 😄 Conta pra gente como foi? Deixa aquela estrela aí que a gente fica muito feliz! ⭐⭐⭐⭐⭐ {review_link}',
};

const DEFAULT_BIRTHDAY_TEMPLATES = {
  formal: 'Estimado(a) {nome}, a equipe da clínica deseja a você um feliz aniversário repleto de saúde, paz e realizações. 🎂',
  friendly: 'Olá {nome}! 🎉 Tudo de bom? Hoje é seu dia especial! Que este novo ciclo traga muita saúde, alegria e conquistas! Parabéns! 🎂🥳',
  warm: 'Oi {nome}! 🌟 Queremos te parabenizar pelo seu aniversário! É uma alegria te acompanhar nesta jornada de saúde. Que seu dia seja incrível! 🎉🎂',
};

const DEFAULT_RECALL_TEMPLATES = {
  health: 'Olá {nome}! Sentimos sua falta. Já faz {dias} dias desde sua última visita. Que tal agendar um check-up? Sua saúde é nossa prioridade! 💪',
  followup: 'Oi {nome}! 👋 Estamos pensando em você! Faz {dias} dias que não vimos por aqui. Como você está? Vamos marcar uma sessão?',
  promotion: 'Olá {nome}! 🎁 Estamos com uma promoção especial pra você! Faz {dias} dias que nos visitou. Agende agora e ganhe 10% OFF! 📞',
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Gera template de mensagem de review usando IA
 */
export async function generateReviewTemplate(input: GenerateReviewTemplateInput): Promise<GeneratedTemplateResponse> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      template: string;
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: REVIEW_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.template) {
      return {
        success: true,
        template: result.template,
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para templates pré-definidos
    const tone = input.tone || 'professional';
    const fallbackTemplate = DEFAULT_REVIEW_TEMPLATES[tone as keyof typeof DEFAULT_REVIEW_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: [
        'Personalize com o nome do paciente',
        'Adicione emoji para tornar mais amigável',
        'Inclua um call-to-action claro',
      ],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating review template:', error);
    // Fallback para templates pré-definidos
    const tone = input.tone || 'professional';
    const fallbackTemplate = DEFAULT_REVIEW_TEMPLATES[tone as keyof typeof DEFAULT_REVIEW_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: ['Usando template padrão (IA indisponível)'],
    };
  }
}

/**
 * Gera template de mensagem de aniversário usando IA
 */
export async function generateBirthdayTemplate(input: GenerateBirthdayTemplateInput): Promise<GeneratedTemplateResponse> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      template: string;
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: BIRTHDAY_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.template) {
      return {
        success: true,
        template: result.template,
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para templates pré-definidos
    const relationship = input.relationship || 'friendly';
    const fallbackTemplate = DEFAULT_BIRTHDAY_TEMPLATES[relationship as keyof typeof DEFAULT_BIRTHDAY_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: [
        'Inclua uma oferta especial',
        'Personalize com o nome do paciente',
        'Adicione emojis de celebração',
      ],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating birthday template:', error);
    // Fallback para templates pré-definidos
    const relationship = input.relationship || 'friendly';
    const fallbackTemplate = DEFAULT_BIRTHDAY_TEMPLATES[relationship as keyof typeof DEFAULT_BIRTHDAY_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: ['Usando template padrão (IA indisponível)'],
    };
  }
}

/**
 * Gera template de mensagem de recall usando IA
 */
export async function generateRecallTemplate(input: GenerateRecallTemplateInput): Promise<GeneratedTemplateResponse> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      template: string;
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: RECALL_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.template) {
      return {
        success: true,
        template: result.template,
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para templates pré-definidos
    const motivationType = input.motivationType || 'health';
    const fallbackTemplate = DEFAULT_RECALL_TEMPLATES[motivationType as keyof typeof DEFAULT_RECALL_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: [
        'Personalize com o tempo sem visita',
        'Inclua uma oferta de retorno',
        'Use tom acolhedor',
      ],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating recall template:', error);
    // Fallback para templates pré-definidos
    const motivationType = input.motivationType || 'health';
    const fallbackTemplate = DEFAULT_RECALL_TEMPLATES[motivationType as keyof typeof DEFAULT_RECALL_TEMPLATES];

    return {
      success: true,
      template: fallbackTemplate,
      suggestions: ['Usando template padrão (IA indisponível)'],
    };
  }
}

/**
 * Gera templates para FisioLink usando IA
 */
export async function generateFisiolinkTemplates(input: GenerateFisiolinkTemplateInput): Promise<{
  success: boolean;
  templates?: {
    short: string;
    medium: string;
    full: string;
  };
  error?: string;
  suggestions?: string[];
}> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      templates: {
        short: string;
        medium: string;
        full: string;
      };
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: FISIOLINK_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.templates) {
      return {
        success: true,
        templates: result.templates,
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para templates pré-definidos
    const clinicName = input.clinicName || 'Nossa Clínica';

    return {
      success: true,
      templates: {
        short: `🏥 ${clinicName} - Fisioterapia Especializada`,
        medium: `🏥 ${clinicName}\nFisioterapia especializada com foco em reabilitação e saúde.\n📞 Agende online!`,
        full: `🏥 ${clinicName}\n\nFisioterapia especializada com foco em reabilitação, saúde e qualidade de vida.\n\n📍 ${input.clinicAddress || 'Endereço'}\n📞 ${input.clinicPhone || 'Telefone'}\n📧 ${input.whatsappNumber || 'WhatsApp'}\n\n🗓 Atendemos de segunda a sexta\n\n#Fisioterapia #Saúde #Reabilitação`,
      },
      suggestions: [
        'Inclua informações de contato',
        'Adicione horários de atendimento',
        'Destaque seus serviços principais',
      ],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating FisioLink templates:', error);
    // Fallback para templates pré-definidos
    const clinicName = input.clinicName || 'Nossa Clínica';

    return {
      success: true,
      templates: {
        short: `🏥 ${clinicName} - Fisioterapia`,
        medium: `🏥 ${clinicName}\nFisioterapia especializada. Agende online! 📞`,
        full: `🏥 ${clinicName}\n\nFisioterapia especializada com foco em saúde.\n\n📍 ${input.clinicAddress || ''}\n📞 ${input.clinicPhone || ''}`,
      },
      suggestions: ['Usando templates padrão (IA indisponível)'],
    };
  }
}

/**
 * Gera legenda para redes sociais usando IA
 */
export async function generateSocialCaption(
  type: 'motivational' | 'technical' | 'educational' | 'celebration',
  context: Record<string, any>
): Promise<{
  success: boolean;
  caption?: string;
  hashtags?: string[];
  suggestions?: string[];
  error?: string;
}> {
  try {
    const prompt = SOCIAL_CAPTION_PROMPT_TEMPLATE(type, context);

    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      caption: string;
      hashtags?: string[];
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt, language: 'pt-BR' }
    );

    if (result.caption) {
      return {
        success: true,
        caption: result.caption,
        hashtags: result.hashtags || [],
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para templates pré-definidos
    return {
      success: true,
      caption: 'Resultado incrível do nosso paciente! 💪 #Fisioterapia #Saúde',
      hashtags: ['#Fisioterapia', '#Saúde', '#Reabilitação', '#Movimento', '#BemEstar'],
      suggestions: ['Usando legenda padrão (IA indisponível)'],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating social caption:', error);
    // Fallback para templates pré-definidos
    return {
      success: true,
      caption: 'Resultado incrível do nosso paciente! 💪 #Fisioterapia #Saúde',
      hashtags: ['#Fisioterapia', '#Saúde', '#Reabilitação', '#Movimento'],
      suggestions: ['Usando legenda padrão (IA indisponível)'],
    };
  }
}

/**
 * Gera conteúdo Mito vs Verdade usando IA
 */
export async function generateMythVsTruth(input: GenerateMythVsTruthInput): Promise<{
  success: boolean;
  myth?: string;
  truth?: string;
  explanation?: string;
  suggestions?: string[];
  error?: string;
}> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      myth: string;
      truth: string;
      explanation: string;
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: MYTH_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.myth) {
      return {
        success: true,
        myth: result.myth,
        truth: result.truth,
        explanation: result.explanation,
        suggestions: result.suggestions || [],
      };
    }

    throw new Error(result.error || 'Falha ao gerar mito');
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating myth vs truth:', error);
    return {
      success: true,
      myth: `Mito comum sobre ${input.topic}`,
      truth: `A verdade sobre ${input.topic}`,
      explanation: 'Consulte seu fisioterapeuta para uma orientação baseada em evidências.',
      suggestions: ['Usando conteúdo padrão (IA indisponível)'],
    };
  }
}

/**
 * Função unificada para gerar qualquer tipo de conteúdo de marketing
 */
export async function generateMarketingContent(input: GenerateMarketingContentInput): Promise<GeneratedTemplateResponse> {
  switch (input.type) {
    case 'review':
      return generateReviewTemplate(input.context as GenerateReviewTemplateInput);
    case 'birthday':
      return generateBirthdayTemplate(input.context as GenerateBirthdayTemplateInput);
    case 'recall':
      return generateRecallTemplate(input.context as GenerateRecallTemplateInput);
    case 'fisiolink': {
      const fisiolinkResult = await generateFisiolinkTemplates(input.context as GenerateFisiolinkTemplateInput);
      return {
        success: fisiolinkResult.success,
        template: fisiolinkResult.templates?.full,
        suggestions: fisiolinkResult.suggestions,
        error: fisiolinkResult.error,
      };
    }
    case 'caption': {
      const captionResult = await generateSocialCaption(
        input.context?.contentType as 'motivational' | 'technical' | 'educational' | 'celebration' || 'motivational',
        input.context || {}
      );
      return {
        success: captionResult.success,
        template: `${captionResult.caption}\n\n${captionResult.hashtags?.join(' ') || ''}`,
        suggestions: captionResult.suggestions,
        error: captionResult.error,
      };
    }
    default:
      return {
        success: false,
        error: 'Tipo de conteúdo não suportado',
      };
  }
}

/**
 * Gera template SOAP para evolução usando IA
 */
export interface GenerateSOAPTemplateInput {
  patientName?: string;
  patientCondition?: string;
  sessionNumber?: number;
  previousSOAP?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  tone?: 'clinical' | 'friendly' | 'detailed';
}

export interface SOAPTemplateResponse {
  success: boolean;
  soap?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  suggestions?: string[];
  error?: string;
}

const SOAP_PROMPT_TEMPLATE = (input: GenerateSOAPTemplateInput) => `
Como especialista em fisioterapia, gere uma nota SOAP para uma sessão.

Contexto:
- Nome do paciente: ${input.patientName || '[Nome]'}
- Condição: ${input.patientCondition || '[Condição]'}
- Número da sessão: ${input.sessionNumber || '1'}
- Tom: ${input.tone || 'clínico'}
${input.previousSOAP ? `- SOAP anterior: ${JSON.stringify(input.previousSOAP)}` : ''}

Requisitos:
1. Cada campo (S-O-A-P) deve ser conciso mas completo
2. Usar terminologia apropriada de fisioterapia
3. Considerar o contexto das sessões anteriores
4. Retornar no formato JSON com campos individuais

Retorne no formato JSON:
{
  "soap": {
    "subjective": "queixa do paciente em 1-2 frases",
    "objective": "observações objetivas do exame físico",
    "assessment": "avaliação clínica e funcional",
    "plan": "plano de tratamento para próxima sessão"
  },
  "suggestions": ["sugestão 1", "sugestão 2"]
}
`;

export async function generateSOAPTemplate(input: GenerateSOAPTemplateInput): Promise<SOAPTemplateResponse> {
  try {
    const result = await callFunctionHttp<{ prompt: string; language: string }, {
      soap?: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
      };
      suggestions?: string[];
      error?: string;
    }>(
      'generateMarketingTemplate',
      { prompt: SOAP_PROMPT_TEMPLATE(input), language: 'pt-BR' }
    );

    if (result.soap) {
      return {
        success: true,
        soap: result.soap,
        suggestions: result.suggestions || [],
      };
    }

    // Fallback para template SOAP básico
    return {
      success: true,
      soap: {
        subjective: 'Paciente relata melhora gradual nos sintomas. Discreta ausência de dor em repouso.',
        objective: 'Amplitude de movimento preservada. Força muscular dentro dos limites esperados para fase do tratamento.',
        assessment: 'Resposta positiva ao tratamento progressivo. Continuar com protocolo atual.',
        plan: 'Manter exercícios domiciliares. Reavaliar na próxima sessão. Aumentar carga conforme tolerância.',
      },
      suggestions: [
        'Preencha com base na observação da sessão atual',
        'Revise evoluções anteriores para consistência',
        'Inclua mensurações objetivas quando possível',
      ],
    };
  } catch (error: any) {
    console.error('[MarketingAIService] Error generating SOAP template:', error);
    // Fallback para template SOAP básico
    return {
      success: true,
      soap: {
        subjective: 'Relatou melhora nos sintomas.',
        objective: 'Exame físico sem alterações significativas.',
        assessment: 'Manter plano atual.',
        plan: 'Continuar exercícios domiciliares.',
      },
      suggestions: ['Usando template SOAP padrão (IA indisponível)'],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  GenerateReviewTemplateInput,
  GenerateBirthdayTemplateInput,
  GenerateRecallTemplateInput,
  GenerateFisiolinkTemplateInput,
  GenerateMarketingContentInput,
  GeneratedTemplateResponse,
  GenerateSOAPTemplateInput,
  SOAPTemplateResponse,
};
