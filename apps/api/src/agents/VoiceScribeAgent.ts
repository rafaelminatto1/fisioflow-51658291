import { Agent } from "agents";
import { withVoice, WorkersAIFluxSTT, type VoiceTurnContext } from "@cloudflare/voice";
import type { Env } from "../types/env";

const VoiceAgentBase = withVoice(Agent);

type ScribeState = {
  organizationId: string | null;
  patientId: string | null;
  therapistId: string | null;
  section: "S" | "O" | "A" | "P";
  startedAt: string | null;
  turns: Array<{ text: string; ts: string }>;
};

/**
 * VoiceScribeAgent — S6.3
 * STT contínuo (WorkersAI Flux) com persistência em SQLite do DO + flush para
 * `clinical_scribe_logs` no Neon via Hyperdrive ao finalizar a sessão.
 * Uni-direcional: sem TTS — Scribe transcreve sem responder ao fisioterapeuta.
 */
export class VoiceScribeAgent extends VoiceAgentBase<Env, ScribeState> {
  transcriber = new WorkersAIFluxSTT(this.env.AI, {
    eotThreshold: 0.7,
    keyterms: [
      "fisioterapia",
      "ombro",
      "joelho",
      "lombar",
      "cervical",
      "EVA",
      "ADM",
      "Mulligan",
      "Maitland",
      "neurodinâmica",
    ],
  });

  initialState: ScribeState = {
    organizationId: null,
    patientId: null,
    therapistId: null,
    section: "S",
    startedAt: null,
    turns: [],
  };

  async setContext(input: {
    organizationId: string;
    patientId: string;
    therapistId: string;
    section?: "S" | "O" | "A" | "P";
  }) {
    await this.setState({
      ...this.state,
      organizationId: input.organizationId,
      patientId: input.patientId,
      therapistId: input.therapistId,
      section: input.section ?? "S",
      startedAt: this.state.startedAt ?? new Date().toISOString(),
    });
    return { ok: true };
  }

  /**
   * Handler para mensagens JSON enviadas via `sendJSON` do hook React.
   * Protocolos suportados: `set-context` e `flush`.
   */
  async onMessage(_connection: unknown, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    let payload: { type?: string; [k: string]: unknown };
    try {
      payload = JSON.parse(message);
    } catch {
      return;
    }
    if (payload.type === "set-context") {
      await this.setContext({
        organizationId: String(payload.organizationId ?? ""),
        patientId: String(payload.patientId ?? ""),
        therapistId: String(payload.therapistId ?? ""),
        section: payload.section as "S" | "O" | "A" | "P" | undefined,
      });
    } else if (payload.type === "flush") {
      await this.flush();
    }
  }

  async onTurn(transcript: string, _context: VoiceTurnContext): Promise<string> {
    const trimmed = transcript.trim();
    if (!trimmed) return "";

    const turn = { text: trimmed, ts: new Date().toISOString() };
    await this.setState({ ...this.state, turns: [...this.state.turns, turn] });

    return "";
  }

  async flush() {
    const { organizationId, patientId, therapistId, section, turns } = this.state;
    if (!organizationId || !patientId || !therapistId || turns.length === 0) {
      return { ok: false, reason: "missing-context-or-empty" };
    }

    const rawText = turns.map((t) => t.text).join(" ");
    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) {
      return { ok: false, reason: "no-db-url" };
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const [row] = await sql`
      INSERT INTO clinical_scribe_logs
        (organization_id, patient_id, therapist_id, section, raw_text, consent_source)
      VALUES
        (${organizationId}, ${patientId}, ${therapistId}, ${section}, ${rawText}, 'voice_scribe_v2')
      RETURNING id
    `;

    await this.setState({ ...this.state, turns: [] });
    return { ok: true, id: row?.id };
  }
}
