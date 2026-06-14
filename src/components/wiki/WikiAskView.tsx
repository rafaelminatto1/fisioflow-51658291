import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Loader2, SearchX, Sparkles } from "lucide-react";
import {
  useAskWiki,
  type AskWikiContentType,
  type AskWikiSource,
} from "@/hooks/useAskWiki";

const TYPE_FILTERS: Array<{ value: AskWikiContentType | undefined; label: string }> = [
  { value: undefined, label: "Tudo" },
  { value: "wiki", label: "Wiki" },
  { value: "protocols", label: "Protocolos" },
  { value: "exercises", label: "Exercícios" },
];

function sourcePath(source: AskWikiSource): string | null {
  if (source.type === "wiki" && source.slug) return `/wiki/${source.slug}`;
  if (source.type === "protocols") return `/protocols/${source.id}`;
  if (source.type === "exercises") return `/exercises/${source.id}`;
  return source.slug ? `/wiki/${source.slug}` : null;
}

type Props = {
  query: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
};

export const WikiAskView: React.FC<Props> = ({ query, onBack, onNavigate }) => {
  const { ask, loading, error, result } = useAskWiki();
  const [typeFilter, setTypeFilter] = React.useState<AskWikiContentType | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length >= 3) void ask(query, typeFilter);
  }, [query, typeFilter, ask]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar à busca
        </button>
        <div className="flex items-center gap-1.5">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setTypeFilter(filter.value)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${
                typeFilter === filter.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{query}</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Consultando a wiki...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="py-10 text-center">
          <p className="text-sm font-bold text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && result && !result.answered && (
        <div className="py-10 text-center space-y-2" data-testid="wiki-ask-empty">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
            <SearchX className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Não encontrei resposta na wiki para essa pergunta.
          </p>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
            A pergunta foi registrada para pautar novos artigos
          </p>
        </div>
      )}

      {!loading && !error && result?.answered && (
        <>
          <div
            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
            data-testid="wiki-ask-answer"
          >
            <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </p>
          </div>

          {result.sources.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Fontes
              </p>
              {result.sources.map((source) => {
                const path = sourcePath(source);
                return (
                  <button
                    key={`${source.type}-${source.id}`}
                    disabled={!path}
                    onClick={() => path && onNavigate(path)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left group disabled:cursor-default"
                  >
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {source.title}
                      </span>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {source.category} · relevância {(source.score * 100).toFixed(0)}%
                      </span>
                    </span>
                    {path && (
                      <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
