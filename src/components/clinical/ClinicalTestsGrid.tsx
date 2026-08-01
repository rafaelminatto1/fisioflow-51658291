// ============================================================================
// DOCUMENTAÇÃO E DIRETRIZES PARA DESENVOLVEDORES E LLMs:
// Consulte o guia detalhado em: docs/clinical-tests.md antes de alterar este arquivo.
// ============================================================================

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClinicalTestCatalogRecord } from "@/data/clinicalTestsCatalog";

interface ClinicalTestsGridProps {
  isLoading: boolean;
  tests: ClinicalTestCatalogRecord[];
  onSelectTest: (test: ClinicalTestCatalogRecord) => void;
  onClearFilters: () => void;
}

function getBadgeColor(category: string | null) {
  switch (category) {
    case "Esportiva":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Pós-Operatório":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

function extractPercentage(source: string | null | undefined, label: string) {
  if (!source) return null;
  const expression = new RegExp(`${label}[^0-9~]*~?([01](?:[,.]\\d+)?)`, "i");
  const match = source.match(expression);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function ClinicalTestCard({
  test,
  index,
  onSelectTest,
}: {
  test: ClinicalTestCatalogRecord;
  index: number;
  onSelectTest: (test: ClinicalTestCatalogRecord) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = test.image_url || test.media_urls?.[0];
  const resourceCount = test.evidence_resources?.length ?? 0;
  const sensitivity = extractPercentage(
    test.sensitivity_specificity,
    "sensibilidade",
  );
  const specificity = extractPercentage(
    test.sensitivity_specificity,
    "especificidade",
  );
  const metrics = [
    sensitivity ? { label: "Sens.", value: sensitivity } : null,
    specificity ? { label: "Espec.", value: specificity } : null,
    test.lr_positive != null
      ? { label: "LR+", value: String(test.lr_positive) }
      : null,
  ].filter(
    (metric): metric is { label: string; value: string } => metric !== null,
  );

  return (
    <button
      type="button"
      onClick={() => onSelectTest(test)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_18px_38px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      style={{ animationDelay: `${(index % 12) * 40}ms` }}
    >
      <div className="relative h-44 overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 to-sky-50/60">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={test.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white/70 shadow-sm">
              <ImageIcon className="h-7 w-7" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">
              Ilustração clínica
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] shadow-sm ${getBadgeColor(test.category)}`}
          >
            {test.category || "Geral"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
            {test.is_builtin ? <Sparkles className="h-3 w-3" /> : null}
            {test.is_builtin ? "Curadoria" : "Clínica"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          <span className="truncate">{test.target_joint || "Sem região"}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sky-600">
            Explorar
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </div>

        <div>
          <h3 className="text-base font-black leading-tight tracking-[-0.02em] text-slate-900 transition-colors group-hover:text-sky-700">
            {test.name}
          </h3>
          {test.name_en ? (
            <p className="mt-1 truncate text-[11px] font-semibold italic text-slate-400">
              {test.name_en}
            </p>
          ) : null}
        </div>

        <p className="line-clamp-2 min-h-10 text-xs font-medium leading-5 text-slate-500">
          {test.purpose || "Sem objetivo clínico cadastrado."}
        </p>

        {metrics.length > 0 ? (
          <div
            className={`grid gap-2 rounded-xl bg-slate-50 p-2.5 ${metrics.length === 1 ? "grid-cols-1" : metrics.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-0 border-l-2 border-sky-400 pl-2 first:border-l-0 first:pl-0"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-0.5 text-sm font-black tabular-nums text-slate-800">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {test.regularity_sessions ? (
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
            Reteste
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700">
              a cada {test.regularity_sessions} sessões
            </span>
          </div>
        ) : null}

        {(test.tags?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(test.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            {test.wiki_page_id ? (
              <BookOpen className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
              {test.evidence_label || "Base clínica"}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              {resourceCount > 0
                ? `${resourceCount} materiais de apoio`
                : "Sem anexo local"}
            </p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-500" />
        </div>
      </div>
    </button>
  );
}

export function ClinicalTestsGrid({
  isLoading,
  tests,
  onSelectTest,
  onClearFilters,
}: ClinicalTestsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`clinical-test-skeleton-${index}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 shadow-inner">
          <Search className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-slate-900">
          Nenhum teste encontrado
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Não houve correspondência com o termo ou filtro atual. Limpe a busca
          para voltar ao acervo completo.
        </p>
        <Button
          variant="outline"
          className="mt-5 border-sky-200 text-sky-700 hover:bg-sky-50"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tests.map((test, index) => (
        <ClinicalTestCard
          key={test.id}
          test={test}
          index={index}
          onSelectTest={onSelectTest}
        />
      ))}
    </div>
  );
}
