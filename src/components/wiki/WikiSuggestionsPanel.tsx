import { BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useWikiSuggestions } from "@/hooks/useWikiSuggestions";
import type { AskWikiSource } from "@/hooks/useAskWiki";

function suggestionPath(source: AskWikiSource): string | null {
  if (source.type === "wiki" && source.slug) return `/wiki/${source.slug}`;
  if (source.type === "protocols") return `/protocols/${source.id}`;
  if (source.type === "exercises") return `/exercises/${source.id}`;
  return null;
}

/**
 * Faixa discreta de artigos relacionados ao texto da evolução.
 * Some quando não há sugestões — nunca ocupa espaço à toa.
 */
export function WikiSuggestionsPanel({ text, enabled = true }: { text: string; enabled?: boolean }) {
  const { suggestions, loading } = useWikiSuggestions(text, enabled);

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="col-span-12 md:col-span-9 flex items-center gap-2 flex-wrap rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <BookOpen className="w-3.5 h-3.5" />
        )}
        Relacionados na wiki:
      </span>
      {suggestions.map((s) => {
        const path = suggestionPath(s);
        if (!path) return null;
        return (
          <Link
            key={`${s.type}-${s.id}`}
            to={path}
            target="_blank"
            className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full px-2.5 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors truncate max-w-[16rem]"
          >
            {s.title}
          </Link>
        );
      })}
    </div>
  );
}
