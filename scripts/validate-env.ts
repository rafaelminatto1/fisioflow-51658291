#!/usr/bin/env tsx
/**
 * Script de Validação de Variáveis de Ambiente
 * Valida se todas as variáveis necessárias estão configuradas
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const FRONTEND_VARS: EnvVar[] = [
  {
    name: "VITE_SENTRY_DSN",
    required: false,
    description: "Sentry DSN para frontend",
    validator: (v) => v.startsWith("https://") && v.includes("@"),
  },
  {
    name: "VITE_APP_VERSION",
    required: false,
    description: "Versão da aplicação",
  },
];

const BACKEND_VARS: EnvVar[] = [
  {
    name: "SENTRY_DSN",
    required: false,
    description: "Sentry DSN para backend",
    validator: (v) => v.startsWith("https://") && v.includes("@"),
  },
  {
    name: "UPSTASH_REDIS_REST_URL",
    required: false,
    description: "URL REST do Upstash Redis",
    validator: (v) => v.startsWith("https://"),
  },
  {
    name: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
    description: "Token de autenticação do Upstash Redis",
  },
  {
    name: "GOOGLE_AI_API_KEY",
    required: false,
    description: "Chave da API do Google AI/Gemini",
  },
  {
    name: "OPENAI_API_KEY",
    required: false,
    description: "Chave da API OpenAI (Whisper)",
    validator: (v) => v.startsWith("sk-"),
  },
  {
    name: "GOOGLE_CLIENT_ID",
    required: false,
    description: "Client ID do Google OAuth2",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    required: false,
    description: "Client Secret do Google OAuth2",
  },
  {
    name: "DATABASE_URL",
    required: false,
    description: "Connection string do PostgreSQL",
    validator: (v) => v.startsWith("postgresql://"),
  },
  {
    name: "CRON_SECRET",
    required: false,
    description: "Secret para autenticar cron jobs",
  },
  {
    name: "RESEND_API_KEY",
    required: false,
    description: "Chave da API Resend",
    validator: (v) => v.startsWith("re_"),
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    description: "Secret key do Stripe",
    validator: (v) => v.startsWith("sk_"),
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: false,
    description: "Webhook secret do Stripe",
    validator: (v) => v.startsWith("whsec_"),
  },
];

function validateEnvVar(
  envVar: EnvVar,
  value: string | undefined,
): { valid: boolean; error?: string } {
  if (!value) {
    return envVar.required
      ? { valid: false, error: "Variável obrigatória não configurada" }
      : { valid: true };
  }

  if (envVar.validator && !envVar.validator(value)) {
    return { valid: false, error: "Formato inválido" };
  }

  return { valid: true };
}

function checkFrontendVars(): { missing: string[]; invalid: string[]; valid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  const valid: string[] = [];

  console.log("\n📦 Variáveis de Frontend (Vercel):\n");

  for (const envVar of FRONTEND_VARS) {
    const value = process.env[envVar.name];
    const result = validateEnvVar(envVar, value);

    if (!value) {
      if (envVar.required) {
        missing.push(envVar.name);
        console.log(`  ❌ ${envVar.name}: NÃO CONFIGURADA (obrigatória)`);
      } else {
        console.log(`  ⚠️  ${envVar.name}: não configurada (opcional)`);
      }
    } else if (!result.valid) {
      invalid.push(envVar.name);
      console.log(`  ⚠️  ${envVar.name}: ${result.error}`);
    } else {
      valid.push(envVar.name);
      const masked =
        value.length > 20
          ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
          : value;
      console.log(`  ✅ ${envVar.name}: configurada (${masked})`);
    }
    console.log(`     ${envVar.description}`);
  }

  return { missing, invalid, valid };
}

function checkBackendVars(): { missing: string[]; invalid: string[]; valid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  const valid: string[] = [];

  console.log("\n🔧 Variáveis de Backend (Cloudflare/Neon):\n");
  console.log("  ⚠️  Nota: Para validar variáveis do Cloudflare, execute:");
  console.log("     npx wrangler secret list\n");

  for (const envVar of BACKEND_VARS) {
    const value = process.env[envVar.name];
    const result = validateEnvVar(envVar, value);

    if (!value) {
      if (envVar.required) {
        missing.push(envVar.name);
        console.log(`  ❌ ${envVar.name}: não configurada (obrigatória)`);
      } else {
        console.log(`  ⚠️  ${envVar.name}: não configurada (opcional)`);
      }
    } else if (!result.valid) {
      invalid.push(envVar.name);
      console.log(`  ⚠️  ${envVar.name}: ${result.error}`);
    } else {
      valid.push(envVar.name);
      const masked =
        value.length > 20
          ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
          : value;
      console.log(`  ✅ ${envVar.name}: configurada (${masked})`);
    }
    console.log(`     ${envVar.description}`);
  }

  return { missing, invalid, valid };
}

function main() {
  console.log("🔍 Validação de Variáveis de Ambiente - FisioFlow\n");
  console.log("=".repeat(60));

  const frontend = checkFrontendVars();
  const backend = checkBackendVars();

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Resumo:\n");
  console.log(
    `Frontend: ${frontend.valid.length} configuradas, ${frontend.missing.length} faltando, ${frontend.invalid.length} inválidas`,
  );
  console.log(
    `Backend: ${backend.valid.length} configuradas, ${backend.missing.length} faltando, ${backend.invalid.length} inválidas`,
  );

  const totalMissing = frontend.missing.length + backend.missing.length;
  const totalInvalid = frontend.invalid.length + backend.invalid.length;

  if (totalMissing > 0 || totalInvalid > 0) {
    console.log("\n⚠️  Ação necessária:");
    if (totalMissing > 0) {
      console.log(`   - Configure ${totalMissing} variável(éis) obrigatória(s)`);
    }
    if (totalInvalid > 0) {
      console.log(`   - Corrija ${totalInvalid} variável(éis) inválida(s)`);
    }
    process.exit(1);
  } else {
    console.log("\n✅ Todas as variáveis obrigatórias estão configuradas!");
    process.exit(0);
  }
}

if (import.meta.main) {
  main();
}
