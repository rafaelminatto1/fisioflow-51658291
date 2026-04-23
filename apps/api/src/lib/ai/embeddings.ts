import type { Env } from "../../types/env";
import { getRawSql } from "../db";

/**
 * Gera e salva embeddings para uma evolução clínica.
 * Executado em background via ctx.waitUntil.
 */
export async function processClinicalEmbedding(
	env: Env,
	organizationId: string,
	patientId: string,
	evolutionId: string,
	text: string,
) {
	if (!text || text.length < 10) return;

	try {
		console.log(`[AI/Embeddings] Generating for evolution ${evolutionId}...`);

		// 1. Gerar o vetor na borda (Cloudflare Workers AI)
		const response = await env.AI.run("@cf/baai/bge-m3", {
			text: [text],
		});

		const embedding = response.data[0];
		if (!embedding) throw new Error("Failed to generate embedding data");

		// 2. Salvar no Neon via Raw SQL (devido ao tipo vector não nativo no Drizzle core)
		const sql = getRawSql(env, 'write');
		
		// Usamos cast explícito para ::vector para garantir que o Postgres entenda o array
		await sql`
			INSERT INTO clinical_embeddings (
				organization_id, 
				patient_id, 
				evolution_id, 
				embedding, 
				content_summary, 
				created_at
			)
			VALUES (
				${organizationId}::uuid, 
				${patientId}::uuid, 
				${evolutionId}::uuid, 
				${embedding}::vector, 
				${text.substring(0, 500)}, 
				NOW()
			)
			ON CONFLICT (evolution_id) DO UPDATE SET
				embedding = EXCLUDED.embedding,
				content_summary = EXCLUDED.content_summary,
				created_at = NOW();
		`;

		console.log(`[AI/Embeddings] Successfully saved vector for ${evolutionId}`);
	} catch (error) {
		console.error("[AI/Embeddings] Error:", error);
	}
}
