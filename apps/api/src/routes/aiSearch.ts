import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';

const aiSearchApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const querySchema = z.object({
  query: z.string().min(1, 'A query é obrigatória'),
  organizationId: z.string().uuid().optional(),
});

aiSearchApp.post('/', requireAuth, zValidator('json', querySchema), async (c) => {
  const { query, organizationId } = c.req.valid('json');
  const user = c.get('user');

  if (!c.env.AI) {
    return c.json({ error: 'Cloudflare AI binding not configured' }, 500);
  }

  try {
    // Check if the AI binding has the autorag method (Beta feature)
    if (typeof c.env.AI.autorag !== 'function') {
      return c.json({ error: 'Managed AI Search (autorag) is not available in this environment' }, 500);
    }

    const aiSearchInstance = c.env.AI.autorag("fisioflow-rag");

    // Filtros de segurança: isolamento de tenant
    const orgId = organizationId || user?.organization_id;
    const filters = orgId ? { organizationId: orgId } : undefined;

    const answer = await aiSearchInstance.aiSearch({
      query: query,
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      rewrite_query: true,
      max_num_results: 3,
      ranking_options: {
        score_threshold: 0.3,
      },
      reranking: {
        enabled: true,
        model: "@cf/baai/bge-reranker-base",
      },
      stream: false,
      filters: filters
    });

    return c.json(answer);
  } catch (error: any) {
    console.error('AI Search Error:', error);
    return c.json({ error: 'Erro ao processar a busca com IA', details: error.message }, 500);
  }
});

export default aiSearchApp;
