import type { Env } from "../types/env";
import { GoogleGenAI, type Session } from "@google/genai";
import { ASSESSMENT_SYSTEM_INSTRUCTION } from "../lib/ai/prompts/assessment-prompts";

/**
 * AssessmentLiveSession — Proxy bidirecional entre cliente (browser) e Gemini Live API.
 *
 * Fluxo:
 *   Cliente -> WebSocket (DO) -> Gemini Live (via @google/genai ai.live.connect)
 *   Gemini Live -> DO -> WebSocket -> Cliente
 *
 * Protocolo cliente → DO (JSON):
 *   { type: "audio", data: base64, mimeType?: "audio/pcm;rate=16000" }
 *   { type: "text", text: string, turnComplete?: boolean }
 *   { type: "end_audio" }          // marca fim do stream de áudio
 *   { type: "close" }
 *
 * Protocolo DO → cliente (JSON):
 *   { type: "open" }
 *   { type: "text", text: string }
 *   { type: "audio", data: base64, mimeType: string }
 *   { type: "turn_complete" }
 *   { type: "error", message: string }
 *   { type: "close", code: number, reason: string }
 */
export class AssessmentLiveSession implements DurableObject {
	private state: DurableObjectState;
	private env: Env;
	private geminiSession: Session | null = null;
	private clientWs: WebSocket | null = null;
	private meta: {
		sessionId: string;
		patientId: string;
		organizationId: string;
		startedAt: number;
	} | null = null;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/ws") {
			const sessionId = url.searchParams.get("sessionId") ?? crypto.randomUUID();
			const patientId = url.searchParams.get("patientId") ?? "unknown";
			const organizationId =
				url.searchParams.get("organizationId") ?? "unknown";

			const pair = new WebSocketPair();
			const client = pair[0];
			const server = pair[1];

			server.accept();
			this.clientWs = server;
			this.meta = {
				sessionId,
				patientId,
				organizationId,
				startedAt: Date.now(),
			};

			server.addEventListener("message", (evt) =>
				this.handleClientMessage(evt.data),
			);
			server.addEventListener("close", () => this.cleanup("client_closed"));
			server.addEventListener("error", () => this.cleanup("client_error"));

			// Conectar ao Gemini Live em paralelo (não bloqueia handshake do WS cliente)
			this.connectToGemini().catch((err) => {
				console.error("[AssessmentLiveSession] Gemini connect failed:", err);
				this.sendToClient({
					type: "error",
					message: "Falha ao conectar ao Gemini Live API",
				});
			});

			return new Response(null, { status: 101, webSocket: client });
		}

		return new Response("Not Found", { status: 404 });
	}

	private async connectToGemini(): Promise<void> {
		const apiKey = this.env.GOOGLE_AI_API_KEY;
		if (!apiKey) throw new Error("GOOGLE_AI_API_KEY ausente");

		const ai = new GoogleGenAI({ apiKey });

		this.geminiSession = await ai.live.connect({
			model: "gemini-live-2.5-flash-preview",
			config: {
				responseModalities: ["TEXT" as any],
				systemInstruction: ASSESSMENT_SYSTEM_INSTRUCTION,
			} as any,
			callbacks: {
				onopen: () => {
					this.sendToClient({ type: "open" });
				},
				onmessage: (message) => this.handleGeminiMessage(message),
				onerror: (err) => {
					console.error("[AssessmentLiveSession] Gemini error:", err);
					this.sendToClient({
						type: "error",
						message: "Erro na sessão Gemini Live",
					});
				},
				onclose: (evt) => {
					this.sendToClient({
						type: "close",
						code: evt.code ?? 1000,
						reason: evt.reason ?? "gemini_closed",
					});
					this.cleanup("gemini_closed");
				},
			},
		});
	}

	private handleGeminiMessage(message: any): void {
		const parts = message?.serverContent?.modelTurn?.parts ?? [];
		for (const part of parts) {
			if (part.text) {
				this.sendToClient({ type: "text", text: part.text });
			}
			if (part.inlineData?.data) {
				this.sendToClient({
					type: "audio",
					data: part.inlineData.data,
					mimeType: part.inlineData.mimeType ?? "audio/pcm;rate=24000",
				});
			}
		}
		if (message?.serverContent?.turnComplete) {
			this.sendToClient({ type: "turn_complete" });
		}
	}

	private async handleClientMessage(
		raw: string | ArrayBuffer,
	): Promise<void> {
		if (!this.geminiSession) return;

		let msg: any;
		try {
			msg = typeof raw === "string" ? JSON.parse(raw) : null;
		} catch {
			return;
		}
		if (!msg?.type) return;

		try {
			switch (msg.type) {
				case "audio":
					if (typeof msg.data === "string") {
						this.geminiSession.sendRealtimeInput({
							audio: {
								data: msg.data,
								mimeType: msg.mimeType ?? "audio/pcm;rate=16000",
							},
						});
					}
					break;
				case "text":
					if (typeof msg.text === "string") {
						this.geminiSession.sendClientContent({
							turns: msg.text,
							turnComplete: msg.turnComplete !== false,
						});
					}
					break;
				case "end_audio":
					this.geminiSession.sendRealtimeInput({ audioStreamEnd: true });
					break;
				case "close":
					this.cleanup("client_requested");
					break;
			}
		} catch (err) {
			console.error(
				"[AssessmentLiveSession] Error forwarding to Gemini:",
				err,
			);
			this.sendToClient({
				type: "error",
				message: "Erro ao enviar dados ao Gemini",
			});
		}
	}

	private sendToClient(payload: Record<string, unknown>): void {
		if (!this.clientWs) return;
		try {
			this.clientWs.send(JSON.stringify(payload));
		} catch (err) {
			console.error("[AssessmentLiveSession] sendToClient failed:", err);
		}
	}

	private cleanup(reason: string): void {
		try {
			this.geminiSession?.close();
		} catch {}
		this.geminiSession = null;

		try {
			this.clientWs?.close(1000, reason);
		} catch {}
		this.clientWs = null;

		if (this.meta) {
			const duration = Date.now() - this.meta.startedAt;
			console.log(
				`[AssessmentLiveSession] session=${this.meta.sessionId} org=${this.meta.organizationId} duration=${duration}ms reason=${reason}`,
			);
		}
		this.meta = null;
	}
}
