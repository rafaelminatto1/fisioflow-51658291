import { useState } from "react";
import { EvolutionBlocksEditor } from "@/components/evolution/blocks/EvolutionBlocksEditor";
import { blocksToText, type EvolutionBlock } from "@/components/evolution/blocks/blockUtils";

export default function BlocksEditorDemo() {
  const [blocks, setBlocks] = useState<EvolutionBlock[]>([
    { id: "seed-1", type: "text", text: "Paciente relata melhora da dor lombar." },
    { id: "seed-2", type: "vas", value: 3 },
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 font-[Nunito,sans-serif]">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-800">Editor de Blocos — Demonstração</h1>
        <p className="text-sm text-slate-500">
          Preview isolado do editor modular de evolução (não grava prontuário). Validação visual.
        </p>
      </header>

      <EvolutionBlocksEditor blocks={blocks} onChange={setBlocks} />

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Espelho em texto (vai para `observacao`)
        </h2>
        <pre className="whitespace-pre-wrap text-sm text-slate-700">{blocksToText(blocks) || "—"}</pre>
      </section>
    </div>
  );
}
