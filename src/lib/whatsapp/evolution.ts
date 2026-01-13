/**
 * Evolution API WhatsApp Service
 *
 * Complete integration with Evolution API for WhatsApp messaging
 * Supports text messages, media, templates, and batch sending
 */

interface EvolutionApiConfig {
  apiUrl: string;
  apiKey: string;
}

interface WhatsAppMessageOptions {
  delay?: number; // Delay between messages in milliseconds
  presence?: 'composing' | 'recording' | 'available';
  linkPreview?: boolean;
}

interface WhatsAppMediaOptions {
  url: string;
  caption?: string;
  fileName?: string;
}

interface EvolutionApiResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp?: number;
  status?: string;
}

// ============================================================================
// EVOLUTION API CLIENT
// ============================================================================

class EvolutionApiClient {
  private config: EvolutionApiConfig;

  constructor() {
    this.config = {
      apiUrl: process.env.WHATSAPP_API_URL || '',
      apiKey: process.env.WHATSAPP_API_KEY || '',
    };

    if (!this.config.apiUrl || !this.config.apiKey) {
      console.warn('Evolution API not configured. Set WHATSAPP_API_URL and WHATSAPP_API_KEY.');
    }
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendText(
    number: string,
    text: string,
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.apiUrl || !this.config.apiKey) {
        return { success: false, error: 'Evolution API not configured' };
      }

      // Clean phone number (remove non-digits, add country code if needed)
      const cleanNumber = this.cleanPhoneNumber(number);

      const payload: any = {
        number: cleanNumber,
        text,
        options: {
          delay: options?.delay || 1200,
          presence: options?.presence || 'composing',
          linkPreview: options?.linkPreview ?? false,
        },
      };

      const response = await fetch(
        `${this.config.apiUrl}/message/sendText/${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API error: ${error}`);
      }

      const data: EvolutionApiResponse = await response.json();

      return {
        success: true,
        messageId: data.key?.id,
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a media message (image, video, document, audio)
   */
  async sendMedia(
    number: string,
    media: WhatsAppMediaOptions,
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.apiUrl || !this.config.apiKey) {
        return { success: false, error: 'Evolution API not configured' };
      }

      const cleanNumber = this.cleanPhoneNumber(number);

      const payload: any = {
        number: cleanNumber,
        mediaUrl: media.url,
        caption: media.caption || '',
        fileName: media.fileName || '',
        options: {
          delay: options?.delay || 1200,
          presence: options?.presence || 'composing',
        },
      };

      const response = await fetch(
        `${this.config.apiUrl}/message/sendMedia/${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API error: ${error}`);
      }

      const data: EvolutionApiResponse = await response.json();

