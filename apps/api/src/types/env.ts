import type {
  AppointmentReminderWorkflow,
  PatientOnboardingWorkflow,
  NFSeWorkflow,
  HEPComplianceWorkflow,
  PatientDischargeWorkflow,
  PatientReengagementWorkflow,
  PatientDigitalTwinWorkflow,
  WikiSyncWorkflow,
  KnowledgeSyncWorkflow,
  SessionSummaryWorkflow,
} from "../workflows";

/**
 * Cloudflare Stream binding (GA 2026-05-07).
 * `wrangler.toml`: `[stream] binding = "STREAM"`. Permite criar direct-uploads
 * e iniciar uploads do servidor sem credentials adicionais (CF REST API).
 */
export interface StreamBinding {
  /** Upload server-to-server a partir de uma URL pública. */
  upload(
    url: string,
    options?: {
      meta?: Record<string, string>;
      thumbnailTimestampPct?: number;
      requireSignedURLs?: boolean;
      watermark?: { uid: string };
    },
  ): Promise<StreamVideoDetails>;
  /**
   * Direct creator upload — retorna URL temporária para `tus-js-client` ou
   * upload simples via PUT no browser, sem expor credenciais CF.
   */
  directUpload(options?: {
    maxDurationSeconds?: number;
    expiryMinutes?: number;
    meta?: Record<string, string>;
    requireSignedURLs?: boolean;
    creator?: string;
  }): Promise<{ uploadURL: string; uid: string }>;
  /** Operações sobre um vídeo específico. */
  video(uid: string): {
    details(): Promise<StreamVideoDetails>;
    update(params: { meta?: Record<string, string>; allowedOrigins?: string[] }): Promise<StreamVideoDetails>;
    delete(): Promise<void>;
    generateToken(params?: { exp?: number; nbf?: number; downloadable?: boolean }): Promise<string>;
  };
  videos: {
    list(params?: { limit?: number; creator?: string }): Promise<{ result: StreamVideoDetails[] }>;
  };
}

export interface StreamVideoDetails {
  uid: string;
  thumbnail?: string;
  preview?: string;
  readyToStream: boolean;
  status?: { state: string };
  meta?: Record<string, string>;
  duration?: number;
  playback?: { hls: string; dash: string };
}

/**
 * Cloudflare Workers Environment Bindings
 * Define todas as variáveis e bindings disponíveis no Worker
 */
export interface Env {
  // Hyperdrive: connection pooler edge → Neon PostgreSQL
  HYPERDRIVE: Hyperdrive;

  // Variáveis de ambiente
  ENVIRONMENT: "production" | "staging" | "development";
  MONITOR_NTFY_TOPIC?: string; // tópico ntfy.sh para alertas de health monitor
  MONITOR_HEALTH_URL?: string; // URL verificada pelo cron de health monitor
  DATABASE_URL?: string;
  NEON_URL?: string;
  ALLOWED_ORIGINS: string; // CSV: "https://a.com,https://b.com"
  FRONTEND_URL?: string;
  PAGES_URL?: string;
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
  NEON_DATA_API_URL?: string;
  ML_SALT?: string;
  VITE_ML_SALT?: string;
  FISIOFLOW_AI_GATEWAY_URL?: string;
  FISIOFLOW_AI_GATEWAY_TOKEN?: string;
  INNGEST_SIGNING_KEY?: string;
  /** "true" para habilitar refinamento via IA no lead scoring (default: heurística). */
  LEAD_SCORING_AI?: string;
  /** Base URL pública para links de NPS (ex: https://app.moocafisio.com.br). */
  NPS_PUBLIC_BASE_URL?: string;

  // Cloudflare Images API (transform, resize, WebP/AVIF, watermark)
  IMAGES?: {
    input(stream: ReadableStream | ArrayBuffer | Blob): ImageInput;
  };

  // Cloudflare R2 Config
  MEDIA_BUCKET: R2Bucket;
  EXAMS_BUCKET?: R2Bucket; // fisioflow-exams: exames, fotos, vídeos clínicos (privado)

  // Cloudflare Stream (vídeo: encoding adaptativo, HLS, thumbnails) — GA 2026-05-07
  STREAM?: StreamBinding;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  R2_EXAMS_BUCKET_NAME?: string; // "fisioflow-exams" (default se não definido)

  // Cloudflare D1
  DB?: D1Database; // fisioflow-db: evolution_index, feriados_nacionais
  EDGE_CACHE?: D1Database; // fisioflow-edge-cache: rate_limits, query_cache

  // Cloudflare KV
  FISIOFLOW_CONFIG?: KVNamespace;

  // Analytics Engine (observabilidade em tempo real, free tier)
  ANALYTICS?: AnalyticsEngineDataset;


  // AI Search (RAG gerenciado — wiki, protocolos, artigos científicos)
  // Bound via [[ai_search]] binding = "AI_SEARCH" instance_name = "fisioflow-knowledge"
  AI_SEARCH?: {
    search(options: {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      limit?: number;
      filters?: Record<string, string | string[]>;
    }): Promise<{
      response: string;
      sources: Array<{
        id: string;
        filename: string;
        content: string;
        metadata?: Record<string, unknown>;
        score?: number;
      }>;
    }>;
    items: {
      uploadAndPoll(
        filename: string,
        content: ReadableStream | ArrayBuffer | Blob | string,
        options?: { metadata?: Record<string, string> },
      ): Promise<{ id: string; filename: string; status: string }>;
      upload(
        filename: string,
        content: ReadableStream | ArrayBuffer | Blob | string,
        options?: { metadata?: Record<string, string> },
      ): Promise<{ id: string; filename: string; status: string }>;
      delete(itemId: string): Promise<void>;
      list(options?: {
        limit?: number;
        cursor?: string;
      }): Promise<{ items: Array<{ id: string; filename: string; status: string }> }>;
    };
  };

