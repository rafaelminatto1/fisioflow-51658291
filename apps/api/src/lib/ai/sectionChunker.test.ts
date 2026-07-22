import { describe, it, expect } from "vitest";
import { chunkClinicalDoc } from "./sectionChunker";

const PROTOCOL = [
  "# Protocolo Clínico: Reabilitação LCA",
  "**Condição clínica:** Lesão de LCA",
  "**Nível de evidência:** A",
  "",
  "## Descrição do Protocolo",
  "Reabilitação progressiva após reconstrução do ligamento cruzado anterior.",
  "",
  "## Contraindicações",
  "Não progredir carga na presença de derrame articular importante.",
].join("\n");

describe("sectionChunker.chunkClinicalDoc", () => {
  it("splits a clinical doc into one chunk per section plus an intro chunk", () => {
    const chunks = chunkClinicalDoc(PROTOCOL);
    const headings = chunks.map((c) => c.heading);
    expect(headings).toContain("Descrição do Protocolo");
    expect(headings).toContain("Contraindicações");
    // intro (title + field lines) is its own chunk with an empty heading
    expect(headings).toContain("");
    expect(chunks).toHaveLength(3);
  });

  it("prefixes every chunk with a breadcrumb built from the document title", () => {
    const chunks = chunkClinicalDoc(PROTOCOL);
    for (const c of chunks) {
      expect(c.text.startsWith("> Protocolo Clínico: Reabilitação LCA")).toBe(true);
    }
    const contra = chunks.find((c) => c.heading === "Contraindicações")!;
    expect(contra.breadcrumb).toBe("> Protocolo Clínico: Reabilitação LCA > Contraindicações");
    // the section body survives after the breadcrumb
    expect(contra.text).toContain("derrame articular");
  });

  it("attaches the provided metadata to every chunk", () => {
    const chunks = chunkClinicalDoc(PROTOCOL, { status: "current", specialty: "ortopedia" });
    for (const c of chunks) {
      expect(c.metadata.status).toBe("current");
      expect(c.metadata.specialty).toBe("ortopedia");
    }
  });

  it("keeps the evidence level together with the protocol header, never orphaned", () => {
    const chunks = chunkClinicalDoc(PROTOCOL);
    const withEvidence = chunks.filter((c) => c.text.includes("Nível de evidência:** A"));
    expect(withEvidence).toHaveLength(1);
    // it stays in the same chunk as the condition field, not split off on its own
    expect(withEvidence[0].text).toContain("Condição clínica:** Lesão de LCA");
  });

  it("subdivides an oversized section into multiple chunks at paragraph boundaries", () => {
    const big = [
      "# Protocolo X",
      "## Progressão de Carga",
      "Fase 1: carga leve por duas semanas de tratamento.",
      "",
      "Fase 2: carga moderada conforme tolerância do paciente.",
      "",
      "Fase 3: carga máxima progressiva até a alta clínica.",
    ].join("\n");
    const chunks = chunkClinicalDoc(big, {}, { maxChars: 60 });
    const prog = chunks.filter((c) => c.heading === "Progressão de Carga");
    expect(prog.length).toBeGreaterThan(1);
    for (const c of prog) {
      expect(c.text.startsWith("> Protocolo X > Progressão de Carga")).toBe(true);
    }
  });

  it("merges a tiny section into the previous chunk instead of emitting a fragment", () => {
    const doc = [
      "# Protocolo Z",
      "## Descrição",
      "Texto suficientemente grande para formar um chunk de conteúdo clínico real aqui.",
      "",
      "## Nota",
      "Curto.",
    ].join("\n");
    const chunks = chunkClinicalDoc(doc);
    expect(chunks.some((c) => c.heading === "Nota")).toBe(false);
    const desc = chunks.find((c) => c.heading === "Descrição")!;
    expect(desc.text).toContain("Curto.");
  });

  it("never separates a recommendation from its evidence level when splitting", () => {
    const doc = [
      "# Protocolo Y",
      "## Recomendações",
      "Realizar fortalecimento de quadríceps três vezes por semana.",
      "**Nível de evidência:** A",
      "",
      "Evitar impacto nas primeiras seis semanas após a reconstrução.",
      "**Nível de evidência:** B",
    ].join("\n");
    const chunks = chunkClinicalDoc(doc, {}, { maxChars: 80 });
    const a = chunks.find((c) => c.text.includes("Nível de evidência:** A"))!;
    expect(a.text).toContain("fortalecimento de quadríceps");
    const b = chunks.find((c) => c.text.includes("Nível de evidência:** B"))!;
    expect(b.text).toContain("Evitar impacto");
  });
});
