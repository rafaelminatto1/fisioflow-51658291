/**
 * Cloudflare Worker for R2 with CORS, Secure Access and D1 Indexing
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  DB: D1Database; // Cloudflare D1 Binding
  AUTH_TOKEN: string;
  R2_PUBLIC_URL: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, mude para o seu domínio real
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const method = request.method;

    // 0. Cloudflare Image Optimization Proxy
    // Formato: /cdn-cgi/image/width=X,quality=Y,format=auto/URL_ENCODADA
    if (url.pathname.startsWith('/cdn-cgi/image/')) {
      try {
        const parts = url.pathname.split('/');
        const optionsStr = parts[3]; // width=800,quality=85,format=auto
        const originalUrlStr = decodeURIComponent(parts.slice(4).join('/'));
        
        if (!originalUrlStr) return new Response('Missing URL', { status: 400 });

        // Parse options for Cloudflare Image Resizing
        const cfOptions: Record<string, any> = {};
        optionsStr.split(',').forEach(opt => {
          const [k, v] = opt.split('=');
          if (k === 'width') cfOptions.width = parseInt(v);
          if (k === 'quality') cfOptions.quality = parseInt(v);
          if (k === 'format') cfOptions.format = v;
        });

        // Fetch original image
        const imageRes = await fetch(originalUrlStr, {
          cf: {
            image: {
              ...cfOptions,
              fit: 'cover',
              metadata: 'none',
            }
          }
        });

        if (!imageRes.ok) return imageRes;

        const response = new Response(imageRes.body, imageRes);
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return response;
      } catch (e) {
        return new Response('Image optimization failed', { status: 500 });
      }
    }

    // 1. Health Check & Monitoring (Item 2)
    if (url.pathname === '/health' && method === 'GET') {
      try {
        const d1Status = await env.DB.prepare('SELECT 1').first();
        return new Response(JSON.stringify({ 
          status: 'ok', 
          services: { d1: !!d1Status, r2: 'accessible' },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ status: 'error', message: String(e) }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. D1 Search Proxy (Item 5)
    // Permite buscar evoluções por tags ou texto rapidamente via SQL
    if (url.pathname === '/search' && method === 'GET') {
      const tag = url.searchParams.get('tag');
      const patientId = url.searchParams.get('patientId');
      
      let query = 'SELECT * FROM evolution_index';
      const params: string[] = [];
      
      if (tag || patientId) {
        query += ' WHERE ';
        if (patientId) {
          query += 'patient_id = ?';
          params.push(patientId);
        }
        if (tag) {
          if (patientId) query += ' AND ';
          query += 'tags LIKE ?';
          params.push(`%${tag}%`);
        }
      }
      
      query += ' ORDER BY created_at DESC LIMIT 50';
      
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Handle GET (Download/View de arquivos do R2)
    if (method === 'GET' && key) {
      const object = await env.R2_BUCKET.get(key);
      if (object === null) {
        return new Response('Object Not Found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');

      return new Response(object.body, { headers });
    }

    // Auth Check para Escrita (POST/PUT/DELETE)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // 3. Indexar evolução no D1 (Item 5)
    // Chamado pelo frontend ao salvar uma evolução para criar o índice de busca rápida
    if (url.pathname === '/index' && method === 'POST') {
      const data = await request.json() as any;
      const { id, patient_id, appointment_id, therapist_id, tags, preview_text } = data;
      
      await env.DB.prepare(`
        INSERT INTO evolution_index (id, patient_id, appointment_id, therapist_id, tags, preview_text)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tags = excluded.tags,
          preview_text = excluded.preview_text,
          updated_at = CURRENT_TIMESTAMP
      `).bind(id, patient_id, appointment_id, therapist_id, JSON.stringify(tags), preview_text).run();
      
      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 4. Upload para R2
    if (method === 'PUT' && key) {
      const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
      await env.R2_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });
      
      const publicUrl = `${url.origin}${url.pathname}?key=${encodeURIComponent(key)}`;
      
      return new Response(JSON.stringify({ 
        success: true, 
        url: publicUrl 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
