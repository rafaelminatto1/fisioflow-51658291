import { Agent } from "agents";
import { withVoice, type VoiceTurnContext } from "@cloudflare/voice";
import { createScribeTranscriber } from "./scribeConfig";
import type { Env } from "../types/env";
import {
  normalizeAudioCapturePolicy,
  type AudioCaptureMode,
  type AudioCaptureReason,
} from "@fisioflow/core";
import { checkAudioTranscriptionBudget } from "../lib/audioTranscriptionBudget";

const VoiceAgentBase = withVoice(Agent);

type ScribeState = {
  organizationId: string | null;
  patientId: string | null;
  therapistId: string | null;
  captureMode: AudioCaptureMode;
  captureReason: AudioCaptureReason;
  budgetBlocked: boolean;
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
  transcriber = createScribeTranscriber(this.env.AI);

  initialState: ScribeState = {
    organizationId: null,
    patientId: null,
    therapistId: null,
    captureMode: 30,
    captureReason: "soap_section",
    budgetBlocked: false,
    startedAt: null,
    turns: [],
  };

  async setContext(input: {
    organizationId: string;
    patientId: string;
    therapistId: string;
    captureMode?: AudioCaptureMode;
    captureReason?: AudioCaptureReason;
  }) {
    const capturePolicy = normalizeAudioCapturePolicy(input);
    const budget = await checkAudioTranscriptionBudget(this.env, {
      organizationId: input.organizationId,
      professionalUserId: input.therapistId,
      requestedSeconds: 60,
    });
    await this.setState({
      ...this.state,
      organizationId: input.organizationId,
      patientId: input.patientId,
      therapistId: input.therapistId,
      captureMode: budget.allowed ? capturePolicy.captureMode : 0,
      captureReason: capturePolicy.captureReason,
      budgetBlocked: !budget.allowed,
      startedAt: this.state.startedAt ?? new Date().toISOString(),
    });
    return { ok: budget.allowed, budget };
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
        captureMode: payload.captureMode as AudioCaptureMode | undefined,
        captureReason: payload.captureReason as AudioCaptureReason | undefined,
      });
    } else if (payload.type === "flush") {
      await this.flush();
    }
  }

  async onTurn(transcript: string, _context: VoiceTurnContext): Promise<string> {
    const trimmed = transcript.trim();
    if (this.state.budgetBlocked) return "";
    if (this.state.captureMode === 0) return "";
    if (!trimmed) return "";

    const turn = { text: trimmed, ts: new Date().toISOString() };
    await this.setState({ ...this.state, turns: [...this.state.turns, turn] });

    return "";
  }

  async flush() {
    const { organizationId, patientId, therapistId, turns } = this.state;
    // Coluna legada do modelo SOAP — valor fixo até a migração de limpeza (Fase C).
    const section = "observacao";
    if (!organizationId || !patientId || !therapistId || turns.length === 0) {
      return { ok: false, reason: "missing-context-or-empty" };
    }

    const rawText = turns.map((t) => t.text).join(" ");
    const capturePolicy = normalizeAudioCapturePolicy({
      captureMode: this.state.captureMode,
      captureReason: this.state.captureReason,
      capturedSeconds: this.state.startedAt
        ? Math.round((Date.now() - new Date(this.state.startedAt).getTime()) / 1000)
        : 0,
      sessionCoveragePercent: this.state.captureMode,
    });
    const budget = await checkAudioTranscriptionBudget(this.env, {
      organizationId,
      professionalUserId: therapistId,
      requestedSeconds: capturePolicy.capturedSeconds || 60,
    });
    if (!budget.allowed) {
      await this.setState({ ...this.state, turns: [], startedAt: null, budgetBlocked: true });
      return { ok: false, reason: budget.reason ?? "transcription-budget-exceeded", budget };
    }
    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) {
      return { ok: false, reason: "no-db-url" };
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const [row] = await sql`
      INSERT INTO clinical_scribe_logs
        (
          organization_id, patient_id, therapist_id, section, raw_text, consent_source,
          capture_mode, capture_reason, captured_seconds, session_coverage_percent,
          audio_policy_version, capture_metadata
        )
      VALUES
        (
          ${organizationId}, ${patientId}, ${therapistId}, ${section}, ${rawText}, 'voice_scribe_v2',
          ${capturePolicy.captureMode}, ${capturePolicy.captureReason}, ${capturePolicy.capturedSeconds},
          ${capturePolicy.sessionCoveragePercent}, ${capturePolicy.policyVersion},
          ${JSON.stringify({ source: "voice_scribe_v2", turns: turns.length, budget })}::jsonb
        )
      RETURNING id
    `;

    await this.setState({ ...this.state, turns: [], startedAt: null });
    return { ok: true, id: row?.id };
  }
}
