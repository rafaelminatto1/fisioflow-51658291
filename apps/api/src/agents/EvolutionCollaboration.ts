import type { Env } from "../types/env";

/**
 * EvolutionCollaboration — Durable Object para colaboração em tempo real via Yjs.
 *
 * Responsável por:
 * 1. Manter conexões WebSocket ativas para uma evolução específica.
 * 2. Sincronizar atualizações do Yjs (updates binários) entre os clientes.
 * 3. Gerenciar estado de presença (Awareness) - cursores e usuários online.
 * 4. Persistir o estado final no banco de dados principal (Neon) periodicamente.
 */
export class EvolutionCollaboration implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, { userId?: string; userName?: string }> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint de WebSocket: /api/sessions/:id/collaboration
    if (url.pathname.endsWith("/collaboration")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      await this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * Gerencia a conexão de um novo cliente.
   */
  private async handleSession(ws: WebSocket): Promise<void> {
    ws.accept();

    // No protocolo y-websocket, a primeira mensagem costuma ser de sincronização.
    // O Durable Object atua como um relay burro mas eficiente para os updates do Yjs,
    // podendo opcionalmente validar ou persistir dados.

    this.sessions.set(ws, {});

    ws.addEventListener("message", async (msg) => {
      try {
        // Broadcast para todos os outros clientes conectados nesta sala (ID do DO)
        this.broadcast(msg.data, ws);

        // TODO: Implementar persistência parcial ou debounce para save no Neon
      } catch (err) {
        console.error("[EvolutionCollaboration] Erro no broadcast:", err);
      }
    });

    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
    });

    ws.addEventListener("error", () => {
      this.sessions.delete(ws);
    });
  }

  /**
   * Envia dados para todos os clientes conectados, exceto o remetente.
   */
  private broadcast(data: string | ArrayBuffer, sender: WebSocket): void {
    for (const [ws] of this.sessions) {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch (err) {
          console.error("[EvolutionCollaboration] Falha ao enviar para socket:", err);
        }
      }
    }
  }
}
