/**
 * WhatsApp Cloud API Service
 * 
 * Direct integration with Meta's WhatsApp Cloud API.
 * Replaces Evolution API for users with direct Cloud API credentials.
 */

const WHATSAPP_API_VERSION = 'v18.0';

interface WhatsAppCloudConfig {
    accessToken: string;
    phoneNumberId: string;
}

class WhatsAppCloudClient {
    private config: WhatsAppCloudConfig;
    private baseUrl: string;

    constructor() {
        this.config = {
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        };
        this.baseUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${this.config.phoneNumberId}`;

        if (!this.config.accessToken || !this.config.phoneNumberId) {
            console.warn('WhatsApp Cloud API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
        }
    }

    private async sendRequest(endpoint: string, body: Record<string, unknown>) {
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
        }

        return data;
    }

    async sendText(to: string, text: string) {
        // Note: Free form text only works if 24h window is open. 
        // Otherwise requires template.
        // We clean the number first.
        const cleanTo = to.replace(/\D/g, ''); // Cloud API expects digits only, no + or @s.whatsapp.net

        return this.sendRequest('messages', {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: { body: text },
        });
    }

    async sendTemplate(to: string, templateName: string, languageCode: string = 'pt_BR', components: unknown[] = []) {
        const cleanTo = to.replace(/\D/g, '');

        return this.sendRequest('messages', {
            messaging_product: 'whatsapp',
            to: cleanTo,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            },
        });
    }

    // Adapter methods matching the Interface
    async sendMedia(to: string, options: { url: string; caption?: string }) {
        // Simplified media sending (URL based)
        const cleanTo = to.replace(/\D/g, '');
        return this.sendRequest('messages', {
            messaging_product: 'whatsapp',
            to: cleanTo,
            type: 'image', // Assuming image for now
            image: { link: options.url, caption: options.caption }
        });
    }
}

const client = new WhatsAppCloudClient();

// Re-exporting renderers from templates logic (reusing existing file structure if possible, 
// or defining here for simplicity as we migrate)

import {
    renderAppointmentConfirmation,
    renderAppointmentReminder,
    renderBirthdayGreeting,
    renderSessionReminder,
    renderPaymentConfirmation,
    renderReactivationMessage,
    AppointmentMessageData,
    BirthdayMessageData,
    SessionReminderData,
    ReactivationMessageData
} from './evolution.js'; // We reuse renderers for text fallback, but Cloud API needs real templates

export const WhatsAppService = {
    sendText: client.sendText.bind(client),
    sendTemplate: client.sendTemplate.bind(client),
    sendMedia: client.sendMedia.bind(client),

    // High-level methods - For Cloud API, these SHOULD use templates.
    // We will default to text for now but log a warning that templates are recommended.

    async sendAppointmentConfirmation(number: string, data: AppointmentMessageData) {
        // IDEALLY: return this.sendTemplate(number, 'appointment_confirmation', 'pt_BR', [...])
        // FOR NOW (MVP/Dev): Send text (will fail if outside 24h window)
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

    async sendPaymentConfirmation(number: string, data: { patientName: string; amount: string; paymentMethod: string }) {
        return this.sendText(number, renderPaymentConfirmation(data));
    },

    async sendReactivation(number: string, data: ReactivationMessageData) {
        return this.sendText(number, renderReactivationMessage(data));
    }
};
