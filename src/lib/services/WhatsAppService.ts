import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

export interface WhatsAppMessage {
  to: string;
  message: string;
  templateKey?: string;
  patientId?: string;
  appointmentId?: string;
  scheduledFor?: Date;
}

export interface AppointmentReminder {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  appointmentId?: string;
  appointmentDate: Date;
  appointmentTime: string;
  therapistName: string;
  location: string;
}

export interface WhatsAppTemplate {
  name: string;
  template_key: string;
  content: string;
  variables: string[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SlotOfferData {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  waitlistEntryId: string;
  slotDate: Date;
  slotTime: string;
  therapistName?: string;
  expiresInHours?: number;
}

// Template keys for approved messages
export const TEMPLATE_KEYS = {
  CONFIRMACAO_AGENDAMENTO: 'confirmacao_agendamento',
  LEMBRETE_SESSAO: 'lembrete_sessao',
  CANCELAMENTO: 'cancelamento',
  PRESCRICAO: 'prescricao',
  RESULTADO_EXAME: 'resultado_exame',
  SOLICITAR_CONFIRMACAO: 'solicitar_confirmacao',
  OFERTA_VAGA: 'oferta_vaga',
} as const;

export class WhatsAppService {
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 2000;

  /**
   * Test WhatsApp connection
   */
  static async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { test: true }
      });

      if (error) {
        return { connected: false, error: error.message };
      }

