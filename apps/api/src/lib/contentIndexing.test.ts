import { describe, it, expect } from "vitest";
import { buildIndexChunks, buildProtocolDoc } from "./contentIndexing";

const doc = buildProtocolDoc({
  id: "abc",
  name: "Reabilitação LCA",
  description: "Reabilitação progressiva após reconstrução do ligamento cruzado anterior.",
  condition_name: "Lesão de LCA",
  weeks_total: 24,
  objectives: "Restaurar força e estabilidade do joelho.",
  contraindications: "Não progredir carga na presença de derrame articular importante.",
  evidence_level: "A",
  protocol_type: "pos-operatorio",
});

describe("contentIndexing.buildIndexChunks", () => {
  it("produces one indexable file per section chunk, numbered by the base filename", () => {
    const files = buildIndexChunks("protocol-abc.md", doc, { status: "current" }, { source: "protocols", id: "abc", title: "Reabilitação LCA" });
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files[0].filename).toBe("protocol-abc--0.md");
    expect(files[1].filename).toBe("protocol-abc--1.md");
  });

  it("carries status + source metadata and a breadcrumb on every file", () => {
    const files = buildIndexChunks("protocol-abc.md", doc, { status: "current" }, { source: "protocols", id: "abc", title: "Reabilitação LCA" });
    expect(files.every((f) => f.metadata.status === "current")).toBe(true);
    expect(files.every((f) => f.metadata.source === "protocols")).toBe(true);
    expect(files.every((f) => f.text.startsWith("> Protocolo Clínico: Reabilitação LCA"))).toBe(true);
  });

  it("keeps the contraindications section as its own retrievable file", () => {
    const files = buildIndexChunks("protocol-abc.md", doc, { status: "current" }, { source: "protocols", id: "abc", title: "Reabilitação LCA" });
    const contra = files.find((f) => f.text.includes("derrame articular"));
    expect(contra).toBeDefined();
    expect(contra!.metadata.heading).toBe("Contraindicações");
  });
});
