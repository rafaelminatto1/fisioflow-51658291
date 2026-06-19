import { describe, it, expect } from "vitest";
import { readAiText } from "../ai-native";

describe("readAiText", () => {
  it("reads classic .response string", () => {
    expect(readAiText({ response: "olá" })).toBe("olá");
  });

  it("reads -fast/OpenAI choices[0].message.content", () => {
    expect(readAiText({ choices: [{ message: { content: "resposta fast" } }] })).toBe("resposta fast");
  });

  it("prefers .response when both present", () => {
    expect(readAiText({ response: "a", choices: [{ message: { content: "b" } }] })).toBe("a");
  });

  it("stringifies an object .response", () => {
    expect(readAiText({ response: { x: 1 } })).toBe('{"x":1}');
  });

  it("returns empty string when nothing usable", () => {
    expect(readAiText({})).toBe("");
    expect(readAiText(null)).toBe("");
    expect(readAiText({ choices: [] })).toBe("");
  });
});
