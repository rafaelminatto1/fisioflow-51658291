import { ResendProvider } from './providers/ResendProvider';
import { SendGridProvider } from './providers/SendGridProvider';
import type {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailConfig,
  EmailServiceConfig,
  EmailAddress
} from './types';
import { supabase } from '@/lib/supabase';

export class EmailService {
  private provider: EmailProvider;
  private config: EmailServiceConfig;
  private processingQueue = false;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.provider = this.createProvider(config.provider);
    
    // Start queue processing if enabled
    if (config.queueProcessingInterval > 0) {
      this.startQueueProcessing();
    }
  }

  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'resend':
        return new ResendProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${(config as EmailServiceConfig).provider}`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Sending email to ${this.formatRecipients(options.to)}`, {
        subject: options.subject,
        provider: this.provider.name
      });

      const result = await this.sendWithRetry(options);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.log('info', `Email sent successfully in ${duration}ms`, {
          messageId: result.messageId,
          provider: result.provider
        });
      } else {
        this.log('error', `Email failed to send: ${result.error}`, {
          provider: result.provider,
          duration
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.log('error', `Email service error: ${errorMessage}`, {
        duration,
        provider: this.provider.name
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.provider.name
      };
    }
  }

  async sendTemplate(
    templateId: string,
    to: EmailAddress | EmailAddress[],
    variables?: Record<string, string | number | boolean>
  ): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Sending template ${templateId} to ${this.formatRecipients(to)}`, {
        templateId,
        provider: this.provider.name
      });

      const result = await this.sendTemplateWithRetry(templateId, to, variables);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.log('info', `Template email sent successfully in ${duration}ms`, {
          messageId: result.messageId,
          templateId,
          provider: result.provider
        });
      } else {
        this.log('error', `Template email failed to send: ${result.error}`, {
          templateId,
          provider: result.provider,
          duration
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.log('error', `Template email service error: ${errorMessage}`, {
        templateId,
        duration,
        provider: this.provider.name
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.provider.name
      };
    }
  }

  private async sendWithRetry(options: EmailOptions): Promise<EmailResult> {
    const { maxAttempts, backoffMultiplier, initialDelay, maxDelay } = this.config.retry;
    
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.provider.sendEmail(options);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error || 'Unknown error';
        
        // Don't retry on certain errors (like invalid email format)
        if (this.isNonRetryableError(lastError)) {
          return result;
        }
        
        if (attempt < maxAttempts) {
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          );
          
          this.log('warn', `Email attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: lastError,
            attempt,
            maxAttempts
          });
          
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt < maxAttempts) {
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          );
          
          await this.sleep(delay);
        }
      }
    }
    
    return {
      success: false,
      error: `Failed after ${maxAttempts} attempts: ${lastError}`,
      provider: this.provider.name
    };
  }

  private async sendTemplateWithRetry(
    templateId: string,
    to: EmailAddress | EmailAddress[],
    variables?: Record<string, string | number | boolean>
  ): Promise<EmailResult> {
    const { maxAttempts, backoffMultiplier, initialDelay, maxDelay } = this.config.retry;
    
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.provider.sendTemplate(templateId, to, variables);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error || 'Unknown error';
        
        if (this.isNonRetryableError(lastError)) {
          return result;
        }
        
        if (attempt < maxAttempts) {
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          );
          
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt < maxAttempts) {
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          );
          
          await this.sleep(delay);
        }
      }
    }
    
    return {
      success: false,
      error: `Failed after ${maxAttempts} attempts: ${lastError}`,
      provider: this.provider.name
    };
  }

  async processEmailQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    
    try {
      this.log('info', 'Processing email queue');
      
      // Get pending emails from queue
      const { data: queueItems, error } = await supabase
        .rpc('process_email_queue');

      if (error) {
        throw error;
      }

      if (!queueItems || queueItems.length === 0) {
        this.log('info', 'No emails in queue to process');
        return;
      }

      this.log('info', `Processing ${queueItems.length} emails from queue`);

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
        } catch (error) {
          this.log('error', `Failed to process queue item ${item.notification_id}`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      this.log('error', 'Failed to process email queue', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.processingQueue = false;
    }
  }

  private async processQueueItem(item: { notification_id: string; recipient_email: string; subject: string; content: string }): Promise<void> {
    const emailOptions: EmailOptions = {
      to: { email: item.recipient_email },
      from: {
        email: this.config.provider.fromEmail,
        name: this.config.provider.fromName
      },
      subject: item.subject,
      html: item.content
    };

    const result = await this.sendEmail(emailOptions);

    // Update notification status
    await supabase.rpc('update_notification_status', {
      p_notification_id: item.notification_id,
      p_status: result.success ? 'sent' : 'failed',
      p_error: result.error || null
    });
  }

  private startQueueProcessing(): void {
    setInterval(() => {
      this.processEmailQueue().catch(error => {
        this.log('error', 'Queue processing interval error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }, this.config.queueProcessingInterval);
  }

  async validateProvider(): Promise<boolean> {
    try {
      return await this.provider.validateConfig();
    } catch (error) {
      this.log('error', 'Provider validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.provider.name
      });
      return false;
    }
  }

  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'invalid email',
      'malformed email',
      'invalid recipient',
      'authentication failed',
      'api key invalid',
      'unauthorized'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }

  private formatRecipients(to: EmailAddress | EmailAddress[]): string {
    if (Array.isArray(to)) {
      return to.map(addr => addr.email).join(', ');
    }
    return to.email;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    if (!this.config.enableLogging) {
      return;
    }

    console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    
    // Here you could also send logs to an external service
    // like Sentry, LogRocket, or a custom logging endpoint
  }
}

// Factory function to create EmailService instance
export function createEmailService(config: EmailServiceConfig): EmailService {
  return new EmailService(config);
}

// Default configuration
export const defaultEmailConfig: Omit<EmailServiceConfig, 'provider'> = {
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 10000
  },
  queueProcessingInterval: 30000, // 30 seconds
  enableLogging: true
};

// Singleton instance (optional)
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService | null {
  return emailServiceInstance;
}

export function initializeEmailService(config: EmailServiceConfig): EmailService {
  emailServiceInstance = new EmailService(config);
  return emailServiceInstance;
}