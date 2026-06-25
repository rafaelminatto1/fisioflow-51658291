import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Copy,
  Dumbbell,
  ExternalLink,
  FileText,
  Home,
  Ruler,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSoapRecords, type SoapRecord } from "@/hooks/useSoapRecords";
import { usePendingSyncIds } from "@/hooks/usePendingSyncIds";
import { stripHtml } from "@/lib/utils/stripHtml";
import { cn } from "@/lib/utils";
import { normalizeIncomingEditorHtml } from "@/components/ui/richTextSync";

/* ─── Props ────────────────────────────────────────────────────────────── */
interface SessionTimelineStripProps {
  patientId?: string;
  maxItems?: number;
  onSeeAll?: () => void;
  /** Sessão atualmente em edição — não deve aparecer no histórico. */
  excludeId?: string;
  onReplicate?: (record: SoapRecord) => void;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function painBadgeClasses(pain: number | null | undefined): string {
  if (pain == null) return "bg-muted text-muted-foreground";
  if (pain === 0) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (pain <= 3) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (pain <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function SectionTitle({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px]">{count}</span>
        )}
      </span>
    </div>
  );
}

/* ─── Card de sessão ────────────────────────────────────────────────────── */
function SessionCard({
  item,
  isPending,
  onNavigate,
  onReplicate,
}: {
  item: {
    id: string;
    record: SoapRecord;
    index: number;
    date: Date;
    pain: number | null;
    conduct: string;
    procedureCount: number;
    exerciseCount: number;
  };
  isPending: boolean;
  onNavigate?: () => void;
  onReplicate?: () => void;
}) {
  const hasAppointment = Boolean(item.record.appointment_id);
  const [expanded, setExpanded] = useState(true);

  const record = item.record;
  const obsText = stripHtml(record.observacao || "");
  const obsHtml = DOMPurify.sanitize(normalizeIncomingEditorHtml(record.observacao || ""));
  const procedures = record.procedures ?? [];
  const exercises = record.exercises ?? [];
  const homeExercises = (record as any).home_exercises ?? [];
  const measurements = record.measurements ?? [];
  const hasContent =
    obsText ||
    procedures.length > 0 ||
    exercises.length > 0 ||
    homeExercises.length > 0 ||
    measurements.length > 0;

  return (
    <article className="group rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden">
      {/* Stripe colorida no topo baseada na dor */}
      <div
        className={cn(
          "h-0.5 w-full",
          item.pain == null
            ? "bg-muted"
            : item.pain <= 3
              ? "bg-emerald-400"
              : item.pain <= 6
                ? "bg-amber-400"
                : "bg-rose-400",
        )}
      />

      <div className="p-4">
        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[11px] font-extrabold">
              {item.index}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">Sessão #{item.index}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(item.date, "dd/MM/yyyy • HH'h'mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isPending && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                title="Aguardando sincronização"
              >
                <CloudOff className="h-2.5 w-2.5" />
                Pendente
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
                painBadgeClasses(item.pain),
              )}
            >
              {item.pain != null ? `EVA ${item.pain}` : "EVA —"}
            </span>
          </div>
        </div>

        {/* ── Conduta resumida ── */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {item.conduct}
        </p>

        {/* ── Chips de conteúdo ── */}
        {(item.procedureCount > 0 || item.exerciseCount > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.procedureCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Stethoscope className="h-3 w-3" />
                {item.procedureCount} procedimento{item.procedureCount !== 1 ? "s" : ""}
              </span>
            )}
            {item.exerciseCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Dumbbell className="h-3 w-3" />
                {item.exerciseCount} exercício{item.exerciseCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── Conteúdo completo (expansível) ── */}
        {hasContent && (
          <div className="border-t border-border pt-3 mt-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Detalhes da sessão</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {expanded && (
              <div className="flex flex-col gap-4">
                {/* Observações clínicas */}
                {obsText && (
                  <section>
                    <SectionTitle icon={FileText} label="Observações clínicas" />
                    <div
                      className="rounded-xl bg-muted/40 border border-border p-3 text-sm text-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal"
                      dangerouslySetInnerHTML={{ __html: obsHtml }}
                    />
                  </section>
                )}

                {/* Procedimentos */}
                {procedures.length > 0 && (
                  <section>
                    <SectionTitle icon={Stethoscope} label="Procedimentos" count={procedures.length} />
                    <ul className="flex flex-col gap-1.5">
                      {procedures.map((p: any, i: number) => (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="flex-1 text-sm font-medium text-foreground">{p.name}</span>
                          {p.quantity && (
                            <span className="text-xs font-semibold text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
                              {p.quantity}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Exercícios clínicos */}
                {exercises.length > 0 && (
                  <section>
                    <SectionTitle icon={Dumbbell} label="Exercícios" count={exercises.length} />
                    <ul className="flex flex-col gap-1.5">
                      {exercises.map((e: any, i: number) => (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span className="flex-1 text-sm font-medium text-foreground">{e.name}</span>
                          {(e.sets || e.reps) && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                              {[e.sets && `${e.sets}×`, e.reps && `${e.reps} reps`]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Exercícios domiciliares */}
                {homeExercises.length > 0 && (
                  <section>
                    <SectionTitle
                      icon={Home}
                      label="Exercícios domiciliares"
                      count={homeExercises.length}
                    />
                    <ul className="flex flex-col gap-1.5">
                      {homeExercises.map((h: any, i: number) => (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 rounded-xl border border-orange-200/60 bg-orange-50/50 px-3 py-2"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                          <span className="text-sm font-medium text-foreground">
                            {h.name || h.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Medições */}
                {measurements.length > 0 && (
                  <section>
                    <SectionTitle icon={Ruler} label="Medições" count={measurements.length} />
                    <div className="grid grid-cols-2 gap-2">
                      {measurements.map((m: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-muted/30 px-3 py-2 flex flex-col gap-0.5"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                            {m.measurement_name || m.measurement_type || "Medição"}
                          </span>
                          <span className="text-base font-extrabold text-foreground">
                            {m.value}
                            {m.unit ? (
                              <span className="text-sm font-normal text-muted-foreground ml-1">
                                {m.unit}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Botões de ação ── */}
        <div className="flex gap-2 mt-3">
          {/* Ver sessão */}
          {hasAppointment && onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl border border-border bg-background text-[11px] font-bold text-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
              title="Abrir esta sessão"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver sessão
            </button>
          )}

          {/* Replicar */}
          {onReplicate && (
            <button
              type="button"
              onClick={onReplicate}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl border border-border bg-background text-[11px] font-bold text-foreground hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
              title="Replicar esta sessão na evolução atual"
            >
              <Copy className="h-3.5 w-3.5" />
              Replicar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Componente principal ──────────────────────────────────────────────── */
export function SessionTimelineStrip({
  patientId,
  maxItems = 6,
  onSeeAll,
  excludeId,
  onReplicate,
}: SessionTimelineStripProps) {
  const navigate = useNavigate();
  const { data: rawRecords = [], isLoading } = useSoapRecords(patientId ?? "", maxItems + 1);
  const pendingSessionIds = usePendingSyncIds("sessions");

  const records = useMemo(
    () =>
      (excludeId ? rawRecords.filter((r) => r.id !== excludeId) : rawRecords).slice(0, maxItems),
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
        procedureCount: r.procedures?.length ?? 0,
        exerciseCount: r.exercises?.length ?? 0,
      };
    });
  }, [records]);

  /* ── Estados de carregamento ── */
  if (!patientId) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Salve a sessão para visualizar o histórico.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[130px] rounded-2xl border border-border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Nenhuma sessão anterior</p>
        <p className="text-xs text-muted-foreground/60">As evoluções aparecerão aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <SessionCard
            key={item.id}
            item={item}
            isPending={pendingSessionIds.has(item.id)}
            onNavigate={
              item.record.appointment_id
                ? () => navigate(`/patient-evolution/${item.record.appointment_id}`)
                : undefined
            }
            onReplicate={onReplicate ? () => onReplicate(item.record) : undefined}
          />
        ))}

        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent py-3 text-sm font-bold text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
          >
            Ver todas as sessões
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
}
