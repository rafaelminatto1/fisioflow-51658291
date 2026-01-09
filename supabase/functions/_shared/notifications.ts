// =====================================================
// FisioFlow v3.0 - Serviço de Notificações Unificado
// =====================================================

import { Config, isFeatureEnabled } from './config.ts';
import { createSupabaseServiceClient } from './api-helpers.ts';

export interface NotificationPayload {
  type: 'appointment_reminder' | 'appointment_confirmation' | 'waitlist_offer' | 'package_expiring' | 'generic' | 'nps_survey' | 'backup_failed' | 'backup_success';
  recipientId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels?: ('whatsapp' | 'email' | 'push')[];
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

// Enviar notificação por múltiplos canais
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  const channels = payload.channels || ['whatsapp'];

  for (const channel of channels) {
    try {
      let result: NotificationResult;

      switch (channel) {
        case 'whatsapp':
          result = await sendWhatsAppNotification(payload);
          break;
        case 'email':
          result = await sendEmailNotification(payload);
          break;
        case 'push':
          result = await sendPushNotification(payload);
          break;
        default:
          result = { success: false, channel, error: 'Canal não suportado' };
      }

      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Salvar log de notificação
  await logNotification(payload, results);

  return results;
}

// WhatsApp via Evolution API
async function sendWhatsAppNotification(payload: NotificationPayload): Promise<NotificationResult> {
  if (!isFeatureEnabled('whatsapp') || !payload.recipientPhone) {
    return { success: false, channel: 'whatsapp', error: 'WhatsApp não disponível' };
  }

  try {
    const phone = formatPhoneForWhatsApp(payload.recipientPhone);

    const response = await fetch(`${Config.EVOLUTION_API_URL}/message/sendText/${Config.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Config.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: formatMessage(payload),
        delay: 1200,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, channel: 'whatsapp', error: result.message || 'Erro ao enviar' };
    }

    return { success: true, channel: 'whatsapp', messageId: result.key?.id };
  } catch (error) {
    return {
      success: false,
      channel: 'whatsapp',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Email (placeholder - integrar com SendGrid, Resend, etc)
async function sendEmailNotification(payload: NotificationPayload): Promise<NotificationResult> {
  if (!payload.recipientEmail) {
    return { success: false, channel: 'email', error: 'Email não disponível' };
  }

  // TODO: Implementar integração com serviço de email
  console.log('Email notification:', payload);

  return { success: false, channel: 'email', error: 'Serviço de email não configurado' };
}

// Push Notification (placeholder - integrar com FCM, OneSignal, etc)
async function sendPushNotification(payload: NotificationPayload): Promise<NotificationResult> {
  // TODO: Implementar integração com serviço de push
  console.log('Push notification:', payload);

  return { success: false, channel: 'push', error: 'Serviço de push não configurado' };
}

// Formatar telefone para WhatsApp (formato: 55XXXXXXXXXXX)
function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('55')) {
    return cleaned;
  }

  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }

  return cleaned;
}

// Formatar mensagem baseada no tipo
function formatMessage(payload: NotificationPayload): string {
  const emoji = getEmojiForType(payload.type);
  return `${emoji} *${payload.title}*\n\n${payload.message}`;
}

function getEmojiForType(type: NotificationPayload['type']): string {
  const emojis: Record<NotificationPayload['type'], string> = {
    appointment_reminder: '⏰',
    appointment_confirmation: '✅',
    waitlist_offer: '🎉',
    package_expiring: '⚠️',
    nps_survey: '⭐',
    backup_failed: '❌',
    backup_success: '✅',
    generic: '📢',
  };
  return emojis[type] || '📢';
}

// Salvar log de notificação no banco
async function logNotification(payload: NotificationPayload, results: NotificationResult[]) {
  try {
    const supabase = createSupabaseServiceClient();

    const succeeded = results.some(r => r.success);
    const failedChannels = results.filter(r => !r.success).map(r => r.channel);

    await supabase.from('notification_logs').insert({
      type: payload.type,
      recipient_id: payload.recipientId,
      recipient_phone: payload.recipientPhone,
      recipient_email: payload.recipientEmail,
      title: payload.title,
      message: payload.message,
      channels: payload.channels || ['whatsapp'],
      success: succeeded,
      results: results,
      failed_channels: failedChannels,
    });
  } catch (error) {
    console.error('Erro ao salvar log de notificação:', error);
  }
}

// Templates de mensagens
export const MessageTemplates = {
  appointmentReminder: (patientName: string, dateTime: string, therapistName: string) => ({
    type: 'appointment_reminder' as const,
    title: 'Lembrete de Consulta',
    message: `Olá ${patientName}!\n\nSua consulta está agendada para ${dateTime} com ${therapistName}.\n\nEm caso de imprevisto, por favor nos avise com antecedência.\n\nAté lá! 💪`,
  }),

  appointmentConfirmation: (patientName: string, dateTime: string, therapistName: string) => ({
    type: 'appointment_confirmation' as const,
    title: 'Consulta Confirmada',
    message: `Olá ${patientName}!\n\nSua consulta foi confirmada para ${dateTime} com ${therapistName}.\n\nObrigado por escolher a FisioFlow! 🙏`,
  }),

  waitlistOffer: (patientName: string, dateTime: string, expiresIn: string) => ({
    type: 'waitlist_offer' as const,
    title: 'Vaga Disponível!',
    message: `Olá ${patientName}!\n\nTemos uma vaga disponível para ${dateTime}.\n\nEsta oferta expira em ${expiresIn}.\n\nDeseja confirmar? Responda SIM para aceitar ou NÃO para recusar.`,
  }),

  packageExpiring: (patientName: string, remainingSessions: number, expiryDate: string) => ({
    type: 'package_expiring' as const,
    title: 'Pacote Expirando',
    message: `Olá ${patientName}!\n\nSeu pacote de sessões está expirando em ${expiryDate}.\n\nVocê ainda tem ${remainingSessions} sessão(ões) disponível(is).\n\nAgende agora para não perder! 📅`,
  }),

  npsSurvey: (patientName: string, surveyLink: string) => ({
    type: 'nps_survey' as const,
    title: 'Pesquisa de Satisfação',
    message: `Olá ${patientName}!\n\nSua opinião é muito importante para nós. Poderia dedicar um momento para avaliar seu atendimento?\n\n${surveyLink}\n\nAgradecemos sua participação! 🙏`,
  }),

  backupFailed: (error: string) => ({
    type: 'backup_failed' as const,
    title: 'Backup Falhou',
    message: `Atenção! O backup do banco de dados falhou.\n\nErro: ${error}\n\nVerifique os logs imediatamente.`,
  }),

  backupSuccess: (fileName: string, sizeBytes: number) => ({
    type: 'backup_success' as const,
    title: 'Backup Realizado',
    message: `O backup do banco de dados foi concluído com sucesso.\n\nArquivo: ${fileName}\nTamanho: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`,
  }),
};
