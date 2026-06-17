export type BlockType = "text" | "vas" | "goniometry" | "checklist" | "photo" | "ai_insight";

export type EvolutionBlock = {
  id: string;
  type: BlockType;
  // campos por tipo (livres — validados no backend por parseBlocks)
  text?: string;
  value?: number; // vas
  joint?: string; // goniometry
  movement?: string; // goniometry
  degrees?: number; // goniometry
  items?: Array<{ text: string; done: boolean }>; // checklist
  url?: string; // photo
  caption?: string; // photo
  content?: string; // ai_insight
};

export function newBlock(type: BlockType): EvolutionBlock {
  const id = (globalThis.crypto?.randomUUID?.() ?? `b-${Date.now()}-${Math.random()}`).toString();
  switch (type) {
    case "vas":
      return { id, type, value: 0 };
    case "goniometry":
      return { id, type, joint: "", movement: "", degrees: 0 };
    case "checklist":
      return { id, type, items: [{ text: "", done: false }] };
    case "photo":
      return { id, type, url: "", caption: "" };
    case "ai_insight":
      return { id, type, content: "" };
    default:
      return { id, type: "text", text: "" };
  }
}

/** Resumo em texto puro dos blocos — espelhado em `observacao` (legado/autosave/finalização). */
export function blocksToText(blocks: EvolutionBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "text":
          return b.text?.trim() ?? "";
        case "vas":
          return `EVA (dor): ${b.value ?? 0}/10`;
        case "goniometry":
          return `Goniometria: ${[b.joint, b.movement].filter(Boolean).join(" ")} = ${b.degrees ?? 0}°`;
        case "checklist":
          return (b.items ?? [])
            .filter((i) => i.text.trim())
            .map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`)
            .join("\n");
        case "photo":
          return b.caption?.trim() ? `Foto: ${b.caption}` : "";
        case "ai_insight":
          return b.content?.trim() ? `Insight IA: ${b.content}` : "";
        default:
          return "";
      }
    })
    .filter((s) => s.length > 0)
    .join("\n\n");
}