      return {
        success: true,
        messageId: data.key?.id,
      };
    } catch (error) {
      console.error('WhatsApp media send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a template message
   */
  async sendTemplate(
    number: string,
    templateName: string,
    templateData: Record<string, string> = {},
    components?: any[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.apiUrl || !this.config.apiKey) {
        return { success: false, error: 'Evolution API not configured' };
      }

      const cleanNumber = this.cleanPhoneNumber(number);

      const payload: any = {
        number: cleanNumber,
        templateName,
        templateData,
        components,
      };

      const response = await fetch(
        `${this.config.apiUrl}/message/sendTemplate/${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API error: ${error}`);
      }

      const data: EvolutionApiResponse = await response.json();

      return {
        success: true,
        messageId: data.key?.id,
      };
    } catch (error) {
      console.error('WhatsApp template send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a number is registered on WhatsApp
   */
  async checkNumber(number: string): Promise<{ exists: boolean; jid?: string; error?: string }> {
    try {
      if (!this.config.apiUrl || !this.config.apiKey) {
        return { exists: false, error: 'Evolution API not configured' };
      }

      const cleanNumber = this.cleanPhoneNumber(number);

      const response = await fetch(
        `${this.config.apiUrl}/checkNumber/${cleanNumber}/${this.config.apiKey}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Evolution API error: ${error}`);
      }

      const data = await response.json();

      return {
        exists: data.exists || false,
        jid: data.jid,
      };
    } catch (error) {
      console.error('WhatsApp check number error:', error);
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(number: string): string {
    // Remove all non-numeric characters
    let cleaned = number.replace(/\D/g, '');

    // Add country code if missing (assuming Brazil +55)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    // Format for WhatsApp API: add @s.whatsapp.net suffix
    return `${cleaned}@s.whatsapp.net`;
  }
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export const WhatsAppTemplates = {
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  BIRTHDAY_GREETING: 'birthday_greeting',
  WELCOME_MESSAGE: 'welcome_message',
  SESSION_REMINDER: 'session_reminder',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
} as const;

// ============================================================================
// MESSAGE RENDERERS
// ============================================================================

export interface AppointmentMessageData {
  patientName: string;
  therapistName: string;
  date: string;
  time: string;
  location?: string;
  organizationName: string;
}

export interface BirthdayMessageData {
  patientName: string;
  organizationName: string;
  therapistName?: string;
}

export interface SessionReminderData {
  patientName: string;
  date: string;
  time: string;
}

/**
 * Render appointment confirmation message
 */
export function renderAppointmentConfirmation(data: AppointmentMessageData): string {
  const location = data.location ? `\n📍 *Local*: ${data.location}` : '';

  return `
✅ *Consulta Confirmada*

Olá *${data.patientName}*!

Sua consulta foi agendada com sucesso:

📅 *Data*: ${data.date}
⏰ *Horário*: ${data.time}
👨‍⚕️ *Fisioterapeuta*: ${data.therapistName}${location}

Por favor, chegue com 15 minutos de antecedência.

Se precisar reagendar, entre em contato conosco.

_${data.organizationName}_
  `.trim();
}

/**
 * Render appointment reminder message
 */
export function renderAppointmentReminder(data: AppointmentMessageData): string {
  return `
🔔 *Lembrete de Consulta*

Olá *${data.patientName}*!

Você tem uma consulta *amanhã* às *${data.time}*.

📅 *Data*: ${data.date}
👨‍⚕️ *Fisioterapeuta*: ${data.therapistName}

Não se esqueça! Nos vemos em breve. 💪

_${data.organizationName}_
  `.trim();
}

/**
 * Render birthday greeting message
 */
export function renderBirthdayGreeting(data: BirthdayMessageData): string {
  const therapist = data.therapistName
    ? `\n\nCom carinho,\n*${data.therapistName}* e toda a equipe.`
    : '';

  return `
🎉 *Feliz Aniversário!*

Olá *${data.patientName}*!

Todo o time da *${data.organizationName}* deseja a você um dia muito especial! 🎂

Que este novo ano traga muita saúde, felicidade e realizações!${therapist}
  `.trim();
}

/**
 * Render session reminder message
 */
export function renderSessionReminder(data: SessionReminderData): string {
  return `
⏰ *Lembrete de Sessão*

Olá *${data.patientName}*!

Lembrete da sua sessão hoje às *${data.time}*.

Nos vemos logo mais! 💪
  `.trim();
}

/**
 * Render payment confirmation message
 */
export function renderPaymentConfirmation(data: {
  patientName: string;
  amount: string;
  paymentMethod: string;
}): string {
  return `
💳 *Pagamento Confirmado*

Olá *${data.patientName}*!

Seu pagamento no valor de *R$ ${data.amount}* foi confirmado.

📝 *Método de pagamento*: ${data.paymentMethod}

Obrigado pela preferência! 💜
  `.trim();
}

// ============================================================================
// WHATSAPP SERVICE
// ============================================================================

const client = new EvolutionApiClient();

export const WhatsAppService = {
  sendText: client.sendText.bind(client),
  sendMedia: client.sendMedia.bind(client),
  sendTemplate: client.sendTemplate.bind(client),
  checkNumber: client.checkNumber.bind(client),

  // Convenience methods for common messages
  async sendAppointmentConfirmation(
    number: string,
    data: AppointmentMessageData
  ) {
    return this.sendText(number, renderAppointmentConfirmation(data));
  },

  async sendAppointmentReminder(number: string, data: AppointmentMessageData) {
    return this.sendText(number, renderAppointmentReminder(data));
  },

  async sendBirthdayGreeting(number: string, data: BirthdayMessageData) {
    return this.sendText(number, renderBirthdayGreeting(data));
  },

  async sendSessionReminder(number: string, data: SessionReminderData) {
    return this.sendText(number, renderSessionReminder(data));
  },

  async sendPaymentConfirmation(
    number: string,
    data: { patientName: string; amount: string; paymentMethod: string }
  ) {
    return this.sendText(number, renderPaymentConfirmation(data));
  },

  templates: WhatsAppTemplates,
  renderers: {
    renderAppointmentConfirmation,
    renderAppointmentReminder,
    renderBirthdayGreeting,
    renderSessionReminder,
    renderPaymentConfirmation,
  },
};
