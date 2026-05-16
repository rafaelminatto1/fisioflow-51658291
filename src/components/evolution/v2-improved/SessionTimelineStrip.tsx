import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Copy, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSoapRecords, type SoapRecord } from "@/hooks/useSoapRecords";
import { stripHtml } from "@/lib/utils/stripHtml";
import { cn } from "@/lib/utils";

interface SessionTimelineStripProps {
  patientId?: string;
  maxItems?: number;
  onSeeAll?: () => void;
  /** Sessão atualmente em edição — não deve aparecer no histórico. */
  excludeId?: string;
  onReplicate?: (record: SoapRecord) => void;
}

function painChipClasses(pain: number | null | undefined) {
  if (pain == null) return "bg-slate-100 text-slate-600";
  if (pain <= 3) return "bg-emerald-100 text-emerald-700";
  if (pain <= 6) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function SessionTimelineStrip({
  patientId,
  maxItems = 6,
  onSeeAll,
  excludeId,
  onReplicate,
}: SessionTimelineStripProps) {
  const { data: rawRecords = [], isLoading } = useSoapRecords(
    patientId ?? "",
    maxItems + 1,
  );

  const records = useMemo(
    () => (excludeId ? rawRecords.filter((r) => r.id !== excludeId) : rawRecords).slice(0, maxItems),
    [rawRecords, excludeId, maxItems],
  );

  const items = useMemo(() => {
    return records.map((r, index) => {
      const date = new Date(r.record_date);
      const obs = stripHtml(r.observacao || "");
      const firstProcedure = r.procedures?.[0]?.name;
      const firstExercise = r.exercises?.[0]?.name;
      const conduct = firstProcedure || firstExercise || obs || "Sem registro de conduta";
      return {
        id: r.id,
        record: r,
        index: records.length - index,
        date,
        pain: r.pain_scale,
        conduct,
      };
    });
  }, [records]);

  if (!patientId) {
    return (
      <p className="text-xs text-slate-500 py-4">
        Salve a sessão para visualizar o histórico.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <FileText className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">Nenhuma sessão anterior</p>
        <p className="text-xs text-slate-400">As evoluções aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map((item) => (
          <article
            key={item.id}
            className="snap-start shrink-0 w-[240px] rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors p-3 flex flex-col gap-2"
          >
            <header className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Sessão #{item.index}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full",
                  painChipClasses(item.pain),
                )}
              >
                EVA {item.pain ?? "—"}
              </span>
            </header>
            <p className="text-[11px] text-slate-500">
              {format(item.date, "dd/MM • HH'h'mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-slate-700 line-clamp-2 leading-snug">
              {item.conduct}
            </p>
            {onReplicate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full text-[11px] mt-1 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                onClick={() => onReplicate(item.record)}
                title="Replicar esta sessão na evolução atual"
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Replicar
              </Button>
            )}
          </article>
        ))}
      </div>

      {onSeeAll && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-blue-700 hover:bg-blue-50"
            onClick={onSeeAll}
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
