/**
 * Hono RPC Client — type-safe end-to-end API client
 *
 * Usa o tipo AppType exportado do worker para validação estática.
 * As rotas ficam completamente tipadas sem precisar de definições manuais.
 *
 * Uso:
 *   import { rpc } from '@/lib/api/rpc-client';
 *   const res = await rpc.api.health.$get();
 *   const data = await res.json();
 *
 * Nota: O hc<AppType> requer @hono/client instalado no frontend.
 * Instalar: pnpm add hono (já incluído via workers)
 *
 * Migração gradual: as rotas existentes em workers-client.ts continuam funcionando.
 * Use rpc-client para novas rotas que precisem de tipagem end-to-end.
 */

import { hc } from "hono/client";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { getWorkersApiUrl } from "./config";

// Importação de tipo — sem impacto no bundle de runtime
import type { AppType } from "../../../apps/api/src/index";

function getBaseUrl(): string {
  return getWorkersApiUrl();
}

async function getHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getNeonAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // sem token — rotas públicas funcionam sem auth
  }
  return {};
}

/**
 * Cliente RPC com tipagem automática.
 * Os headers de auth são injetados via fetch override.
 */
export const rpc = hc<AppType>(getBaseUrl(), {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const authHeaders = await getHeaders();
    try {
      return await fetch(input, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...init?.headers,
        },
      });
    } catch (error: any) {
      const method = init?.method || "GET";
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

      // Se for um erro de rede (incluindo falha de fetch por timeout ou indisponibilidade)
      if (isMutation && (isOffline || error.name === "TypeError") && typeof window !== "undefined") {
        const manager = (window as any).offlineSyncManager;
        if (manager) {
          console.warn(`[Hono RPC] Network offline. Queueing mutation: ${method} ${input.toString()}`);
          await manager.enqueueRequest(
            input.toString(),
            method,
            { "Content-Type": "application/json", ...authHeaders, ...init?.headers } as Record<string, string>,
            init?.body
          );
          // Retornar um 202 Accepted mockado para que a Promise seja resolvida sem quebrar o fluxo da UI
          return new Response(JSON.stringify({ offlineQueued: true, message: "Ação salva offline." }), { 
            status: 202,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      throw error;
    }
  },
});

export type { AppType };
