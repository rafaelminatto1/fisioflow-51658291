import type { Env } from '../../types/env';

export interface WhatsAppMessage {
  to: string;
  body?: string;
  templateName?: string;
  templateLanguage?: string;
  templateVariables?: string[];
}

/**
 * WhatsApp Messaging Service (Integration with Twilio)
 */
export class WhatsAppService {
  constructor(private env: Env) {}

  /**
   * Sends a WhatsApp message using Twilio API
   */
  async send(data: WhatsAppMessage) {
    if (!this.env.TWILIO_ACCOUNT_SID || !this.env.TWILIO_AUTH_TOKEN) {
      console.warn('[WhatsApp] TWILIO credentials missing, returning mock');
      return { sid: 'MOCK-' + Math.random().toString(36).substring(7), status: 'sent' };
    }

    const auth = btoa(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`);
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.env.TWILIO_ACCOUNT_SID}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${data.to.replace(/\D/g, '')}`);
    formData.append('From', `whatsapp:${this.env.TWILIO_PHONE_NUMBER}`);

    if (data.templateName) {
      // For more complex template handling, you'd use Twilio Content API
      // Here we assume a simple body formatted according to template
      formData.append('Body', data.body || '');
    } else {
      formData.append('Body', data.body || '');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await response.json() as any;
    if (!response.ok) {
      console.error('[WhatsApp Error]', result);
      throw new Error(result.message || 'Twilio API error');
    }

    return result;
  }

  /**
   * Specialized reminder message
   */
  async sendReminder(patientName: string, phoneNumber: string, date: string, time: string) {
    const body = `Olá ${patientName}! 👋\nLembramos de sua consulta na FisioFlow para o dia ${date} às ${time}.\nPor favor, confirme respondendo 'SIM' ou solicite reagendamento.`;
    return this.send({ to: phoneNumber, body });
  }
}
