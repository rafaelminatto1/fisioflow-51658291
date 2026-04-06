import type {
  AppointmentReminderWorkflow,
  PatientOnboardingWorkflow,
  NFSeWorkflow,
  HEPComplianceWorkflow,
  PatientDischargeWorkflow,
  PatientReengagementWorkflow,
} from '../workflows';

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

  // Cloudflare D1
  DB?: D1Database;         // fisioflow-db: evolution_index, feriados_nacionais
  EDGE_CACHE?: D1Database; // fisioflow-edge-cache: rate_limits, query_cache

  // Cloudflare KV
  FISIOFLOW_CONFIG?: KVNamespace;

  // Analytics Engine (observabilidade em tempo real, free tier)
  ANALYTICS?: AnalyticsEngineDataset;

  // Vectorize (busca semântica — exercícios, protocolos, wiki)
  CLINICAL_KNOWLEDGE?: VectorizeIndex;

  // AI Search (RAG gerenciado — busca em linguagem natural)
  AI_SEARCH?: {
    search(query: string, options?: { limit?: number; filter?: Record<string, string> }): Promise<{
      results: Array<{
        id: string;
        score: number;
        content: string;
        metadata?: Record<string, string>;
      }>;
    }>;
  };

  // Pipelines (data warehouse → R2 Iceberg, open beta)
  EVENTS_PIPELINE?: {
    send(events: Array<Record<string, unknown>>): Promise<void>;
  };

  // Durable Objects
  ORGANIZATION_STATE: DurableObjectNamespace;
  PATIENT_AGENT?: DurableObjectNamespace;

  // Cloudflare Workflows (automações duráveis)
  WORKFLOW_APPOINTMENT_REMINDER?: Workflow<AppointmentReminderWorkflow>;
  WORKFLOW_PATIENT_ONBOARDING?: Workflow<PatientOnboardingWorkflow>;
  WORKFLOW_NFSE?: Workflow<NFSeWorkflow>;
  WORKFLOW_HEP_COMPLIANCE?: Workflow<HEPComplianceWorkflow>;
  WORKFLOW_DISCHARGE?: Workflow<PatientDischargeWorkflow>;
  WORKFLOW_REENGAGEMENT?: Workflow<PatientReengagementWorkflow>;

  // AI & Browser Rendering
  AI: {
    run(model: string, input: any): Promise<any>;
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
  };
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
  RESEND_FROM_EMAIL?: string;

  // Cloudflare Turnstile (anti-bot para rotas públicas)
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
}

// Helper type para Workflow binding
type Workflow<T> = {
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
