import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  optionsResponse,
  createSupabaseClient,
  validateAuth,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { whatsappSendSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'WhatsApp API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting específico para WhatsApp
  const rateLimitResult = await checkRateLimit(req, 'api-whatsapp', { maxRequests: 30, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: POST /api-whatsapp/send
    if (pathname.endsWith('/send') && req.method === 'POST') {
      return await sendWhatsApp(req, supabase, user!);
    }

    // Rota: GET /api-whatsapp/status
    if (pathname.endsWith('/status') && req.method === 'GET') {
      return await getWhatsAppStatus(supabase, user!.organization_id);
    }

    // Rota: GET /api-whatsapp/templates
    if (pathname.endsWith('/templates') && req.method === 'GET') {
      return await getMessageTemplates(supabase, user!.organization_id);
    }

    // Rota: GET /api-whatsapp/history/:patientId
    const historyMatch = pathname.match(/\/history\/([^/]+)/);
    if (historyMatch && req.method === 'GET') {
      const patientId = historyMatch[1];
      return await getMessageHistory(supabase, patientId, user!.organization_id);
    }

    return methodNotAllowed(['POST', 'GET']);
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== SEND WHATSAPP MESSAGE ==========
async function sendWhatsApp(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(whatsappSendSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { patient_id, message } = validation.data;

  // Buscar dados do paciente
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, phone')
    .eq('id', patient_id)
    .eq('organization_id', user.organization_id)
    .single();

  if (patientError || !patient) {
    return errorResponse('Paciente não encontrado', 404);
  }

  if (!patient.phone) {
    return errorResponse('Paciente não possui telefone cadastrado', 400);
  }

  // Formatar número do telefone
  const formattedPhone = formatPhoneNumber(patient.phone);

  // Chamar Evolution API via send-whatsapp edge function
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message,
        patient_id,
        organization_id: user.organization_id,
      }),
    });

    const result = await response.json();

    // Registrar mensagem no histórico
    await supabase.from('whatsapp_messages').insert({
      patient_id,
      phone: formattedPhone,
      message,
      direction: 'outbound',
      status: response.ok ? 'sent' : 'failed',
      message_id: result.messageId,
      sent_by: user.id,
      organization_id: user.organization_id,
    });

    if (!response.ok) {
      return errorResponse(result.error || 'Erro ao enviar mensagem', response.status);
    }

    return successResponse({
      messageId: result.messageId,
      status: 'sent',
      phone: formattedPhone,
    });
  } catch (error) {
    console.error('Send WhatsApp Error:', error);
    
    // Registrar falha
    await supabase.from('whatsapp_messages').insert({
      patient_id,
      phone: formattedPhone,
      message,
      direction: 'outbound',
      status: 'failed',
      error_message: error.message,
      sent_by: user.id,
      organization_id: user.organization_id,
    });

    return errorResponse('Erro ao enviar mensagem WhatsApp', 500);
  }
}

// ========== GET WHATSAPP STATUS ==========
async function getWhatsAppStatus(supabase: any, organizationId?: string) {
  // Buscar configuração da organização
  let query = supabase
    .from('whatsapp_connections')
    .select('*');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return successResponse({
      connected: false,
      phoneNumber: null,
      lastSeen: null,
      message: 'WhatsApp não configurado',
    });
  }

  return successResponse({
    connected: data.is_connected,
    phoneNumber: data.phone_number,
    lastSeen: data.last_seen_at,
    instanceName: data.instance_name,
    status: data.status,
  });
}

// ========== GET MESSAGE TEMPLATES ==========
async function getMessageTemplates(supabase: any, organizationId?: string) {
  // Templates padrão
  const defaultTemplates = [
    {
      id: 'reminder_24h',
      name: 'Lembrete 24h',
      message: 'Olá {nome}! 👋\n\nLembramos que você tem consulta amanhã às {horario}.\n\nConfirme sua presença respondendo SIM.\n\nActivity Fisioterapia 💪',
      variables: ['nome', 'horario'],
    },
    {
      id: 'reminder_1h',
      name: 'Lembrete 1h',
      message: 'Olá {nome}! 👋\n\nSua consulta começa em 1 hora ({horario}).\n\nEstamos te esperando!\n\nActivity Fisioterapia 💪',
      variables: ['nome', 'horario'],
    },
    {
      id: 'confirmation',
      name: 'Confirmação de Agendamento',
      message: 'Olá {nome}! ✅\n\nSeu agendamento foi confirmado para {data} às {horario}.\n\nQualquer dúvida, entre em contato.\n\nActivity Fisioterapia 💪',
      variables: ['nome', 'data', 'horario'],
    },
    {
      id: 'cancellation',
      name: 'Cancelamento',
      message: 'Olá {nome},\n\nSeu agendamento de {data} às {horario} foi cancelado.\n\nPara reagendar, entre em contato conosco.\n\nActivity Fisioterapia',
      variables: ['nome', 'data', 'horario'],
    },
    {
      id: 'waitlist_offer',
      name: 'Oferta de Vaga',
      message: 'Olá {nome}! 🎉\n\nSurgiu uma vaga para {data} às {horario}!\n\nResponda SIM em até 2 horas para garantir.\n\nActivity Fisioterapia 💪',
      variables: ['nome', 'data', 'horario'],
    },
    {
      id: 'exercises',
      name: 'Exercícios Prescritos',
      message: 'Olá {nome}! 💪\n\nSua nova prescrição de exercícios está disponível.\n\nAcesse: {link}\n\nFrequência: {frequencia}\n\nQualquer dúvida, estamos aqui!\n\nActivity Fisioterapia',
      variables: ['nome', 'link', 'frequencia'],
    },
  ];

  // Buscar templates customizados da organização
  let query = supabase
    .from('message_templates')
    .select('*')
    .eq('is_active', true);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: customTemplates } = await query;

  return successResponse({
    default: defaultTemplates,
    custom: customTemplates || [],
  });
}

// ========== GET MESSAGE HISTORY ==========
async function getMessageHistory(supabase: any, patientId: string, organizationId?: string) {
  let query = supabase
    .from('whatsapp_messages')
    .select(`
      *,
      sender:profiles(id, name)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== HELPER FUNCTIONS ==========

function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');

  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Se não começar com 55 (Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

