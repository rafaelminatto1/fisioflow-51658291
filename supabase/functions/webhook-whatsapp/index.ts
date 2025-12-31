import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { errorResponse, successResponse } from '../_shared/api-helpers.ts';
import { captureException, captureMessage } from '../_shared/sentry.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar origem do webhook (opcional, mas recomendado)
    // Em produção, valide a assinatura do webhook se o provedor suportar
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
    if (webhookSecret) {
      const signature = req.headers.get('x-webhook-signature');
      if (signature && signature !== webhookSecret) {
        await captureMessage('Tentativa de webhook não autorizado', 'warning', { signature: signature.substring(0, 10) });
        return errorResponse('Não autorizado', 401);
      }
    }

    const body = await req.json();
    
    // Validar estrutura básica do payload
    if (!body.event && !body.entry) {
      await captureMessage('Webhook recebido sem estrutura válida', 'warning');
      return errorResponse('Payload inválido', 400);
    }
    
    await captureMessage('WhatsApp Webhook recebido', 'info', { hasEvent: !!body.event, hasEntry: !!body.entry });

    // Evolution API webhook format
    if (body.event) {
      await handleEvolutionEvent(body);
    }
    // Meta/Official WhatsApp Business API format
    else if (body.entry) {
      await handleMetaEvent(body);
    }

    return successResponse({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'webhook-whatsapp' });
    return errorResponse('Erro ao processar webhook do WhatsApp', 500);
  }
});

// ========== EVOLUTION API HANDLERS ==========

async function handleEvolutionEvent(data: any) {
  const { event, instance, data: eventData } = data;

  switch (event) {
    case 'messages.upsert':
      await handleIncomingMessage(eventData, instance);
      break;

    case 'messages.update':
      await handleMessageStatusUpdate(eventData, instance);
      break;

    case 'connection.update':
      await handleConnectionUpdate(eventData, instance);
      break;

    case 'qrcode.updated':
      await handleQRCodeUpdate(eventData, instance);
      break;

    default:
      console.log(`Unhandled Evolution event: ${event}`);
  }
}

async function handleIncomingMessage(data: any, instance: string) {
  const message = data.message;
  if (!message) return;

  const remoteJid = message.key?.remoteJid;
  const fromMe = message.key?.fromMe;
  const messageContent = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text ||
                        '[Mídia recebida]';

  // Ignorar mensagens enviadas por nós
  if (fromMe) return;

  // Extrair número do telefone
  const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '');
  if (!phone) return;

  // Buscar paciente pelo telefone
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, organization_id')
    .or(`phone.ilike.%${phone}%,phone.ilike.%${phone.slice(-10)}%`)
    .limit(1)
    .single();

  // Registrar mensagem no histórico
  await supabase.from('whatsapp_messages').insert({
    patient_id: patient?.id,
    phone,
    message: sanitizedContent,
    direction: 'inbound',
    status: 'received',
    message_id: message.key?.id,
    organization_id: patient?.organization_id,
  });

  // Processar respostas automáticas
  await processAutoResponse(phone, sanitizedContent, patient);

  console.log(`Incoming message from ${phone}: ${sanitizedContent.substring(0, 100)}`);
}

async function handleMessageStatusUpdate(data: any, instance: string) {
  const { key, status } = data;
  const messageId = key?.id;
  
  if (!messageId) return;

  // Mapear status do Evolution API
  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'SENT': 'sent',
    'DELIVERED': 'delivered',
    'READ': 'read',
    'FAILED': 'failed',
  };

  const mappedStatus = statusMap[status] || status.toLowerCase();

  // Atualizar status no banco
  await supabase
    .from('whatsapp_messages')
    .update({ status: mappedStatus })
    .eq('message_id', messageId);

  console.log(`Message ${messageId} status updated to ${mappedStatus}`);
}

async function handleConnectionUpdate(data: any, instance: string) {
  const { state, statusReason } = data;

  // Atualizar status da conexão
  await supabase
    .from('whatsapp_connections')
    .update({
      is_connected: state === 'open',
      status: state,
      last_seen_at: new Date().toISOString(),
    })
    .eq('instance_name', instance);

  console.log(`WhatsApp connection ${instance}: ${state}`);
}

async function handleQRCodeUpdate(data: any, instance: string) {
  const { qrcode } = data;

  // Salvar QR code para exibir na interface
  await supabase
    .from('whatsapp_connections')
    .update({
      qr_code: qrcode,
      status: 'awaiting_scan',
    })
    .eq('instance_name', instance);

  console.log(`QR Code updated for ${instance}`);
}

// ========== META API HANDLERS ==========

