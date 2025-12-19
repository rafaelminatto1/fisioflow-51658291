import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Common error response with CORS
export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// AI Chat message validation schema
export const aiChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
        .min(1, 'Mensagem não pode ser vazia')
        .max(4000, 'Mensagem muito longa (máx 4000 caracteres)')
    })
  )
  .min(1, 'Pelo menos uma mensagem é necessária')
  .max(50, 'Máximo de 50 mensagens no histórico')
});

// AI Transcribe session validation schema
export const transcribeSessionSchema = z.object({
  audioData: z.string()
    .min(100, 'Dados de áudio inválidos')
    .max(10000000, 'Arquivo de áudio muito grande (máx ~7MB)'),
  patientId: z.string().uuid('ID do paciente inválido')
});

// AI Treatment assistant validation schema
export const treatmentAssistantSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido'),
  action: z.enum(['suggest_treatment', 'predict_adherence', 'generate_report'], {
    errorMap: () => ({ message: 'Ação inválida. Use: suggest_treatment, predict_adherence ou generate_report' })
  })
});

// AI Exercise prescription validation schema
export const exercisePrescriptionSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido')
});

// Intelligent reports validation schema
export const intelligentReportsSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido'),
  reportType: z.string()
    .min(1, 'Tipo de relatório é obrigatório')
    .max(50, 'Tipo de relatório muito longo'),
  dateRange: z.object({
    start: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      'Data de início inválida'
    ),
    end: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      'Data de fim inválida'
    ),
  })
});

// Prompt injection detection patterns
const SUSPICIOUS_PATTERNS = [
  /ignore\s*(previous|all|any|the)\s*(instructions|prompts|context)/i,
  /you\s+are\s+now/i,
  /forget\s+(all|everything|previous)/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /override\s+(safety|security|previous)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

// Check for prompt injection attempts
export function detectPromptInjection(content: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
}

// Validate AI chat messages for injection
export function validateMessagesForInjection(
  messages: Array<{ role: string; content: string }>
): { valid: boolean; error?: string } {
  for (const msg of messages) {
    if (msg.role === 'user' && detectPromptInjection(msg.content)) {
      return { 
        valid: false, 
        error: 'Conteúdo suspeito detectado. Por favor, reformule sua mensagem.' 
      };
    }
  }
  return { valid: true };
}

// Estimate token count (rough approximation)
export function estimateTokenCount(messages: Array<{ content: string }>): number {
  return messages.reduce(
    (sum, msg) => sum + Math.ceil(msg.content.length / 4),
    0
  );
}

// Validate total token limit
export function validateTokenLimit(
  messages: Array<{ content: string }>,
  maxTokens: number = 8000
): { valid: boolean; error?: string } {
  const estimated = estimateTokenCount(messages);
  if (estimated > maxTokens) {
    return {
      valid: false,
      error: 'Conversação muito longa. Por favor, inicie uma nova conversa.'
    };
  }
  return { valid: true };
}

// Parse and validate request body
export async function parseAndValidate<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  corsHeaders: Record<string, string>
): Promise<{ data: T; error?: Response }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errorMessages = result.error.issues.map(i => i.message).join(', ');
      return {
        data: null as T,
        error: errorResponse(errorMessages, 400, corsHeaders)
      };
    }
    
    return { data: result.data };
  } catch {
    return {
      data: null as T,
      error: errorResponse('Corpo da requisição inválido', 400, corsHeaders)
    };
  }
}
