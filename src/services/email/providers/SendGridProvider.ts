import sgMail from '@sendgrid/mail';
import type { 
  EmailProvider, 
  EmailOptions, 
  EmailResult, 
  EmailAddress, 
  SendGridConfig 
} from '../types';

export class SendGridProvider implements EmailProvider {
  public readonly name = 'sendgrid';
  private config: SendGridConfig;

  constructor(config: SendGridConfig) {
    this.config = config;
    sgMail.setApiKey(config.apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const { to, from, subject, html, text, cc, bcc, replyTo, attachments } = options;

      // Convert EmailAddress to SendGrid format
      const formatAddress = (addr: EmailAddress) => ({
        email: addr.email,
        name: addr.name
      });

      const formatAddresses = (addresses: EmailAddress | EmailAddress[]) => {
        if (Array.isArray(addresses)) {
          return addresses.map(formatAddress);
        }
        return formatAddress(addresses);
      };

      const emailData: Record<string, unknown> = {
        from: formatAddress(from),
        to: formatAddresses(to),
        subject,
      };

      if (html) {
        emailData.html = html;
      }

      if (text) {
        emailData.text = text;
      }

      if (cc && cc.length > 0) {
        emailData.cc = cc.map(formatAddress);
      }

      if (bcc && bcc.length > 0) {
        emailData.bcc = bcc.map(formatAddress);
      }

      if (replyTo) {
        emailData.replyTo = formatAddress(replyTo);
      }

      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) 
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64'),
          type: att.contentType,
          disposition: 'attachment'
        }));
      }

      const result = await sgMail.send(emailData);

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || 'unknown',
        provider: this.name
      };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.body?.errors) {
        errorMessage = error.response.body.errors.map((e: { message: string }) => e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.name
      };
    }
  }

  async sendTemplate(
    templateId: string, 
    to: EmailAddress | EmailAddress[], 
    variables?: Record<string, string | number | boolean>
  ): Promise<EmailResult> {
    try {
      const formatAddresses = (addresses: EmailAddress | EmailAddress[]) => {
        if (Array.isArray(addresses)) {
          return addresses.map(addr => ({ email: addr.email, name: addr.name }));
        }
        return { email: addresses.email, name: addresses.name };
      };

      const emailData: Record<string, unknown> = {
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        to: formatAddresses(to),
        templateId: templateId,
      };

      if (variables) {
        emailData.dynamicTemplateData = variables;
      }

      if (this.config.replyTo) {
        emailData.replyTo = {
          email: this.config.replyTo,
          name: this.config.fromName
        };
      }

      const result = await sgMail.send(emailData);

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || 'unknown',
        provider: this.name
      };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.body?.errors) {
        errorMessage = error.response.body.errors.map((e: { message: string }) => e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.name
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test the API key by attempting to get user info
      const request = {
        url: '/v3/user/account',
        method: 'GET' as const,
      };

      await sgMail.request(request);
      return true;
    } catch (error) {
      console.error('SendGrid config validation failed:', error);
      return false;
    }
  }

  // Helper method to create email templates in SendGrid
  async createTemplate(name: string, subject: string, html: string): Promise<string | null> {
    try {
      const request = {
        url: '/v3/templates',
        method: 'POST' as const,
        body: {
          name: name,
          generation: 'dynamic'
        }
      };

      const response = await sgMail.request(request);
      const templateId = response[1].id;

      // Create a version for the template
      const versionRequest = {
        url: `/v3/templates/${templateId}/versions`,
        method: 'POST' as const,
        body: {
          template_id: templateId,
          active: 1,
          name: `${name} Version 1`,
          subject: subject,
          html_content: html,
          generate_plain_content: true
        }
      };

      await sgMail.request(versionRequest);
      return templateId;
    } catch (error) {
      console.error('Failed to create SendGrid template:', error);
      return null;
    }
  }

  // Helper method to get sending statistics
  async getStats(startDate?: string, endDate?: string): Promise<Record<string, unknown> | null> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('aggregated_by', 'day');

      const request = {
        url: `/v3/stats?${params.toString()}`,
        method: 'GET' as const,
      };

      const response = await sgMail.request(request);
      return response[1];
    } catch (error) {
      console.error('Failed to get SendGrid stats:', error);
      return null;
    }
  }

  // Helper method to list templates
  async listTemplates(): Promise<Record<string, unknown>[]> {
    try {
      const request = {
        url: '/v3/templates?generations=dynamic',
        method: 'GET' as const,
      };

      const response = await sgMail.request(request);
      return response[1].templates || [];
    } catch (error) {
      console.error('Failed to list SendGrid templates:', error);
      return [];
    }
  }
}