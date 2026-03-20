/**
 * Neon Data API — interface REST PostgREST-compatible direto no banco.
 *
 * Vantagens vs Workers API:
 * - Connectionless: sem pool exhaustion, escala automaticamente
 * - Latência menor: sem hop extra pelo Worker
 * - Integrado com Neon Auth + RLS
 *
 * Para habilitar: Neon Console → Data API → Enable
 * Requer: VITE_NEON_DATA_API_URL no .env
 *
 * ATENÇÃO: Configure RLS nas tabelas antes de habilitar em produção.
 * Tabelas sem RLS ficam acessíveis a qualquer usuário autenticado.
 */
import { createClient } from "@neondatabase/neon-js";
import { getNeonAuthUrl } from "@/lib/config/neon";

const NEON_DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL as
	| string
	| undefined;

export function isDataApiEnabled(): boolean {
	return !!(getNeonAuthUrl() && NEON_DATA_API_URL);
}

/**
 * Cliente do Neon Data API com Neon Auth integrado.
 * O token JWT é injetado automaticamente em cada request.
 * Lazy singleton: criado apenas quando necessário.
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getDataApiClient() {
	const neonAuthUrl = getNeonAuthUrl();

	if (!neonAuthUrl || !NEON_DATA_API_URL) {
		throw new Error(
			"Neon Data API não configurado. Defina VITE_NEON_AUTH_URL e VITE_NEON_DATA_API_URL no .env",
		);
	}

	if (!_client) {
		_client = createClient({
			auth: { url: neonAuthUrl },
			dataApi: { url: NEON_DATA_API_URL },
		});
	}

	return _client;
}

/**
 * Invalida o singleton — útil após logout para garantir que o próximo
 * request use credenciais frescas.
 */
export function resetDataApiClient(): void {
	_client = null;
}