      return { connected: true };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send message with retry logic
   */
  static async sendMessage(params: WhatsAppMessage): Promise<SendResult> {
    const { to, message, templateKey, patientId, appointmentId } = params;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: { to, message }
        });

        if (error) {
          lastError = error.message;
          logger.error(`Tentativa ${attempt} de envio WhatsApp falhou`, error, 'WhatsAppService');

          if (attempt < this.MAX_RETRIES) {
            await this.delay(this.RETRY_DELAY_MS * attempt);
            continue;
          }
        }

        // Log to metrics table
        await this.logMessage({
          phoneNumber: to,
          patientId,
          appointmentId,
          templateKey,
          messageId: data?.messageId,
          status: error ? 'falhou' : 'enviado',
          errorMessage: error?.message,
          retryCount: attempt - 1,
        });

        if (!error) {
          logger.info('Mensagem WhatsApp enviada com sucesso', { messageId: data?.messageId }, 'WhatsAppService');
          return { success: true, messageId: data?.messageId };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Erro na tentativa ${attempt} de envio WhatsApp`, error, 'WhatsAppService');

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    // Log failed message
    await this.logMessage({
      phoneNumber: to,
      patientId,
      appointmentId,
      templateKey,
      status: 'falhou',
      errorMessage: lastError,
      retryCount: this.MAX_RETRIES,
    });

    return { success: false, error: lastError };
  }

  /**
   * Log message to metrics table
   */
  private static async logMessage(params: {
    phoneNumber: string;
    patientId?: string;
    appointmentId?: string;
    templateKey?: string;
    messageId?: string;
    status: string;
    errorMessage?: string;
    retryCount: number;
  }) {
    try {
      await supabase.from('whatsapp_metrics').insert({
        phone_number: params.phoneNumber,
        patient_id: params.patientId || null,
        appointment_id: params.appointmentId || null,
        template_key: params.templateKey || null,
        message_id: params.messageId || null,
        message_type: 'outbound',
        status: params.status,
        sent_at: params.status === 'enviado' ? new Date().toISOString() : null,
        error_message: params.errorMessage || null,
        retry_count: params.retryCount,
      });
    } catch (error) {
      logger.error('Erro ao registrar mensagem WhatsApp', error, 'WhatsAppService');
    }
  }

  /**
   * Get templates from database
   */
  static async getTemplates(): Promise<WhatsAppTemplate[]> {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('name, template_key, content, variables')
      .eq('status', 'ativo');

    if (error) {
      logger.error('Erro ao buscar templates WhatsApp', error, 'WhatsAppService');
      return [];
    }

    return data || [];
  }

  /**
   * Send message using template
   */
  static async sendFromTemplate(
    templateKey: string,
    variables: Record<string, string>,
    to: string,
    patientId?: string,
    appointmentId?: string
  ): Promise<SendResult> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.template_key === templateKey);

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    let message = template.content;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return this.sendMessage({
      to,
      message,
      templateKey,
      patientId,
      appointmentId,
    });
  }

  /**
   * Send appointment confirmation
   */
  static async sendAppointmentConfirmation(reminder: AppointmentReminder): Promise<SendResult> {
    const date = reminder.appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return this.sendFromTemplate(
      TEMPLATE_KEYS.CONFIRMACAO_AGENDAMENTO,
      {
        name: reminder.patientName,
        therapist: reminder.therapistName,
        date,
        time: reminder.appointmentTime,
      },
      reminder.patientPhone,
      reminder.patientId,
      reminder.appointmentId
    );
  }

  /**
   * Send session reminder (24h before)
   */
  static async sendSessionReminder(reminder: AppointmentReminder): Promise<SendResult> {
    return this.sendFromTemplate(
      TEMPLATE_KEYS.LEMBRETE_SESSAO,
      {
        time: reminder.appointmentTime,
        therapist: reminder.therapistName,
      },
      reminder.patientPhone,
      reminder.patientId,
      reminder.appointmentId
    );
  }

  /**
   * Send cancellation notification
   */
  static async sendCancellationNotification(
    patientPhone: string,
    appointmentDate: Date,
    patientId?: string,
    appointmentId?: string
  ): Promise<SendResult> {
    const date = appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return this.sendFromTemplate(
      TEMPLATE_KEYS.CANCELAMENTO,
      { date },
      patientPhone,
      patientId,
      appointmentId
    );
  }

  /**
   * Send confirmation request (for auto-confirmation)
   */
  static async sendConfirmationRequest(reminder: AppointmentReminder): Promise<SendResult> {
    const date = reminder.appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });

    return this.sendFromTemplate(
      TEMPLATE_KEYS.SOLICITAR_CONFIRMACAO,
      {
        name: reminder.patientName,
        date,
        time: reminder.appointmentTime,
      },
      reminder.patientPhone,
      reminder.patientId,
      reminder.appointmentId
    );
  }

  /**
   * Send prescription notification
   */
  static async sendPrescriptionNotification(
    patientPhone: string,
    prescriptionLink: string,
    patientId?: string
  ): Promise<SendResult> {
    return this.sendFromTemplate(
      TEMPLATE_KEYS.PRESCRICAO,
      { link: prescriptionLink },
      patientPhone,
      patientId
    );
  }

  /**
   * Send exercise reminder (legacy support)
   */
  static async sendExerciseReminder(
    patientName: string,
    patientPhone: string,
    exercises: string[],
    patientId?: string
  ): Promise<SendResult> {
    const exerciseList = exercises.map((ex, i) => `${i + 1}. ${ex}`).join('\n');

    const message = `🏋️ *Lembrete de Exercícios - Activity Fisioterapia*

Olá *${patientName}*!

Não se esqueça de realizar seus exercícios hoje:

${exerciseList}

💪 Manter a constância é fundamental para sua recuperação!

Dúvidas? Entre em contato conosco! 💙`;

    return this.sendMessage({
      to: patientPhone,
      message,
      patientId,
    });
  }

  /**
   * Send appointment reminder (legacy support)
   */
  static async sendAppointmentReminder(reminder: AppointmentReminder): Promise<boolean> {
    const result = await this.sendSessionReminder(reminder);
    return result.success;
  }

  /**
   * Send slot offer to waitlist patient
   */
  static async sendSlotOffer(data: SlotOfferData): Promise<SendResult> {
    const { patientName, patientPhone, patientId, waitlistEntryId, slotDate, slotTime, therapistName, expiresInHours = 24 } = data;

    const dateFormatted = slotDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });

    // Try template first
    const templateResult = await this.sendFromTemplate(
      TEMPLATE_KEYS.OFERTA_VAGA,
      {
        name: patientName,
        date: dateFormatted,
        time: slotTime,
        therapist: therapistName || 'nossa equipe',
        expires: expiresInHours.toString(),
      },
      patientPhone,
      patientId
    );

    // If template fails (not found), send custom message
    if (!templateResult.success && templateResult.error === 'Template not found') {
      const message = `🎉 *Vaga Disponível - FisioFlow*

Olá *${patientName}*!

Temos uma vaga disponível para você:

📅 *Data:* ${dateFormatted}
⏰ *Horário:* ${slotTime}
${therapistName ? `👨‍⚕️ *Profissional:* ${therapistName}` : ''}

⏳ Esta oferta é válida por *${expiresInHours} horas*.

Para confirmar, responda *SIM* ou *ACEITAR*.
Para recusar, responda *NÃO* ou *RECUSAR*.

Dúvidas? Entre em contato conosco! 💙`;

      return this.sendMessage({
        to: patientPhone,
        message,
        templateKey: TEMPLATE_KEYS.OFERTA_VAGA,
        patientId,
      });
    }

    // Log the offer to track response
    try {
      await supabase.from('waitlist_slot_offers').insert({
        waitlist_entry_id: waitlistEntryId,
        patient_id: patientId,
        offered_date: slotDate.toISOString(),
        offered_time: slotTime,
        status: 'pending',
        expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        message_id: templateResult.messageId,
      });
    } catch (error) {
      logger.warn('Failed to log slot offer', error, 'WhatsAppService');
    }

    return templateResult;
  }

  /**
   * Send welcome message
   */
  static async sendWelcomeMessage(
    patientName: string,
    patientPhone: string,
    patientId?: string
  ): Promise<SendResult> {
    const message = `👋 *Bem-vindo à Activity Fisioterapia!*

Olá *${patientName}*!

É um prazer tê-lo(a) conosco! 

Nossa equipe está pronta para auxiliá-lo(a) em sua jornada de recuperação e bem-estar.

📱 Você receberá lembretes automáticos de consultas e exercícios por este número.

💬 Em caso de dúvidas, estamos à disposição!

Bem-vindo! 💙`;

    return this.sendMessage({
      to: patientPhone,
      message,
      patientId,
    });
  }

  /**
   * Get metrics summary
   */
  static async getMetrics(days: number = 30): Promise<{
    totalSent: number;
    delivered: number;
    read: number;
    failed: number;
    responseRate: number;
    avgResponseTime: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('whatsapp_metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .eq('message_type', 'outbound');

    if (error || !data) {
      return {
        totalSent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        responseRate: 0,
        avgResponseTime: 0,
      };
    }

    const totalSent = data.length;
    const delivered = data.filter(m => m.delivered_at).length;
    const read = data.filter(m => m.read_at).length;
    const failed = data.filter(m => m.status === 'falhou').length;
    const replied = data.filter(m => m.replied_at).length;

    // Calculate average response time in minutes
    const responseTimes = data
      .filter(m => m.sent_at && m.replied_at)
      .map(m => {
        const sent = new Date(m.sent_at).getTime();
        const replied = new Date(m.replied_at).getTime();
        return (replied - sent) / (1000 * 60);
      });

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      totalSent,
      delivered,
      read,
      failed,
      responseRate: totalSent > 0 ? (replied / totalSent) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
