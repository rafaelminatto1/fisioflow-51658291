import { describe, it, expect } from "vitest";
import { resolveDictationEnabled } from "../useDictationEnabled";

describe("resolveDictationEnabled", () => {
  it("liga quando settings.dictation_enabled é true", () => {
    expect(resolveDictationEnabled({ dictation_enabled: true }, false)).toBe(true);
  });
  it("desliga por padrão (settings vazio/ausente)", () => {
    expect(resolveDictationEnabled({}, false)).toBe(false);
    expect(resolveDictationEnabled(undefined, false)).toBe(false);
    expect(resolveDictationEnabled(null, false)).toBe(false);
  });
  it("env de build (VITE_VOICE_SCRIBE_V2) continua funcionando como override de dev", () => {
    expect(resolveDictationEnabled({}, true)).toBe(true);
  });
  it("valores não-booleanos não ligam a flag", () => {
    expect(resolveDictationEnabled({ dictation_enabled: "yes" }, false)).toBe(false);
    expect(resolveDictationEnabled({ dictation_enabled: 1 }, false)).toBe(false);
  });
});
