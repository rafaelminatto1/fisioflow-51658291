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
}

// =====================
// DURABLE OBJECT: OrganizationState
// =====================
export class OrganizationState {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.sessions.add(server);
      server.addEventListener("close", () => this.sessions.delete(server));
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("Not Found", { status: 404 });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Neon DB Direct Query (Fonte da Verdade)
async function queryNeon(sql: string, params: any[] = [], databaseUrl: string): Promise<any[]> {
  const response = await fetch(databaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, params: params.length > 0 ? params : undefined }),
  });
  if (!response.ok) throw new Error(`Neon DB error: ${await response.text()}`);
  const data = await response.json();
  return data.results || [];
}

/**
 * Super Cache Global Helper
 */
async function getGlobalCache(request: Request, env: Env): Promise<Response | null> {
  const auth = request.headers.get("Authorization") || "";
  const cacheKey = btoa(`${request.url}-${auth}`);
  
  try {
    const cached = await env.DB.prepare("SELECT value FROM query_cache WHERE key = ? AND expires_at > ?")
      .bind(cacheKey, Math.floor(Date.now() / 1000)).first<{value: string}>();
    
    if (cached) {
      console.log('🚀 SUPER CACHE HIT:', request.url);
      return new Response(cached.value, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT-D1' } });
    }
  } catch (e) { console.error('D1 Cache Error:', e); }
  return null;
}

async function setGlobalCache(request: Request, responseData: string, env: Env, ttl: number = 3600): Promise<void> {
  const auth = request.headers.get("Authorization") || "";
  const cacheKey = btoa(`${request.url}-${auth}`);
  try {
    await env.DB.prepare("INSERT OR REPLACE INTO query_cache (key, value, expires_at) VALUES (?, ?, ?)")
      .bind(cacheKey, responseData, Math.floor(Date.now() / 1000) + ttl).run();
  } catch (e) { console.error('D1 Save Error:', e); }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Maintenance Mode (KV)
    const isMaintenance = await env.FISIOFLOW_CONFIG.get("APP_MAINTENANCE");
    if (isMaintenance === "true") {
      return new Response(JSON.stringify({ error: "Manutenção", message: "Sistema em manutenção." }), { status: 503, headers: corsHeaders });
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // 2. Tentar Super Cache Global para qualquer GET
    if (request.method === 'GET' && !request.url.includes('/health')) {
      const cachedResponse = await getGlobalCache(request, env);
      if (cachedResponse) return cachedResponse;
    }

    // 3. Invalidação Automática para Escritas
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await env.DB.prepare("DELETE FROM query_cache").run();
      console.log('🧹 CACHE PURGED (Write Operation)');
    }

    const url = new URL(request.url);
    const path = url.pathname;

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
