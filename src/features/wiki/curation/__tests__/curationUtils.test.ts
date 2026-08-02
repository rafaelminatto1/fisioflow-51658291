import { describe, expect, it } from "vitest";
import {
  filtersFromSearchParams,
  getPrimaryAction,
  hasEditorialCapability,
  writeCurationFilters,
} from "../curationUtils";

describe("curationUtils", () => {
  it("reconhece somente capabilities editoriais explícitas", () => {
    expect(hasEditorialCapability(["manage_library"])).toBe(true);
    expect(hasEditorialCapability(["clinical_review"])).toBe(true);
    expect(hasEditorialCapability(["admin"])).toBe(false);
    expect(hasEditorialCapability([])).toBe(false);
  });

  it("escolhe a ação primária apenas entre allowedActions", () => {
    expect(getPrimaryAction(["archive", "start_review"])).toBe("start_review");
    expect(getPrimaryAction(["publish"])).toBe("publish");
    expect(getPrimaryAction([])).toBeUndefined();
  });

  it("preserva filtros da fila em uma URL compartilhável", () => {
    const params = writeCurationFilters(new URLSearchParams("view=curation"), {
      status: "clinical_review",
      priority: "high",
      q: "lombalgia",
    });

    expect(params.get("view")).toBe("curation");
    expect(params.get("curationStatus")).toBe("clinical_review");
    expect(filtersFromSearchParams(params)).toMatchObject({
      status: "clinical_review",
      priority: "high",
      q: "lombalgia",
    });
  });
});
