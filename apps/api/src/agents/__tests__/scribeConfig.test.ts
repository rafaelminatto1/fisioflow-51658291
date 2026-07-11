import { describe, it, expect } from "vitest";
import { WorkersAINova3STT } from "@cloudflare/voice";
import { SCRIBE_NOVA3_OPTIONS, createScribeTranscriber } from "../scribeConfig";

describe("SCRIBE_NOVA3_OPTIONS", () => {
  it("transcreve em pt-BR com pontuação e smart format", () => {
    expect(SCRIBE_NOVA3_OPTIONS.language).toBe("pt-BR");
    expect(SCRIBE_NOVA3_OPTIONS.punctuate).toBe(true);
    expect(SCRIBE_NOVA3_OPTIONS.smartFormat).toBe(true);
  });
  it("NÃO envia keyterms: keyterm prompting é EN-only no Nova-3 — com pt-BR a Deepgram aceita a conexão mas nunca emite Results (transcrição silenciosamente vazia)", () => {
    expect("keyterms" in SCRIBE_NOVA3_OPTIONS).toBe(false);
  });
});

describe("createScribeTranscriber", () => {
  it("cria um transcriber Nova-3 (não Flux)", () => {
    const fakeAi = { run: async () => ({}) } as any;
    const t = createScribeTranscriber(fakeAi);
    expect(t).toBeInstanceOf(WorkersAINova3STT);
  });
});
