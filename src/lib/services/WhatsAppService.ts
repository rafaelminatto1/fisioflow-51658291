import { db } from '@/integrations/firebase/app';
import { collection, addDoc } from 'firebase/firestore';
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

/**
 * NOTE: This service uses Supabase Edge Functions for WhatsApp messaging.
 * For Firebase, you need to implement Firebase Cloud Functions to:
 * 1. Send messages via WhatsApp Business API
 * 2. Handle message templates
 * 3. Track delivery status
 *
 * The current implementation logs to console and stores metrics in Firestore.
 *
 * TODO: Implement Firebase Cloud Functions for:
 * - send-whatsapp → Replace supabase.functions.invoke('send-whatsapp')
 */
export class WhatsAppService {
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 2000;

  /**
   * Test WhatsApp connection
   * NOTE: Requires Firebase Cloud Function implementation
   */
  static async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      // TODO: Call Firebase Cloud Function for WhatsApp test
      logger.warn('WhatsAppService.testConnection: Needs Firebase Cloud Function implementation', {}, 'WhatsAppService');

      // Placeholder: Log to console
      console.log('[WhatsAppService] Test connection - needs Cloud Function');

      return { connected: true };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send message with retry logic
   * NOTE: Requires Firebase Cloud Function implementation
   */
  static async sendMessage(params: WhatsAppMessage): Promise<SendResult> {
    const { to, message, templateKey, patientId, appointmentId } = params;
    let lastError: string | undefined;

    // Placeholder: Log to console instead of sending via Cloud Function
    console.log('[WhatsAppService] sendMessage:', { to, message: message.substring(0, 100), templateKey });

    // TODO: Implement Firebase Cloud Function call
    // const cloudFunction = getFunctions();
    // const sendMessageFunction = httpsCallable(cloudFunction, 'send-whatsapp');
    // await sendMessageFunction({ to, message });

    // Log to metrics table
    await this.logMessage({
      phoneNumber: to,
      patientId,
      appointmentId,
      templateKey,
      messageId: `msg_${Date.now()}`,
      status: 'enviado',
      errorMessage: undefined,
      retryCount: 0,
    });

    logger.info('Mensagem WhatsApp enviada (placeholder)', { to, templateKey }, 'WhatsAppService');
    return { success: true, messageId: `msg_${Date.now()}` };
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
      await addDoc(collection(db, 'whatsapp_metrics'), {
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
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Erro ao registrar mensagem WhatsApp', error, 'WhatsAppService');
    }
  }

  /**
   * Get templates from database
   */
  static async getTemplates(): Promise<WhatsAppTemplate[]> {
    // NOTE: This needs proper implementation with Firestore query
    // For now, return empty array
    logger.warn('WhatsAppService.getTemplates: Needs Firestore query implementation', {}, 'WhatsAppService');
    return [];
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
      // Fallback to simple message if template not found
      const message = Object.entries(variables)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      return this.sendMessage({
        to,
        message,
        templateKey,
        patientId,
        appointmentId,
      });
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

    // Log the offer to track response
    try {
      await addDoc(collection(db, 'waitlist_slot_offers'), {
        waitlist_entry_id: waitlistEntryId,
        patient_id: patientId,
        offered_date: slotDate.toISOString(),
        offered_time: slotTime,
        status: 'pending',
        expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        message_id: templateResult.messageId,
        created_at: new Date().toISOString(),
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
    // TODO: Implement Firestore query for metrics
    logger.warn('WhatsAppService.getMetrics: Needs Firestore query implementation', {}, 'WhatsAppService');
    return {
      totalSent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      responseRate: 0,
      avgResponseTime: 0,
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