  // Pipelines (data warehouse → R2 Iceberg, open beta)
  EVENTS_PIPELINE?: {
    send(events: Array<Record<string, unknown>>): Promise<void>;
  };

  // Durable Objects
  ORGANIZATION_STATE: DurableObjectNamespace;
  PATIENT_AGENT?: DurableObjectNamespace;
  ASSESSMENT_LIVE_SESSION?: DurableObjectNamespace;
  CLINIC_AGENT?: DurableObjectNamespace;
  VOICE_SCRIBE_AGENT?: DurableObjectNamespace;

  // Premium AI (opt-in): Gemini Live API para avaliações em tempo real
  GOOGLE_AI_PREMIUM_ENABLED?: string; // "true" para habilitar

  // Cloudflare Workflows (automações duráveis)
  WORKFLOW_APPOINTMENT_REMINDER?: Workflow<AppointmentReminderWorkflow>;
  WORKFLOW_PATIENT_ONBOARDING?: Workflow<PatientOnboardingWorkflow>;
  WORKFLOW_NFSE?: Workflow<NFSeWorkflow>;
  WORKFLOW_HEP_COMPLIANCE?: Workflow<HEPComplianceWorkflow>;
  WORKFLOW_DISCHARGE?: Workflow<PatientDischargeWorkflow>;
  WORKFLOW_REENGAGEMENT?: Workflow<PatientReengagementWorkflow>;
  WORKFLOW_DIGITAL_TWIN?: Workflow<PatientDigitalTwinWorkflow>;
  WORKFLOW_WIKI_SYNC?: Workflow<WikiSyncWorkflow>;
  WORKFLOW_KNOWLEDGE_SYNC?: Workflow<KnowledgeSyncWorkflow>;
  WORKFLOW_SESSION_SUMMARY?: Workflow<SessionSummaryWorkflow>;

  // AI & Browser Rendering
  AI: {
    run(model: string, input: any, options?: any): Promise<any>;
    autorag(indexName: string): {
      aiSearch(options: {
        query: string;
        model?: string;
        rewrite_query?: boolean;
        max_num_results?: number;
        ranking_options?: {
          score_threshold?: number;
        };
        reranking?: {
          enabled?: boolean;
          model?: string;
        };
        stream?: boolean;
        filters?: Record<string, any>;
      }): Promise<any>;
    };
    toMarkdown(
      input: ReadableStream | ArrayBuffer | Blob | string,
      options?: { maxDepth?: number },
    ): Promise<string>;
  };
  BROWSER: any;

  // Queues
  BACKGROUND_QUEUE: Queue;

  // Cloudflare Stream Webhook Secret — para validar POST /api/exercise-videos/stream-webhook
  STREAM_WEBHOOK_SECRET?: string;

  // Cloudflare REST API (AutoRAG document management via CF REST API)
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;

  // Axiom Logging Configuration
  AXIOM_TOKEN?: string;
  AXIOM_ORG_ID?: string;
  AXIOM_DATASET?: string;

  // URL base da API (ex: https://api-pro.moocafisio.com.br)
  API_BASE_URL?: string;

  // WhatsApp Business API
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string; // App Secret para validação HMAC dos webhooks

  // LiveKit Telehealth
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;

  // Resend (Email)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;

  // Stripe
  STRIPE_SECRET_KEY?: string;

  // Twilio WhatsApp fallback
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // Z.AI (GLM models) — OpenAI-compatible API
  ZAI_API_KEY?: string;

  // Focus NFe / NFSe (legacy — sendo substituído por emissão direta SP)
  FOCUS_NFE_TOKEN?: string;
  FOCUS_NFE_ENVIRONMENT?: string;

  // NFSe São Paulo — emissão direta via webservice SOAP + mTLS
  NFSE_SP_CERT?: Fetcher; // mTLS binding (apresenta certificado na conexão TLS)
  NFSE_SP_CERT_PEM?: string; // Certificado PEM para assinatura XML
  NFSE_SP_KEY_PEM?: string; // Chave privada PEM para assinatura XML

  // Cloudflare Turnstile (anti-bot para rotas públicas)
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;

  // Web Push / VAPID
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;

  // Wearable OAuth
  GARMIN_CLIENT_ID?: string;
  GARMIN_CLIENT_SECRET?: string;
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  OURA_CLIENT_ID?: string;
  OURA_CLIENT_SECRET?: string;
  WEARABLE_OAUTH_REDIRECT_BASE?: string; // e.g. https://app.moocafisio.com.br
  WGER_API_TOKEN?: string;
}

// Helper type para Workflow binding
type Workflow<_T> = {
  create(opts: { id?: string; params?: Record<string, unknown> }): Promise<WorkflowInstance>;
  get(id: string): Promise<WorkflowInstance>;
};

type WorkflowInstance = {
  id: string;
  status(): Promise<{ status: string; error?: string; output?: unknown }>;
  sendEvent(event: { type: string; payload?: unknown }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  terminate(): Promise<void>;
};

export interface ImageInput {
  transform(options: {
    width?: number;
    height?: number;
    fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
    quality?: number;
    format?: string;
    blur?: number;
    rotate?: 0 | 90 | 180 | 270;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    trim?: { top?: number; right?: number; bottom?: number; left?: number };
  }): ImageInput;
  draw(
    layer: any,
    options?: {
      opacity?: number;
      repeat?: boolean;
      top?: number;
      left?: number;
      bottom?: number;
      right?: number;
    },
  ): ImageInput;
  output(options: {
    format?: "image/avif" | "image/webp" | "image/jpeg" | "image/png";
    quality?: number;
  }): Promise<{ response(): Response }>;
}
