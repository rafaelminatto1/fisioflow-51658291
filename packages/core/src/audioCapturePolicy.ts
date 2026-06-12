export const AUDIO_CAPTURE_POLICY_VERSION = "2026-06-11";

export const AUDIO_CAPTURE_MODES = [0, 30, 50, 100] as const;
export type AudioCaptureMode = (typeof AUDIO_CAPTURE_MODES)[number];

export const AUDIO_CAPTURE_REASONS = [
  "evaluation",
  "measurement",
  "clinical_test",
  "soap_section",
  "full_session",
] as const;
export type AudioCaptureReason = (typeof AUDIO_CAPTURE_REASONS)[number];

export type AudioCapturePolicy = {
  captureMode: AudioCaptureMode;
  captureReason: AudioCaptureReason;
  capturedSeconds: number;
  sessionCoveragePercent: AudioCaptureMode;
  policyVersion: string;
};

const VALID_MODES = new Set<number>(AUDIO_CAPTURE_MODES);
const VALID_REASONS = new Set<string>(AUDIO_CAPTURE_REASONS);

export function normalizeAudioCapturePolicy(input: {
  captureMode?: unknown;
  captureReason?: unknown;
  capturedSeconds?: unknown;
  sessionCoveragePercent?: unknown;
}): AudioCapturePolicy {
  const captureMode = normalizeMode(input.captureMode, 100);
  const sessionCoveragePercent = normalizeMode(input.sessionCoveragePercent, captureMode);
  const captureReason =
    typeof input.captureReason === "string" && VALID_REASONS.has(input.captureReason)
      ? (input.captureReason as AudioCaptureReason)
      : "soap_section";

  return {
    captureMode,
    captureReason,
    capturedSeconds: normalizeSeconds(input.capturedSeconds),
    sessionCoveragePercent,
    policyVersion: AUDIO_CAPTURE_POLICY_VERSION,
  };
}

export function estimateTranscriptionMinutes(capturedSeconds: number): number {
  return Math.max(0, Math.ceil(capturedSeconds / 60));
}

function normalizeMode(value: unknown, fallback: AudioCaptureMode): AudioCaptureMode {
  const numberValue = typeof value === "number" ? value : Number(value);
  return VALID_MODES.has(numberValue) ? (numberValue as AudioCaptureMode) : fallback;
}

function normalizeSeconds(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.round(numberValue));
}
