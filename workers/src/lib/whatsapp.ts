import type { Env } from '../types/env';

/**
 * WhatsApp Business API Service
 * Centraliza o envio de mensagens via Meta Graph API.
 */
export class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private env: Env) {}

  /**
   * Envia uma mensagem de texto simples
   */
  async sendTextMessage(to: string, text: string) {
    const phoneId = this.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = this.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !token) {
      console.warn('[WhatsApp] Credenciais não configuradas');
      return { error: 'Credentials missing' };
    }

    const endpoint = `${this.baseUrl}/${phoneId}/messages`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''), // Limpa o número (apenas dígitos)
        type: 'text',
        text: { body: text },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[WhatsApp Error]', result);
    }
    return result;
  }

  /**
   * Envia uma mensagem baseada em Template (Obrigatório para iniciar conversas)
   */
  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'pt_BR', components: any[] = []) {
    const phoneId = this.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = this.env.WHATSAPP_ACCESS_TOKEN;

    const endpoint = `${this.baseUrl}/${phoneId}/messages`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components
        },
      }),
    });

    return response.json();
  }
}
