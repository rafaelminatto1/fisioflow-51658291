import { describe, it, expect } from "vitest";
import { WorkersAINova3STT } from "@cloudflare/voice";
import { SCRIBE_NOVA3_OPTIONS, SCRIBE_KEYTERMS, createScribeTranscriber } from "../scribeConfig";

describe("SCRIBE_NOVA3_OPTIONS", () => {
  it("transcreve em pt-BR com pontuação e smart format", () => {
    expect(SCRIBE_NOVA3_OPTIONS.language).toBe("pt-BR");
    expect(SCRIBE_NOVA3_OPTIONS.punctuate).toBe(true);
    expect(SCRIBE_NOVA3_OPTIONS.smartFormat).toBe(true);
  });
  it("inclui o glossário clínico de fisioterapia nos keyterms", () => {
    for (const term of ["Maitland", "Mulligan", "EVA", "ADM", "neurodinâmica", "mobilização"]) {
      expect(SCRIBE_KEYTERMS).toContain(term);
    }
    expect(SCRIBE_NOVA3_OPTIONS.keyterms).toBe(SCRIBE_KEYTERMS);
  });
});

describe("createScribeTranscriber", () => {
  it("cria um transcriber Nova-3 (não Flux)", () => {
    const fakeAi = { run: async () => ({}) } as any;
    const t = createScribeTranscriber(fakeAi);
    expect(t).toBeInstanceOf(WorkersAINova3STT);
  });
});
