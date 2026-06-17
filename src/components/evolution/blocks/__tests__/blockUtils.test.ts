import { describe, it, expect } from "vitest";
import { newBlock, blocksToText, type EvolutionBlock } from "../blockUtils";

describe("newBlock", () => {
  it("creates typed blocks with defaults + unique id", () => {
    const vas = newBlock("vas");
    expect(vas).toMatchObject({ type: "vas", value: 0 });
    expect(vas.id).toBeTruthy();
    expect(newBlock("goniometry")).toMatchObject({ type: "goniometry", degrees: 0 });
    expect(newBlock("checklist").items).toHaveLength(1);
  });
});

describe("blocksToText", () => {
  it("renders a plain-text summary mirrored into observacao", () => {
    const blocks: EvolutionBlock[] = [
      { id: "1", type: "text", text: "Paciente evoluiu bem." },
      { id: "2", type: "vas", value: 3 },
      { id: "3", type: "goniometry", joint: "joelho", movement: "flexão", degrees: 120 },
      { id: "4", type: "checklist", items: [{ text: "Alongou", done: true }, { text: "Pendente", done: false }] },
    ];
    const txt = blocksToText(blocks);
    expect(txt).toContain("Paciente evoluiu bem.");
    expect(txt).toContain("EVA (dor): 3/10");
    expect(txt).toContain("Goniometria: joelho flexão = 120°");
    expect(txt).toContain("[x] Alongou");
    expect(txt).toContain("[ ] Pendente");
  });

  it("drops empty blocks", () => {
    expect(blocksToText([{ id: "1", type: "text", text: "  " }, { id: "2", type: "photo", url: "" }])).toBe("");
  });
});
