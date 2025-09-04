import { Resend } from 'resend';
import type { 
  EmailProvider, 
  EmailOptions, 
  EmailResult, 
  EmailAddress, 
  ResendConfig 
} from '../types';

export class ResendProvider implements EmailProvider {
  public readonly name = 'resend';
  private resend: Resend;
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
    this.resend = new Resend(config.apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const { to, from, subject, html, text, cc, bcc, replyTo, attachments } = options;

      // Convert EmailAddress to Resend format
      const formatAddress = (addr: EmailAddress) => 
        addr.name ? `${addr.name} <${addr.email}>` : addr.email;

      const formatAddresses = (addresses: EmailAddress | EmailAddress[]) => {
        if (Array.isArray(addresses)) {
          return addresses.map(formatAddress);
        }
        return formatAddress(addresses);
      };

      const emailData: any = {
        from: formatAddress(from),
        to: formatAddresses(to),
        subject,
        html,
        text,
      };

      if (cc && cc.length > 0) {
        emailData.cc = cc.map(formatAddress);
      }

      if (bcc && bcc.length > 0) {
        emailData.bcc = bcc.map(formatAddress);
      }

      if (replyTo) {
        emailData.reply_to = formatAddress(replyTo);
      }

      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
          path: att.path
        }));
      }

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          provider: this.name
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: this.name
      };
    }
  }

  async sendTemplate(
    templateId: string, 
    to: EmailAddress | EmailAddress[], 
    variables?: Record<string, any>
  ): Promise<EmailResult> {
    try {
      const formatAddresses = (addresses: EmailAddress | EmailAddress[]) => {
        if (Array.isArray(addresses)) {
          return addresses.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email);
        }
        return addresses.name ? `${addresses.name} <${addresses.email}>` : addresses.email;
      };

      const emailData: any = {
        from: this.config.fromName 
          ? `${this.config.fromName} <${this.config.fromEmail}>`
          : this.config.fromEmail,
        to: formatAddresses(to),
        template: templateId,
      };

      if (variables) {
        emailData.template_data = variables;
      }

      if (this.config.replyTo) {
        emailData.reply_to = this.config.replyTo;
      }

      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          provider: this.name
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: this.name
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test the API key by attempting to get domains
      const result = await this.resend.domains.list();
      return !result.error;
    } catch (error) {
      console.error('Resend config validation failed:', error);
      return false;
    }
  }

  // Helper method to create email templates in Resend
  async createTemplate(name: string, subject: string, html: string): Promise<string | null> {
    try {
      // Note: Resend doesn't have a direct template API like SendGrid
      // This is a placeholder for future implementation
      console.warn('Resend template creation not implemented yet');
      return null;
    } catch (error) {
      console.error('Failed to create Resend template:', error);
      return null;
    }
  }

  // Helper method to get sending statistics
  async getStats(): Promise<any> {
    try {
      // Note: Resend doesn't provide detailed stats API
      // This would need to be tracked separately
      console.warn('Resend stats not available through API');
      return null;
    } catch (error) {
      console.error('Failed to get Resend stats:', error);
      return null;
    }
  }
}