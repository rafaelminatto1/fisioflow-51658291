/**
 * Durable Object para gerenciar o estado em tempo real de uma organização.
 *
 * Usa WebSocket Hibernation API para economizar GB-s de compute:
 * o DO hiberna durante inatividade e acorda ao receber mensagem.
 *
 * Suporta DO Alarms para lembretes específicos por agendamento.
 */
import type { Env } from '../types/env';

export class OrganizationState implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade — usa Hibernation API
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());

      // Hiberna durante inatividade (economiza GB-s de compute)
      this.state.acceptWebSocket(server);

      // Armazena metadados da sessão no attachment (max 2 KB)
      const userId = url.searchParams.get('userId') ?? 'unknown';
      const orgId = url.searchParams.get('orgId') ?? 'unknown';
      server.serializeAttachment({ userId, orgId, connectedAt: Date.now() });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Broadcast via HTTP POST (chamado por outros Workers)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.text();
      this.broadcast(message);
      return new Response('OK');
    }

    // Agendar alarme para lembrete de consulta
    if (url.pathname === '/schedule-alarm' && request.method === 'POST') {
      const { scheduledAt, payload } = (await request.json()) as {
        scheduledAt: number;
        payload: Record<string, unknown>;
      };

      // Armazena payload do alarme no storage do DO
      const alarms = await this.state.storage.get<Record<string, unknown>[]>('pending-alarms') ?? [];
      alarms.push({ scheduledAt, payload });
      await this.state.storage.put('pending-alarms', alarms);

      // Agenda alarme — DO acorda exatamente nesse timestamp
      await this.state.storage.setAlarm(scheduledAt);

      return new Response(JSON.stringify({ scheduled: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Status das conexões ativas
    if (url.pathname === '/connections') {
      const sockets = this.state.getWebSockets();
      return new Response(
        JSON.stringify({
          active: sockets.length,
          sessions: sockets.map((ws) => ws.deserializeAttachment()),
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not Found', { status: 404 });
  }

  // ===== Hibernation API Handlers =====
  // Chamados automaticamente pelo runtime quando o DO acorda

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === 'ping') {
      ws.send('pong');
      return;
    }

    // Echo estruturado ou broadcast para sala
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : {};

      if (data.type === 'broadcast') {
        // Broadcast para todos na org, exceto quem enviou
        this.broadcast(JSON.stringify(data.payload), ws);
      }
    } catch {
      // Mensagem não-JSON — ignore
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // 1006 é um código reservado para fechamento anormal e não pode ser passado para ws.close()
    const safeCode = code === 1006 ? 1000 : code;
    ws.close(safeCode, reason);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('[OrganizationState] WebSocket error:', error);
    ws.close(1011, 'Internal error');
  }

  // ===== DO Alarm =====

  async alarm() {
    const now = Date.now();
    const alarms = await this.state.storage.get<Record<string, unknown>[]>('pending-alarms') ?? [];

    // Processa alarmes vencidos
    const remaining: Record<string, unknown>[] = [];

    for (const alarm of alarms) {
      const scheduledAt = alarm.scheduledAt as number;

      if (scheduledAt <= now) {
        // Dispara notificação via broadcast WebSocket
        const payload = alarm.payload as Record<string, unknown>;
        this.broadcast(JSON.stringify({ type: 'alarm', ...payload }));
      } else {
        remaining.push(alarm);
      }
    }

    await this.state.storage.put('pending-alarms', remaining);

    // Reagenda alarme para o próximo pendente
    if (remaining.length > 0) {
      const nextAt = Math.min(...remaining.map((a) => a.scheduledAt as number));
      await this.state.storage.setAlarm(nextAt);
    }
  }

  // ===== Helpers =====

  private broadcast(message: string, exclude?: WebSocket) {
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      try {
        ws.send(message);
      } catch {
        // WebSocket fechado — Hibernation API limpa automaticamente
      }
    }
  }
}

export async function broadcastToOrg(env: any, orgId: string, message: any) {
  const id = env.ORGANIZATION_STATE.idFromName(orgId);
  const stub = env.ORGANIZATION_STATE.get(id);
  await stub.fetch(new Request('http://do/broadcast', {
    method: 'POST',
    body: typeof message === 'string' ? message : JSON.stringify(message)
  }));
}
