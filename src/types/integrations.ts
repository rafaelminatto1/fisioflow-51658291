/**
 * Integrations Types
 * Sistema de integrações com serviços terceiros
 */


/**
 * Integração configurada
 */

import { Timestamp } from '@/integrations/firebase/app';

export interface Integration {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  name: string;                    // Nome custom da integração
  is_active: boolean;
  config: IntegrationConfig;       // Config específica do provider
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_sync_at?: Timestamp;
  sync_status?: 'synced' | 'syncing' | 'pending' | 'error';
  error_message?: string;
}

/**
 * Providers de integração disponíveis
 */
export type IntegrationProvider =
  | 'google_calendar'              // Google Calendar sync
  | 'zoom'                         // Zoom Meetings
  | 'stripe'                       // Stripe Payments
  | 'whatsapp'                     // WhatsApp Business API
  | 'healthkit'                    // Apple HealthKit
  | 'google_fit'                   // Google Fit
  | 'slack'                        // Slack notifications
  | 'teams'                        // Microsoft Teams
  | 'outlook_calendar'             // Outlook Calendar
  | 'quickbooks'                   // QuickBooks accounting
  | 'asana'                        // Asana project sync
  | 'trello'                       // Trello sync
  | 'custom_webhook';              // Webhook custom

/**
 * Config de integração (genérica, tipada por provider)
 */
export type IntegrationConfig =
  | GoogleCalendarConfig
  | ZoomConfig
  | StripeConfig
  | WhatsAppConfig
  | HealthKitConfig
  | GoogleFitConfig
  | SlackConfig
  | TeamsConfig
  | OutlookCalendarConfig
  | QuickBooksConfig
  | CustomWebhookConfig;

/**
 * Config Google Calendar
 */
export interface GoogleCalendarConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;           // OAuth refresh token (encrypt)
  calendar_id?: string;            // null = primary calendar
  sync_direction: 'bidirectional' | 'import_only' | 'export_only';
  sync_created_before?: Timestamp; // Não sync eventos antes desta data
  default_calendar_id?: string;    // Calendar padrão para criar eventos
}

/**
 * Evento syncado do Google Calendar
 */
export interface GoogleCalendarEvent {
  id: string;
  fisioflow_appointment_id?: string;
  google_event_id: string;
  google_calendar_id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; response?: string }>;
  location?: string;
  hangout_link?: string;           // Google Meet link
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Config Zoom
 */
export interface ZoomConfig {
  api_key: string;
  api_secret: string;              // Encrypt
  account_id?: string;
  user_id?: string;
  meeting_type: 1 | 2 | 3 | 8;     // 1=inst, 2=scheduled, 3=recurring, 8=recurring fixed
  default_duration: number;        // Minutos
  require_password: boolean;
  password?: string;
  enable_recording: 'local' | 'cloud' | 'none';
}

/**
 * Meeting Zoom criado
 */
export interface ZoomMeeting {
  id: string;
  fisioflow_appointment_id: string;
  zoom_meeting_id: number;
  zoom_meeting_uuid: string;
  join_url: string;
  start_url: string;               // URL para host
  password?: string;
  topic: string;
  start_time: Date;
  duration: number;                // Minutos
  created_at: Timestamp;
}

/**
 * Config Stripe
 */
export interface StripeConfig {
  public_key: string;
  secret_key: string;              // Encrypt
  webhook_secret: string;          // Para verificar webhooks
  default_currency: string;        // BRL, USD, etc.
  business_name: string;
  success_url: string;
  cancel_url: string;
}

/**
 * Customer Stripe
 */
export interface StripeCustomer {
  id: string;
  fisioflow_user_id: string;
  stripe_customer_id: string;
  email: string;
  name?: string;
  phone?: string;
  created_at: Timestamp;
}

/**
 * Subscription Stripe
 */
export interface StripeSubscription {
  id: string;
  fisioflow_user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid';
  current_period_start: Timestamp;
  current_period_end: Timestamp;
  cancel_at_period_end: boolean;
  created_at: Timestamp;
}

/**
 * Config WhatsApp Business API
 */
export interface WhatsAppConfig {
  phone_number_id: string;
  access_token: string;            // Encrypt
  business_account_id: string;
  webhook_verify_token: string;
  template_namespace?: string;
}

/**
 * Mensagem WhatsApp enviada
 */
export interface WhatsAppMessage {
  id: string;
  fisioflow_recipient_id: string;
  whatsapp_message_id: string;
  template_name?: string;
  template_language?: string;
  content: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: Timestamp;
  delivered_at?: Timestamp;
  read_at?: Timestamp;
  error?: string;
}

/**
 * Config HealthKit (Apple)
 */
export interface HealthKitConfig {
  enable_sync: boolean;
  data_types: HealthDataType[];
  sync_frequency: 'realtime' | 'daily' | 'weekly';
  last_sync?: Timestamp;
}

/**
 * Tipos de dados HealthKit
 */
export type HealthDataType =
  | 'steps'                        // Passos diários
  | 'active_energy'                // Calorias ativas
  | 'distance'                     // Distância (m)
  | 'flights_climbed'              // Escadas
  | 'heart_rate'                   // Frequência cardíaca
  | 'resting_heart_rate'           // FC em repouso
  | 'sleep_analysis'               // Análise de sono
  | 'workout';                     // Treinos

/**
 * Dado HealthKit syncado
 */
export interface HealthDataPoint {
  id: string;
  patient_id: string;
  data_type: HealthDataType;
  value: number;
  unit: string;
  date: Date;                      // Data/hora da medição
  source: 'healthkit' | 'google_fit';
  synced_at: Timestamp;
}

/**
 * Config Google Fit
 */
export interface GoogleFitConfig {
  access_token: string;            // OAuth token
  refresh_token: string;
  data_types: HealthDataType[];
  sync_frequency: 'realtime' | 'daily' | 'weekly';
  last_sync?: Timestamp;
}

/**
 * Config Slack
 */
export interface SlackConfig {
  webhook_url: string;             // Incoming webhook URL
  channel?: string;                // Default channel
  username?: string;
  icon_emoji?: string;
}

/**
 * Config Microsoft Teams
 */
export interface TeamsConfig {
  webhook_url: string;             // Incoming webhook URL
}

/**
 * Config Outlook Calendar
 */
export interface OutlookCalendarConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  calendar_id?: string;
  sync_direction: 'bidirectional' | 'import_only' | 'export_only';
}

/**
 * Config QuickBooks
 */
export interface QuickBooksConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  realm_id: string;                // Company ID
  sync_invoices: boolean;
  sync_payments: boolean;
}

/**
 * Config Webhook Custom
 */
export interface CustomWebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  auth_type: 'none' | 'bearer' | 'basic' | 'custom';
  auth_token?: string;
  retry_on_failure: boolean;
  max_retries: number;
}

/**
 * Evento de webhook enviado
 */
export interface WebhookEvent {
  id: string;
  integration_id: string;
  url: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  status_code?: number;
  attempt_number: number;
  sent_at?: Timestamp;
  error?: string;
  created_at: Timestamp;
}

/**
 * Webhook recebido (endpoint público)
 */
export interface IncomingWebhook {
  id: string;
  organization_id: string;
  event_type: string;
  source: string;                 // Provider que enviou
  payload: Record<string, unknown>;
  signature?: string;              // HMAC para verificação
  processed: boolean;
  processed_at?: Timestamp;
  created_at: Timestamp;
}

/**
 * Resultado de sync
 */
export interface SyncResult {
  success: boolean;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_deleted: number;
  errors: string[];
  started_at: Date;
  completed_at: Date;
}