async function handleMetaEvent(data: any) {
  for (const entry of data.entry) {
    for (const change of entry.changes) {
      if (change.field === 'messages') {
        const value = change.value;

        // Processar mensagens recebidas
        if (value.messages) {
          for (const message of value.messages) {
            await handleMetaMessage(message, value.contacts);
          }
        }

        // Processar atualizações de status
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleMetaStatusUpdate(status);
          }
        }
      }
    }
  }
}

async function handleMetaMessage(message: any, contacts: any[]) {
  const from = message.from;
  const contact = contacts?.find((c: any) => c.wa_id === from);
  const name = contact?.profile?.name;

  let content = '';
  switch (message.type) {
    case 'text':
      content = message.text?.body || '';
      break;
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
      content = `[${message.type.toUpperCase()}]`;
      break;
    default:
      content = '[Mensagem não suportada]';
  }

  // Buscar paciente
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, organization_id')
    .or(`phone.ilike.%${from}%,phone.ilike.%${from.slice(-10)}%`)
    .limit(1)
    .single();

  // Registrar mensagem
  await supabase.from('whatsapp_messages').insert({
    patient_id: patient?.id,
    phone: from,
    message: content,
    direction: 'inbound',
    status: 'received',
    message_id: message.id,
    organization_id: patient?.organization_id,
  });

  // Processar resposta automática
  await processAutoResponse(from, content, patient);
}

async function handleMetaStatusUpdate(status: any) {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed',
  };

  await supabase
    .from('whatsapp_messages')
    .update({ status: statusMap[status.status] || status.status })
    .eq('message_id', status.id);
}

// ========== AUTO RESPONSE ==========

async function processAutoResponse(
  phone: string,
  message: string,
  patient: { id: string; name: string; organization_id: string } | null
) {
  const lowerMessage = message.toLowerCase().trim();

  // Confirmação de consulta (SIM/NÃO)
  if (['sim', 'confirmo', 'ok', 'yes'].includes(lowerMessage)) {
    // Verificar se há agendamento pendente de confirmação
    if (patient) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, start_time')
        .eq('patient_id', patient.id)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .lte('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (appointment) {
        // Confirmar agendamento
        await supabase
          .from('appointments')
          .update({ 
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_via: 'whatsapp',
          })
          .eq('id', appointment.id);

        // Enviar resposta
        await sendAutoResponse(phone, patient.organization_id, 
          `Obrigado, ${patient.name.split(' ')[0]}! ✅\n\nSua consulta está confirmada.\n\nAté lá!`
        );
        return;
      }
    }
  }

  // Recusa de oferta de vaga (NÃO)
  if (['nao', 'não', 'no', 'recusar'].includes(lowerMessage)) {
    if (patient) {
      // Verificar se há oferta pendente
      const { data: waitlistEntry } = await supabase
        .from('waitlist')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('status', 'offered')
        .single();

      if (waitlistEntry) {
        // Processar recusa
        const { data: current } = await supabase
          .from('waitlist')
          .select('refusal_count')
          .eq('id', waitlistEntry.id)
          .single();

        const newRefusalCount = (current?.refusal_count || 0) + 1;

        await supabase
          .from('waitlist')
          .update({
            status: newRefusalCount >= 3 ? 'removed' : 'waiting',
            offered_slot: null,
            offered_at: null,
            offer_expires_at: null,
            refusal_count: newRefusalCount,
          })
          .eq('id', waitlistEntry.id);

        const responseMessage = newRefusalCount >= 3
          ? 'Entendido. Você foi removido da lista de espera por 3 recusas. Entre em contato para reagendar.'
          : 'Entendido. Você continua na lista de espera e será avisado quando surgir outra vaga.';

        await sendAutoResponse(phone, patient.organization_id, responseMessage);
        return;
      }
    }
  }

  // Menu de opções
  if (['menu', 'ajuda', 'help', 'opcoes', 'opções'].includes(lowerMessage)) {
    await sendAutoResponse(phone, patient?.organization_id || '',
      `🏥 *FisioFlow*\n\nOpções disponíveis:\n\n1️⃣ Digite *AGENDAR* para solicitar agendamento\n2️⃣ Digite *CANCELAR* para cancelar consulta\n3️⃣ Digite *HORARIOS* para ver horários disponíveis\n4️⃣ Digite *CONTATO* para falar com a clínica\n\nPara confirmar consultas, responda *SIM*`
    );
    return;
  }

  // Solicitação de agendamento
  if (['agendar', 'marcar', 'consulta'].includes(lowerMessage)) {
    await sendAutoResponse(phone, patient?.organization_id || '',
      `Para agendar uma consulta, acesse nosso sistema online ou ligue para a clínica.\n\n📱 Acesse: https://fisioflow.app/agendar\n📞 Telefone: (11) 99999-9999`
    );
    return;
  }
}

async function sendAutoResponse(phone: string, organizationId: string, message: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        phone,
        message,
        organization_id: organizationId,
      }),
    });
  } catch (error) {
    console.error('Error sending auto response:', error);
  }
}

