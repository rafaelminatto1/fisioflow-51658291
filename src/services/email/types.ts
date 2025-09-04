export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  path?: string;
}

export interface EmailTemplate {
  subject: string;
  html?: string;
  text?: string;
  variables?: Record<string, any>;
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  subject: string;
  html?: string;
  text?: string;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateVariables?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProviderConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface ResendConfig extends EmailProviderConfig {
  provider: 'resend';
}

export interface SendGridConfig extends EmailProviderConfig {
  provider: 'sendgrid';
}

export type EmailConfig = ResendConfig | SendGridConfig;

export interface EmailProvider {
  name: string;
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  sendTemplate(templateId: string, to: EmailAddress | EmailAddress[], variables?: Record<string, any>): Promise<EmailResult>;
  validateConfig(): Promise<boolean>;
}

export interface EmailQueueItem {
  id: string;
  notificationId: string;
  recipientEmail: string;
  subject: string;
  content: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailStats {
  totalSent: number;
  totalPending: number;
  totalScheduled: number;
  successRate: number;
  failedToday: number;
  sentToday: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface EmailServiceConfig {
  provider: EmailConfig;
  retry: RetryConfig;
  queueProcessingInterval: number;
  enableLogging: boolean;
}

export enum EmailStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled'
}

export enum EmailProvider {
  RESEND = 'resend',
  SENDGRID = 'sendgrid'
}

export interface EmailLog {
  id: string;
  notificationId: string;
  provider: string;
  status: EmailStatus;
  error?: string;
  messageId?: string;
  sentAt?: Date;
  createdAt: Date;
}