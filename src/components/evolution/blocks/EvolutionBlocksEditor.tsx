import { useCallback, useState } from "react";
import {
  Type,
  Activity,
  Ruler,
  ListChecks,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Wand2,
  Mic,
  Square,
} from "lucide-react";
import { type EvolutionBlock, type BlockType, newBlock } from "./blockUtils";
import { evolutionAiApi } from "@/api/v2/evolution";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result?.toString().split(",")[1];
      if (b64) resolve(b64);
      else reject(new Error("Failed to convert to base64"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const PALETTE: Array<{ type: BlockType; label: string; icon: typeof Type }> = [
  { type: "text", label: "Texto", icon: Type },
  { type: "vas", label: "EVA (dor)", icon: Activity },
  { type: "goniometry", label: "Goniometria", icon: Ruler },
  { type: "checklist", label: "Checklist", icon: ListChecks },
  { type: "photo", label: "Foto", icon: ImageIcon },
  { type: "ai_insight", label: "Insight IA", icon: Sparkles },
];

const TYPE_META: Record<BlockType, { label: string; icon: typeof Type; tone: string }> = {
  text: { label: "Texto", icon: Type, tone: "text-slate-500" },
  vas: { label: "EVA (dor)", icon: Activity, tone: "text-blue-600" },
  goniometry: { label: "Goniometria", icon: Ruler, tone: "text-emerald-600" },
  checklist: { label: "Checklist", icon: ListChecks, tone: "text-amber-600" },
  photo: { label: "Foto", icon: ImageIcon, tone: "text-violet-600" },
  ai_insight: { label: "Insight IA", icon: Sparkles, tone: "text-blue-600" },
};

export function EvolutionBlocksEditor({
  blocks,
  onChange,
  disabled,
}: {
  blocks: EvolutionBlock[];
  onChange: (blocks: EvolutionBlock[]) => void;
  disabled?: boolean;
}) {
  const update = useCallback(
    (id: string, patch: Partial<EvolutionBlock>) =>
      onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    [blocks, onChange],
  );
  const remove = useCallback((id: string) => onChange(blocks.filter((b) => b.id !== id)), [blocks, onChange]);
  const add = useCallback((type: BlockType) => onChange([...blocks, newBlock(type)]), [blocks, onChange]);
  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= blocks.length) return;
      const next = [...blocks];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    },
    [blocks, onChange],
  );

  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      setIsTranscribing(true);
      setAiError(null);
      try {
        const audioBlob = await stopRecording();
        const base64 = await blobToBase64(audioBlob);
        const res = await evolutionAiApi.transcribeBlocks(base64);
        const newBlocks = (res.data?.blocks ?? []) as unknown as EvolutionBlock[];
        if (newBlocks.length === 0) {
          setAiError("A IA não encontrou blocos no áudio (ou a transcrição falhou).");
        } else {
          onChange([...blocks, ...newBlocks]);
          setAiOpen(false);
        }
      } catch (_err: unknown) {
        setAiError(_err instanceof Error ? _err.message : "Falha ao gravar/transcrever áudio.");
      } finally {
        setIsTranscribing(false);
      }
    } else {
      try {
        setAiError(null);
        setAiOpen(true);
        await startRecording();
      } catch {
        setAiError("Sem permissão de microfone.");
      }
    }
  }, [isRecording, startRecording, stopRecording, blocks, onChange]);

  const extractFromText = useCallback(async () => {
    const text = aiText.trim();
    if (text.length < 10 || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await evolutionAiApi.extractBlocks(text);
      const newBlocks = (res.data ?? []) as unknown as EvolutionBlock[];
      if (newBlocks.length === 0) {
        setAiError("A IA não encontrou blocos no texto.");
      } else {
        onChange([...blocks, ...newBlocks]);
        setAiText("");
        setAiOpen(false);
      }
    } catch (e) {
      setAiError((e as Error).message ?? "Falha na extração");
    } finally {
      setAiBusy(false);
    }
  }, [aiText, aiBusy, blocks, onChange]);

  return (
    <div className="font-[Nunito,sans-serif]">
      {!disabled && (
        <div className="mb-3">
          {!aiOpen ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAiOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Gerar blocos (Texto)
                </button>
                <button
                  onClick={handleRecordToggle}
                  disabled={isTranscribing}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isRecording
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 animate-pulse"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {isTranscribing ? "Transcrevendo..." : isRecording ? "Parar Gravação" : "Scribe de Voz"}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-600">{aiError}</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={3}
                placeholder="Cole/escreva a evolução em texto livre. A IA (Hermes) extrai EVA, goniometria, condutas…"
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              {aiError && <p className="mt-1 text-xs text-red-600">{aiError}</p>}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={extractFromText}
                  disabled={aiBusy || aiText.trim().length < 10}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" /> {aiBusy ? "Gerando…" : "Gerar blocos"}
                </button>
                <button onClick={() => setAiOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="space-y-3">
        {blocks.map((b, idx) => {
          const meta = TYPE_META[b.type];
          const Icon = meta.icon;
          return (
            <div key={b.id} className="group rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${meta.tone}`}>
                  <Icon className="h-3.5 w-3.5" /> {meta.label}
                </span>
                {!disabled && (
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => move(b.id, -1)} disabled={idx === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para cima">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => move(b.id, 1)} disabled={idx === blocks.length - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para baixo">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(b.id)} className="rounded p-1 text-red-400 hover:bg-red-50" aria-label="Remover bloco">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <BlockBody block={b} update={update} disabled={disabled} />
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Adicionar bloco</p>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => add(type)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" /> <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockBody({
  block: b,
  update,
  disabled,
}: {
  block: EvolutionBlock;
  update: (id: string, patch: Partial<EvolutionBlock>) => void;
  disabled?: boolean;
}) {
  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none disabled:bg-slate-50";
  switch (b.type) {
    case "text":
      return (
        <textarea disabled={disabled} value={b.text ?? ""} onChange={(e) => update(b.id, { text: e.target.value })} rows={3} placeholder="Escreva a evolução…" className={`${input} resize-y`} />
      );
    case "vas":
      return (
        <div className="flex items-center gap-3">
          <input disabled={disabled} type="range" min={0} max={10} value={b.value ?? 0} onChange={(e) => update(b.id, { value: Number(e.target.value) })} className="flex-1 accent-blue-600" />
          <span className="w-12 text-center text-lg font-extrabold text-slate-800">{b.value ?? 0}<span className="text-xs text-slate-400">/10</span></span>
        </div>
      );
    case "goniometry":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input disabled={disabled} value={b.joint ?? ""} onChange={(e) => update(b.id, { joint: e.target.value })} placeholder="Articulação (ex: joelho)" className={input} />
          <input disabled={disabled} value={b.movement ?? ""} onChange={(e) => update(b.id, { movement: e.target.value })} placeholder="Movimento (ex: flexão)" className={input} />
          <div className="flex items-center gap-2">
            <input disabled={disabled} type="number" value={b.degrees ?? 0} onChange={(e) => update(b.id, { degrees: Number(e.target.value) })} className={input} />
            <span className="text-sm font-semibold text-slate-500">°</span>
          </div>
        </div>
      );
    case "checklist": {
      const items = b.items ?? [];
      return (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input disabled={disabled} type="checkbox" checked={it.done} onChange={(e) => { const next = [...items]; next[i] = { ...it, done: e.target.checked }; update(b.id, { items: next }); }} className="h-4 w-4 accent-blue-600" />
              <input disabled={disabled} value={it.text} onChange={(e) => { const next = [...items]; next[i] = { ...it, text: e.target.value }; update(b.id, { items: next }); }} placeholder="Item…" className={`${input} flex-1`} />
            </div>
          ))}
          {!disabled && (
            <button onClick={() => update(b.id, { items: [...items, { text: "", done: false }] })} className="text-xs font-semibold text-blue-600 hover:underline">+ item</button>
          )}
        </div>
      );
    }
    case "photo":
      return (
        <div className="space-y-2">
          <input disabled={disabled} value={b.url ?? ""} onChange={(e) => update(b.id, { url: e.target.value })} placeholder="URL da imagem (R2/media)" className={input} />
          {b.url ? <img src={b.url} alt={b.caption ?? "foto"} className="max-h-48 rounded-lg border border-slate-200 object-contain" /> : null}
          <input disabled={disabled} value={b.caption ?? ""} onChange={(e) => update(b.id, { caption: e.target.value })} placeholder="Legenda" className={input} />
        </div>
      );
    case "ai_insight":
      return (
        <textarea disabled={disabled} value={b.content ?? ""} onChange={(e) => update(b.id, { content: e.target.value })} rows={3} placeholder="Insight gerado por IA…" className={`${input} resize-y bg-blue-50/40`} />
      );
    default:
      return null;
  }
}
