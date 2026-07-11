import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const voiceMock: any = {
  status: "listening",
  connected: true,
  isMuted: false,
  error: null,
  audioLevel: 0,
  interimTranscript: null,
  transcript: [] as Array<{ role: string; text: string }>,
  sendJSON: vi.fn(),
  startCall: vi.fn(),
  endCall: vi.fn(),
  toggleMute: vi.fn(),
};

vi.mock("@cloudflare/voice/react", () => ({
  useVoiceAgent: () => ({ ...voiceMock, transcript: voiceMock.transcript }),
}));

import { useVoiceScribeV2 } from "../useVoiceScribeV2";

const opts = { organizationId: "o1", patientId: "p1", therapistId: "t1" };

describe("useVoiceScribeV2 — acúmulo de transcrição", () => {
  beforeEach(() => {
    voiceMock.transcript = [];
  });

  it("acumula falas do usuário na ordem", () => {
    const { result, rerender } = renderHook(() => useVoiceScribeV2(opts));
    act(() => {
      voiceMock.transcript = [{ role: "user", text: "Paciente relata melhora." }];
    });
    rerender();
    act(() => {
      voiceMock.transcript = [
        { role: "user", text: "Paciente relata melhora." },
        { role: "user", text: "Realizamos mobilização." },
      ];
    });
    rerender();
    expect(result.current.transcribedText).toBe("Paciente relata melhora. Realizamos mobilização.");
  });

  it("NÃO perde texto quando o buffer da conexão reseta (reconexão do WS)", () => {
    const { result, rerender } = renderHook(() => useVoiceScribeV2(opts));
    act(() => {
      voiceMock.transcript = [{ role: "user", text: "Primeira parte." }];
    });
    rerender();
    // reconexão: buffer volta vazio e depois só traz a fala nova
    act(() => {
      voiceMock.transcript = [];
    });
    rerender();
    act(() => {
      voiceMock.transcript = [{ role: "user", text: "Segunda parte." }];
    });
    rerender();
    expect(result.current.transcribedText).toBe("Primeira parte. Segunda parte.");
  });
});
