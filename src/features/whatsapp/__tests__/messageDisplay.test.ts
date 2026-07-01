import { describe, it, expect } from "vitest";
import {
  friendlyMessageLabel,
  isRawPlaceholder,
  resolveMessageDisplayText,
} from "../messageDisplay";

describe("messageDisplay", () => {
  it("friendlyMessageLabel mapeia tipos não-texto para rótulos PT-BR", () => {
    expect(friendlyMessageLabel("ephemeral")).toMatch(/visualização única/i);
    expect(friendlyMessageLabel("location")).toMatch(/localização/i);
    expect(friendlyMessageLabel("contacts")).toMatch(/contato/i);
    expect(friendlyMessageLabel("interactive")).toMatch(/interativ/i);
    expect(friendlyMessageLabel("text")).toBe("");
    expect(friendlyMessageLabel(undefined)).toBe("");
  });

  it("isRawPlaceholder detecta placeholders crus tipo [ephemeral]", () => {
    expect(isRawPlaceholder("[ephemeral]")).toBe(true);
    expect(isRawPlaceholder(" [location] ")).toBe(true);
    expect(isRawPlaceholder("Olá, bom dia")).toBe(false);
    expect(isRawPlaceholder("[preço]? quanto custa")).toBe(false);
    expect(isRawPlaceholder("")).toBe(false);
  });

  it("resolveMessageDisplayText prioriza texto real; senão rótulo amigável", () => {
    expect(resolveMessageDisplayText("text", "Olá")).toBe("Olá");
    expect(resolveMessageDisplayText("ephemeral", "[ephemeral]")).toMatch(/visualização única/i);
    expect(resolveMessageDisplayText("location", "")).toMatch(/localização/i);
    expect(resolveMessageDisplayText("text", "")).toBe("[mensagem sem texto]");
  });
});
