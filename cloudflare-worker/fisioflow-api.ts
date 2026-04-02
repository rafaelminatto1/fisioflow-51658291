/**
 * FisioFlow API Worker - Cloudflare Workers
 * SUPER CACHE GLOBAL ARCHITECTURE (2026)
 * Handles: Edge Response Caching (D1), UI Config (KV), Realtime (DO), and Neon DB
 */

export interface Env {
  DATABASE_URL: string;
  AUTH_TOKEN: string;
  JWT_SECRET: string;
  ORGANIZATION_STATE: DurableObjectNamespace;
  DB: D1Database;
  FISIOFLOW_CONFIG: KVNamespace;
  AI: any; // Cloudflare Workers AI
}

// ... OrganizationState e helpers permanecem iguais ...

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Maintenance Mode (KV)
    const isMaintenance = await env.FISIOFLOW_CONFIG.get("APP_MAINTENANCE");
    if (isMaintenance === "true") {
      return new Response(JSON.stringify({ error: "Manutenção", message: "Sistema em manutenção." }), { status: 503, headers: corsHeaders });
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;

    // 2. IA Predictive: No-show Risk Analysis
    if (path === '/api/ai/predict-noshow' && request.method === 'POST') {
      try {
        const { patientId, history } = await request.json() as any;
        
        // Exemplo de prompt para Workers AI usando Llama-3
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: 'Você é um assistente analítico de uma clínica de fisioterapia. Calcule a probabilidade percentual de falta (no-show) baseada no histórico fornecido. Retorne apenas um JSON: { "risk": number, "reason": "string" }' },
            { role: 'user', content: `Histórico do paciente ${patientId}: ${JSON.stringify(history)}` }
          ]
        });

        return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "AI Processing Error", details: String(e) }), { status: 500, headers: corsHeaders });
      }
    }

    // 3. Tentar Super Cache Global para qualquer GET
    if (request.method === 'GET' && !request.url.includes('/health')) {
      const cachedResponse = await getGlobalCache(request, env);
      if (cachedResponse) return cachedResponse;
    }

    // 3. Invalidação Automática para Escritas
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await env.DB.prepare("DELETE FROM query_cache").run();
      console.log('🧹 CACHE PURGED (Write Operation)');
    }

    // Reuse existing url and path variables

    try {
      let responseBody: any = { error: 'Not found' };
      let status = 404;

      // HEALTH CHECK
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders });
      }

      // ROTA GENÉRICA DE NOTIFICAÇÕES (Exemplo)
      if (path === '/api/notifications' && request.method === 'GET') {
        responseBody = { notifications: await queryNeon("SELECT * FROM notifications LIMIT 50", [], env.DATABASE_URL) };
        status = 200;
      }

      // ROTA GENÉRICA DE PACIENTES (Exemplo)
      if (path === '/api/patients' && request.method === 'GET') {
        responseBody = { patients: await queryNeon("SELECT id, name FROM patients LIMIT 100", [], env.DATABASE_URL) };
        status = 200;
      }

      // Se for um GET e tivemos sucesso, salvar no Super Cache
      const finalData = JSON.stringify(responseBody);
      if (request.method === 'GET' && status === 200) {
        await setGlobalCache(request, finalData, env);
      }

      return new Response(finalData, { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders });
    }
  }
};
