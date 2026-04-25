/**
 * Global Setup for Playwright E2E Tests
 *
 * Otimizado para Neon Auth + Dashboard Redirection
 */

import { request, FullConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, rmSync } from "fs";
import { testUsers } from "./fixtures/test-data";
import { getE2EAuthOrigin } from "./helpers/neon-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, "../playwright/.auth/user.json");

export default async function globalSetup(_config: FullConfig) {
  console.log("\n🧪 Playwright Global Setup - Iniciando...");

  if (process.env.E2E_SKIP_AUTH_SETUP === "true") {
    console.log("ℹ️  Auth setup automático desativado");
    return;
  }

  const authBaseURL = getE2EAuthOrigin();
  const neonAuthUrl = String(process.env.VITE_NEON_AUTH_URL || "");

  if (!neonAuthUrl) {
    throw new Error("VITE_NEON_AUTH_URL ausente no ambiente de teste.");
  }

  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  rmSync(AUTH_STATE_PATH, { force: true });
  const context = await request.newContext({
    baseURL: authBaseURL,
    extraHTTPHeaders: {
      origin: authBaseURL,
    },
  });

  try {
    console.log(
      `⏳ Autenticando por HTTP em ${neonAuthUrl}/sign-in/email (origin ${authBaseURL})...`,
    );
    const response = await context.post(`${neonAuthUrl}/sign-in/email`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      },
      headers: {
        "content-type": "application/json",
      },
    });

    if (!response.ok()) {
      const body = await response.text().catch(() => "<sem corpo>");
      throw new Error(`Falha no login HTTP do global-setup: ${response.status()} ${body}`);
    }

    const storageState = await context.storageState();
    const sessionCookie = storageState.cookies.find((cookie) =>
      cookie.name.includes("session_token"),
    );
    if (!sessionCookie) {
      throw new Error("Cookie de sessão do Neon Auth não foi gravado no storageState.");
    }

    console.log(`✅ Cookie de sessão encontrado: ${sessionCookie.name}`);
    console.log("🔐 Gravando storageState autenticado...");
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`🔐 Auth storageState criado com sucesso em: ${AUTH_STATE_PATH}`);
  } catch (error) {
    console.error("❌ Falha crítica ao criar storageState autenticado:", error);
    throw error;
  } finally {
    await context.dispose();
  }

  console.log("✅ Global Setup concluído\n");
}
