/**
 * Legacy API worker intentionally disabled.
 *
 * Canonical API:
 * - apps/api/src/index.ts
 *
 * Rationale:
 * - historical implementation
 * - weaker auth model than the canonical Worker
 * - retained only to avoid broken references while failing closed
 */

export interface Env {
	FISIOFLOW_CONFIG?: KVNamespace;
}

const DISABLED_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"x-fisioflow-legacy-worker": "disabled",
	"x-fisioflow-canonical-api": "apps/api/src/index.ts",
};

export class OrganizationState {
	// Placeholder Durable Object kept only to avoid migration/config breakage
}

export default {
	async fetch(_request: Request, _env: Env): Promise<Response> {
		return new Response(
			JSON.stringify({
				error: "Legacy API disabled",
				message:
					"Use the canonical API implemented in apps/api/src/index.ts.",
			}),
			{
				status: 410,
				headers: DISABLED_HEADERS,
			},
		);
	},
};
