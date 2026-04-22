import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createModelRegistry } from '../lib/ai/modelRegistry';
import { getRawSql } from '../lib/db';

export const aiConfigRoutes = new Hono<{ Bindings: Env }>();

aiConfigRoutes.get('/models', async (c) => {
	const registry = createModelRegistry(c.env);
	const capability = c.req.query('capability') as any;
	const freeOnly = c.req.query('free') === 'true';

	const models = registry.listModels({ capability, freeOnly });

	return c.json({
		models: models.map((m) => ({
			id: m.id,
			provider: m.provider,
			displayName: m.displayName,
			description: m.description,
			capabilities: m.capabilities,
			inputCostPer1m: m.inputCostPer1m,
			outputCostPer1m: m.outputCostPer1m,
			isFree: m.isFree,
			isDefault: m.isDefault,
			contextLength: m.contextLength,
		})),
	});
});

aiConfigRoutes.get('/config', async (c) => {
	const orgId = c.req.query('organizationId');
	if (!orgId) return c.json({ error: 'organizationId required' }, 400);

	const registry = createModelRegistry(c.env);
	const config = await registry.getConfig(orgId);
	return c.json({ config });
});

aiConfigRoutes.put('/config', async (c) => {
	const body = await c.req.json();
	const orgId = body.organizationId as string;
	if (!orgId) return c.json({ error: 'organizationId required' }, 400);

	const registry = createModelRegistry(c.env);

	const validFields = [
		'chatModel', 'analysisModel', 'visionModel',
		'transcriptionModel', 'embeddingModel',
		'thinkingEnabled', 'thinkingLevel',
	] as const;

	const updates: Record<string, any> = {};
	for (const field of validFields) {
		if (body[field] !== undefined) {
			if (['chatModel', 'analysisModel', 'visionModel', 'transcriptionModel'].includes(field)) {
				const model = registry.getModel(body[field]);
				if (!model) {
					return c.json({ error: `Unknown model: ${body[field]}` }, 400);
				}
			}
			updates[field] = body[field];
		}
	}

	const config = await registry.setConfig(orgId, updates);
	return c.json({ config });
});

aiConfigRoutes.get('/usage', async (c) => {
	const orgId = c.req.query('organizationId');
	if (!orgId) return c.json({ error: 'organizationId required' }, 400);

	const period = c.req.query('period') ?? 'month';
	const intervalDays = period === 'week' ? '7' : '30';

	const sql = getRawSql(c.env);

	const usage = await sql(
		`SELECT
			model_id, task_type,
			COUNT(*) as request_count,
			SUM(input_tokens) as total_input_tokens,
			SUM(output_tokens) as total_output_tokens,
			SUM(cached_tokens) as total_cached_tokens,
			SUM(cost_usd) as total_cost_usd,
			AVG(latency_ms) as avg_latency_ms,
			SUM(CASE WHEN was_cache_hit THEN 1 ELSE 0 END) as cache_hits,
			SUM(CASE WHEN was_fallback THEN 1 ELSE 0 END) as fallback_count
		 FROM ai_usage_logs
		 WHERE organization_id = $1 AND created_at > now() - INTERVAL '${intervalDays} days'
		 GROUP BY model_id, task_type
		 ORDER BY total_cost_usd DESC`,
		[orgId],
	);

	const spend = await sql(
		`SELECT current_spend_usd, monthly_budget_usd, spend_reset_at
		 FROM ai_config WHERE organization_id = $1`,
		[orgId],
	);

	return c.json({
		usage: usage.rows ?? [],
		spend: spend.rows?.[0] ?? { current_spend_usd: 0, monthly_budget_usd: 50 },
	});
});
