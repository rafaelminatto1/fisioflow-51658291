/**
 * Cloudflare Workers Environment Bindings
 * Define todas as variáveis e bindings disponíveis no Worker
 */
export interface Env {
  // Hyperdrive: connection pooler edge → Neon PostgreSQL
  HYPERDRIVE: Hyperdrive;

  // Variáveis de ambiente
  ENVIRONMENT: 'production' | 'staging' | 'development';
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string; // CSV: "https://a.com,https://b.com"
  GOOGLE_AI_API_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  NEON_AUTH_JWKS_URL?: string;
  NEON_AUTH_ISSUER?: string;
  NEON_AUTH_AUDIENCE?: string;
  ML_SALT?: string;
  VITE_ML_SALT?: string;

  // Cloudflare R2 Config
  MEDIA_BUCKET: R2Bucket;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
}
