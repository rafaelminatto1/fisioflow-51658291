import { DurableObject } from 'cloudflare:workers';

/**
 * Durable Object para gerenciar o estado em tempo real de uma organização.
 * Mantém conexões WebSocket ativas e permite broadcast de mensagens.
 */
export class OrganizationState extends DurableObject {
  private sessions: Set<WebSocket>;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint para upgrade de WebSocket
    if (url.pathname === '/ws') {
      const [client, server] = Object.values(new WebSocketPair());
      const userId = url.searchParams.get('userId') || 'unknown';

      server.accept();
      this.sessions.add(server);

      server.addEventListener('message', (msg) => {
        if (msg.data === 'ping') {
          server.send('pong');
        }
      });

      server.addEventListener('close', () => {
        this.sessions.delete(server);
      });

      server.addEventListener('error', () => {
        this.sessions.delete(server);
      });

      // Notifica entrada (opcional)
      // this.broadcast(JSON.stringify({ type: 'USER_JOINED', payload: { userId } }));

      return new Response(null, { status: 101, webSocket: client });
    }

    // Endpoint interno para broadcast via HTTP POST
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.text();
      this.broadcast(message);
      return new Response('OK');
    }

    return new Response('Not Found', { status: 404 });
  }

  private broadcast(message: string) {
    for (const ws of this.sessions) {
      try {
        ws.send(message);
      } catch (e) {
        this.sessions.delete(ws);
      }
    }
  }
}

/**
 * Helper para enviar mensagens em tempo real para uma organização.
 */
export async function broadcastToOrg(env: any, orgId: string, message: any) {
  if (!env.ORGANIZATION_STATE) return;
  
  const id = env.ORGANIZATION_STATE.idFromName(orgId);
  const obj = env.ORGANIZATION_STATE.get(id);
  
  await obj.fetch(new Request('https://realtime/broadcast', {
    method: 'POST',
    body: JSON.stringify(message)
  }));
}
