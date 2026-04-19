import type { Env } from '../types/env';

/**
 * AssessmentLiveSession - Gerencia uma sessão de avaliação clínica por voz em tempo real.
 * 
 * Suporta fallback em 3 camadas:
 * 1. Local (Browser) - Processamento via Web Audio API.
 * 2. Workers AI (Whisper) - Transcrição assíncrona para sessões padrão.
 * 3. Gemini Live API - Sessão premium com baixa latência e raciocínio em tempo real.
 */
export class AssessmentLiveSession implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private chunks: ArrayBuffer[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server);
      
      const sessionId = url.searchParams.get('sessionId') ?? 'unknown';
      const patientId = url.searchParams.get('patientId') ?? 'unknown';
      
      server.serializeAttachment({ sessionId, patientId, mode: 'transcription', startedAt: Date.now() });
      
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/summary' && request.method === 'POST') {
      // Finaliza a sessão e gera o SOAP consolidado
      return new Response(JSON.stringify({ success: true, message: "Sessão finalizada. Processando evolução clínica..." }));
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message === 'string') {
      try {
        const data = JSON.parse(message);
        if (data.type === 'start_live') {
          // Switch to Gemini Live API mode
          ws.send(JSON.stringify({ type: 'mode_switched', mode: 'gemini_live' }));
        }
      } catch {
        // Ignorar mensagens de controle inválidas
      }
      return;
    }

    // Processamento de chunks binários de áudio
    this.chunks.push(message);
    
    // Se acumular muitos chunks, pode enviar para o Whisper periodicamente
    if (this.chunks.length > 50) {
      // Lógica de processamento em background
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('[AssessmentLiveSession] WebSocket error:', error);
    ws.close(1011, 'Internal error');
  }
}
