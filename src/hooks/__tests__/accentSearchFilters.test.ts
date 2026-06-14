import { describe, it, expect } from "vitest";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

describe("accentIncludes — busca insensível a acento/cedilha", () => {
  it("encontra com query sem acento", () => {
    expect(accentIncludes("João", "joao")).toBe(true);
  });
  it("encontra com query acentuada sobre valor sem acento", () => {
    expect(accentIncludes("joao", "João")).toBe(true);
  });
  it("trata cedilha nos dois sentidos", () => {
    expect(accentIncludes("Maçã", "maca")).toBe(true);
    expect(accentIncludes("maca", "Maçã")).toBe(true);
  });
  it("é case-insensitive", () => {
    expect(accentIncludes("FISIOTERAPIA", "fisio")).toBe(true);
  });
  it("não casa quando não contém", () => {
    expect(accentIncludes("João", "pedro")).toBe(false);
  });
});
