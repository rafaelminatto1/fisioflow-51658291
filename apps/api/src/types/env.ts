/**
 * Cloudflare Workers Environment Bindings
 * Define todas as variáveis e bindings disponíveis no Worker
 */
export interface Env {
  // Hyperdrive: connection pooler edge → Neon PostgreSQL
  HYPERDRIVE: Hyperdrive;

  // Variáveis de ambiente
  ENVIRONMENT: 'production' | 'staging' | 'development';
  DATABASE_URL?: string;
  NEON_URL?: string;
  ALLOWED_ORIGINS: string; // CSV: "https://a.com,https://b.com"
  GOOGLE_AI_API_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  DICOM_BASE_URL?: string;
  DICOM_AUTH_TOKEN?: string;
  DICOM_AUTH_HEADER?: string;
  NEON_AUTH_URL?: string;
  NEON_AUTH_JWKS_URL?: string;
  NEON_AUTH_ISSUER?: string;
  NEON_AUTH_AUDIENCE?: string;
  ML_SALT?: string;
  VITE_ML_SALT?: string;
  FISIOFLOW_AI_GATEWAY_URL?: string;
  FISIOFLOW_AI_GATEWAY_TOKEN?: string;

  // Cloudflare R2 Config
  MEDIA_BUCKET: R2Bucket;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;

  // Cloudflare D1 (cache opcional)
  DB?: D1Database;

  // Durable Objects
  ORGANIZATION_STATE: DurableObjectNamespace;
  FISIOFLOW_CONFIG?: KVNamespace;
  CLINICAL_KNOWLEDGE?: any;

  // AI & Browser Rendering
  AI: any;
  BROWSER: any;

  // Queues
  BACKGROUND_QUEUE: Queue;

  // Hasura GraphQL Configuration
  VITE_HASURA_PROJECT_URL?: string;
  VITE_HASURA_ADMIN_SECRET?: string;

  // Axiom Logging Configuration
  AXIOM_TOKEN?: string;
  AXIOM_ORG_ID?: string;
  AXIOM_DATASET?: string;

  // Inngest Configuration
  INNGEST_EVENT_KEY?: string;
  INNGEST_SIGNING_KEY?: string;

  // WhatsApp Business API
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_VERIFY_TOKEN?: string;

  // LiveKit Telehealth
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;

  // Resend (Email)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // ex: "FisioFlow <noreply@moocafisio.com.br>"

  // D1 (Edge Database for Caching and Metadata)
  D1_CACHE?: D1Database;
}
