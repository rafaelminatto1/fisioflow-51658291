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
import type { AppType } from "../../../../workers/src/index";

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
		return fetch(input, {
			...init,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
				...(init?.headers ?? {}),
			},
		});
	},
});

export type { AppType };
