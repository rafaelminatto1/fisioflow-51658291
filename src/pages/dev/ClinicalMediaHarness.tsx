import { useEffect, useMemo, useState } from "react";
import { ImagePlus, RotateCcw, Save } from "lucide-react";

import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/button";
import { STORAGE_FOLDERS } from "@/lib/storage/upload";

const STORAGE_KEY = "fisioflow:dev:clinical-media-harness";

const EMPTY_VALUE = "<p></p>";

export default function ClinicalMediaHarness() {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return EMPTY_VALUE;
    return window.localStorage.getItem(STORAGE_KEY) || EMPTY_VALUE;
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [externalValueRevision, setExternalValueRevision] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, value);
    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
  }, [value]);

  const stats = useMemo(() => {
    const hasMedia = value.includes("clinical-media");
    const hasCaption = value.includes("figcaption");
    return {
      hasMedia,
      hasCaption,
      length: value.length,
    };
  }, [value]);

  const handleReset = () => {
    setValue(EMPTY_VALUE);
    setExternalValueRevision((current) => current + 1);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleInsertSeedImage = () => {
    setValue(
      [
        '<figure data-type="clinical-media" data-align="center" data-width="100%">',
        '<img src="https://cdn.local.test/patients/imagem-e2e.png" alt="Imagem clínica de teste" />',
        "<figcaption></figcaption>",
        "</figure>",
      ].join(""),
    );
    setExternalValueRevision((current) => current + 1);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Dev Harness
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Clinical Media Block
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Validação manual e E2E do editor rico com imagem, caption, redimensionamento,
                alinhamento e persistência local.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                data-testid="clinical-media-save-indicator"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Save className="h-4 w-4" />
                  {savedAt ? `Salvo às ${savedAt}` : "Aguardando edição"}
                </div>
                <div className="mt-1 text-xs text-emerald-700">
                  HTML persistido em `localStorage`
                </div>
              </div>
              <Button
                type="button"
                className="gap-2"
                onClick={handleInsertSeedImage}
                data-testid="clinical-media-seed-image"
              >
                <ImagePlus className="h-4 w-4" />
                Inserir imagem de teste
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleReset}
                data-testid="clinical-media-reset"
              >
                <RotateCcw className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-12">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] xl:col-span-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Observações clínicas</h2>
              <p className="text-sm text-slate-500">
                Use o botão de imagem, ajuste o tamanho pela alça lateral e escreva a legenda logo
                abaixo.
              </p>
            </div>
            <RichTextEditor
              value={value}
              onValueChange={setValue}
              placeholder="Insira uma imagem clínica e descreva os achados."
              imageUploadFolder={STORAGE_FOLDERS.PATIENTS}
              showToolbar
              className="min-h-[540px]"
              externalValueRevision={externalValueRevision}
            />
          </article>

          <aside className="space-y-4 xl:col-span-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Estado
              </h2>
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <dt>Imagem no conteúdo</dt>
                  <dd data-testid="clinical-media-has-media">{stats.hasMedia ? "Sim" : "Não"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Legenda presente</dt>
                  <dd data-testid="clinical-media-has-caption">
                    {stats.hasCaption ? "Sim" : "Não"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Tamanho do HTML</dt>
                  <dd data-testid="clinical-media-html-length">{stats.length}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                HTML persistido
              </h2>
              <pre
                className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-900 p-4 text-xs leading-5"
                data-testid="clinical-media-html"
              >
                {value}
              </pre>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
