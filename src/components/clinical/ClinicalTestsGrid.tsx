// ============================================================================
// DOCUMENTAÇÃO E DIRETRIZES PARA DESENVOLVEDORES E LLMs:
// Consulte o guia detalhado em: docs/clinical-tests.md antes de alterar este arquivo.
// ============================================================================

import { ArrowRight, FileText, Image as ImageIcon, Search, Sparkles, BookOpen } from "lucide-react";

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
      return "border-teal-200 bg-teal-50 text-teal-700";
  }
}

export function ClinicalTestsGrid({
  isLoading,
  tests,
  onSelectTest,
  onClearFilters,
}: ClinicalTestsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`clinical-test-skeleton-${index}`}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white"
          >
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-4 py-20 text-center shadow-sm">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 shadow-inner">
          <Search className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Nenhum teste encontrado</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Não houve correspondência com o termo ou filtro atual. Limpe a busca para voltar ao acervo
          completo.
        </p>
        <Button
          variant="outline"
          className="mt-6 border-teal-200 text-teal-700 hover:bg-teal-50"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tests.map((test, index) => {
        const resourceCount = test.evidence_resources?.length ?? 0;

        return (
          <button
            key={test.id}
            type="button"
            onClick={() => onSelectTest(test)}
            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] hover:border-teal-300/60 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${(index % 12) * 50}ms` }}
          >
            <div className="relative h-52 overflow-hidden border-b border-slate-100 bg-slate-50">
              {test.image_url || test.media_urls?.[0] ? (
                <img
                  src={test.image_url || test.media_urls?.[0]}
                  alt={test.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                  <ImageIcon className="h-12 w-12 opacity-40" />
                </div>
              )}

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getBadgeColor(test.category)}`}
                >
                  {test.category || "Geral"}
                </span>

                {test.is_builtin ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Biblioteca
                  </span>
                ) : (
                  <span className="rounded-full border border-white/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Customizado
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>{test.target_joint || "Sem região"}</span>
                <span className="inline-flex items-center gap-1.5 text-teal-600 font-bold">
                  Explorar
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>

              <div>
                <h3 className="text-xl font-semibold leading-tight text-slate-900 transition-colors group-hover:text-teal-700">
                  {test.name}
                </h3>
                {test.name_en ? (
                  <p className="mt-1 text-sm italic text-slate-400">{test.name_en}</p>
                ) : null}
              </div>

              <p className="line-clamp-2 min-h-[3rem] text-sm leading-relaxed text-slate-500">
                {test.purpose || "Sem objetivo clínico cadastrado."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {(test.tags ?? []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 border border-slate-200/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-700 truncate">
                      {test.evidence_label || "Base clínica"}
                    </p>
                    {test.wiki_page_id && (
                      <span className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200/50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 uppercase tracking-wider">
                        Wiki
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">
                    {resourceCount > 0 ? `${resourceCount} materiais de apoio` : "Sem anexo local"}
                  </p>
                </div>
                {test.wiki_page_id ? (
                  <BookOpen className="h-5 w-5 text-teal-600 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
