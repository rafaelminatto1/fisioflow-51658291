/**
 * FisioFlow — Avaliação Inicial / Anamnese
 * Recriação fiel do protótipo `ui_kits/web/avaliacao-inicial.html` do
 * FisioFlow Design System, montada no shell autenticado via MainLayout.
 * @module pages/AvaliacaoInicial
 */

import type { ReactNode } from "react";
import { Check, CheckCircle2, ChevronRight, Plus, Printer } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

const ic = (Icon: typeof Check, size = 13) => <Icon style={{ width: size, height: size }} />;

const SECTIONS = [
  { label: "Identificação", state: "done" as const },
  { label: "Queixa & HMA", state: "active" as const },
  { label: "Antecedentes", state: "todo" as const },
  { label: "Inspeção & dor", state: "todo" as const },
  { label: "ADM & força", state: "todo" as const },
  { label: "Testes especiais", state: "todo" as const },
  { label: "Hipótese & plano", state: "todo" as const },
];

const GONIO_ROWS = [
  { move: "Flexão de joelho", dir: "118", esq: "138", ref: "135°", forca: "4 / 5" },
  { move: "Extensão de joelho", dir: "0", esq: "0", ref: "0°", forca: "4 / 5" },
  { move: "Dorsiflexão tornozelo", dir: "18", esq: "22", ref: "20°", forca: "5 / 5" },
  { move: "Abdução de quadril", dir: "32", esq: "40", ref: "45°", forca: "3 / 4" },
];

const SPECIAL_TESTS = [
  {
    name: "Compressão patelar (Clarke)",
    meta: "Condromalácia / dor patelofemoral",
    result: "pos" as const,
  },
  { name: "Teste de apreensão patelar", meta: "Instabilidade patelar", result: "neg" as const },
  { name: "Step-down test", meta: "Controle do valgo dinâmico", result: "pos" as const },
  { name: "Gaveta anterior", meta: "Integridade do LCA", result: "neg" as const },
];

const OBJECTIVES = [
  { label: "Reduzir dor para EVA < 3 em 8 semanas", done: true },
  { label: "Restaurar ROM de flexão ≥ 130°", done: true },
  { label: "Corrigir valgo dinâmico no agachamento", done: false },
  { label: "Fortalecer glúteo médio (MMT 5)", done: false },
];

const INPUT =
  "w-full box-border rounded-[10px] border border-border bg-card px-3.5 py-2.5 font-sans text-[13px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
      {children}
    </label>
  );
}

function SelChip({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "on" | "warn" | "add";
}) {
  const base =
    "cursor-pointer rounded-full border px-3.5 py-[7px] text-xs font-bold";
  const styles =
    variant === "on"
      ? "border-primary bg-primary text-white"
      : variant === "warn"
        ? "border-[hsl(28_85%_50%)] bg-[hsl(28_85%_50%)] text-white"
        : variant === "add"
          ? "border-border bg-card text-primary"
          : "border-border bg-card text-muted-foreground";
  return <span className={`${base} ${styles}`}>{children}</span>;
}

function SectionHeading({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="mb-1 flex items-center gap-2.5 text-base font-extrabold tracking-[-0.01em]">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/[0.12] text-[13px] text-primary">
        {n}
      </span>
      {children}
    </h2>
  );
}

export default function AvaliacaoInicial() {
  return (
    <MainLayout fullWidth noPadding hideDefaultHeader showBreadcrumbs={false}>
      <div className="flex h-[calc(100dvh-3rem)] min-h-[600px] flex-col bg-background font-sans text-foreground">
        {/* Topbar */}
        <div className="flex items-center gap-3.5 border-b border-border px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            Pacientes {ic(ChevronRight, 14)} Marina Alves {ic(ChevronRight, 14)}{" "}
            <strong className="font-extrabold text-foreground">Avaliação inicial</strong>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[hsl(158_60%_38%)]">
            {ic(CheckCircle2, 13)} Rascunho salvo · 09:58
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
              {ic(Printer, 15)} Imprimir
            </button>
            <button className="flex items-center gap-1.5 rounded-[10px] border border-primary bg-primary px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_0_0_4px_hsl(211_100%_50%/0.15)]">
              {ic(Check, 15)} Finalizar avaliação
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[196px_1fr_290px]">
          {/* Section nav */}
          <div className="overflow-y-auto border-r border-border bg-muted/25 px-3 py-[18px]">
            <div className="mb-3 flex items-center gap-2.5 border-b border-border px-1.5 pb-3.5">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br from-[hsl(264_55%_62%)] to-[hsl(264_55%_48%)] text-[13px] font-extrabold text-white">
                MA
              </div>
              <div>
                <div className="text-[13px] font-extrabold">Marina Alves</div>
                <div className="text-[10px] font-semibold text-muted-foreground">
                  34 anos · 1ª consulta
                </div>
              </div>
            </div>
            {SECTIONS.map((s) => {
              const active = s.state === "active";
              const done = s.state === "done";
              return (
                <div
                  key={s.label}
                  className={`mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-xs font-bold ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card"
                  }`}
                >
                  <span
                    className={`h-[7px] w-[7px] flex-shrink-0 rounded-full border-2 ${
                      done
                        ? "border-[hsl(142_60%_42%)] bg-[hsl(142_60%_42%)]"
                        : active
                          ? "border-primary"
                          : "border-border"
                    }`}
                  />
                  {s.label}
                </div>
              );
            })}
          </div>

          {/* Form */}
          <div className="overflow-y-auto px-[26px] py-[22px]">
            <section className="mb-[26px]">
              <SectionHeading n="2">Queixa principal &amp; HMA</SectionHeading>
              <p className="mb-3.5 ml-[33px] text-xs font-medium text-muted-foreground">
                História da moléstia atual — em primeira pessoa sempre que possível.
              </p>
              <div className="mb-3.5">
                <FieldLabel>Queixa principal</FieldLabel>
                <input
                  className={`${INPUT} border-primary/35`}
                  defaultValue="Dor anterior no joelho direito ao agachar e descer escadas"
                />
              </div>
              <div className="mb-3.5">
                <FieldLabel>História da moléstia atual</FieldLabel>
                <textarea
                  rows={3}
                  className={`${INPUT} resize-none border-primary/35 leading-normal`}
                  defaultValue="Início há ~4 meses, insidioso, sem trauma. Piora com agachamento, escadas e após corrida. Refere “estalos” e sensação de fraqueza. Nega bloqueio articular ou edema importante."
                />
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <FieldLabel>Início</FieldLabel>
                  <input className={`${INPUT} border-primary/35`} defaultValue="Há 4 meses" />
                </div>
                <div>
                  <FieldLabel>Evolução</FieldLabel>
                  <input className={INPUT} placeholder="Progressiva / estável…" />
                </div>
                <div>
                  <FieldLabel>Lado acometido</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    <SelChip>Esq</SelChip>
                    <SelChip variant="on">Dir</SelChip>
                    <SelChip>Bilat</SelChip>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <FieldLabel>Fatores de piora</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  <SelChip variant="warn">Agachar</SelChip>
                  <SelChip variant="warn">Escadas</SelChip>
                  <SelChip variant="warn">Corrida</SelChip>
                  <SelChip>Sentar prolongado</SelChip>
                  <SelChip>Repouso</SelChip>
                  <SelChip variant="add">+ adicionar</SelChip>
                </div>
              </div>
            </section>

            <section className="mb-[26px]">
              <SectionHeading n="4">Inspeção, palpação &amp; dor</SectionHeading>
              <p className="mb-3.5 ml-[33px] text-xs font-medium text-muted-foreground">
                Achados da observação e da escala de dor (EVA).
              </p>
              <div className="mb-3.5">
                <FieldLabel>Inspeção</FieldLabel>
                <textarea
                  rows={2}
                  className={`${INPUT} resize-none border-primary/35 leading-normal`}
                  defaultValue="Sem edema visível. Discreta hipotrofia de quadríceps à direita. Alinhamento em leve valgo dinâmico ao agachar."
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel>Palpação dolorosa</FieldLabel>
                  <input
                    className={`${INPUT} border-primary/35`}
                    defaultValue="Faceta patelar medial (D), retináculo lateral"
                  />
                </div>
                <div>
                  <FieldLabel>Edema</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    <SelChip variant="on">Ausente</SelChip>
                    <SelChip>Leve</SelChip>
                    <SelChip>Moderado</SelChip>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-[26px]">
              <SectionHeading n="5">ADM &amp; força (goniometria / MMT)</SectionHeading>
              <p className="mb-3.5 ml-[33px] text-xs font-medium text-muted-foreground">
                Amplitude de movimento ativa e força muscular manual — comparativo D/E.
              </p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {["Movimento", "Dir (°)", "Esq (°)", "Ref.", "Força D/E"].map((h, i) => (
                      <th
                        key={h}
                        className={`border-b border-border px-2.5 py-[7px] text-[10px] font-extrabold uppercase tracking-[0.04em] text-muted-foreground ${
                          i === 0 ? "text-left" : "text-center"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GONIO_ROWS.map((r) => (
                    <tr key={r.move}>
                      <td className="border-b border-border/60 px-2.5 py-1.5 font-bold">{r.move}</td>
                      <td className="border-b border-border/60 px-2.5 py-1.5 text-center">
                        <input
                          className="w-[58px] rounded-lg border border-border bg-card px-2 py-1.5 text-center font-sans text-xs font-bold tabular-nums text-foreground"
                          defaultValue={r.dir}
                        />
                      </td>
                      <td className="border-b border-border/60 px-2.5 py-1.5 text-center">
                        <input
                          className="w-[58px] rounded-lg border border-border bg-card px-2 py-1.5 text-center font-sans text-xs font-bold tabular-nums text-foreground"
                          defaultValue={r.esq}
                        />
                      </td>
                      <td className="border-b border-border/60 px-2.5 py-1.5 text-center font-semibold text-muted-foreground">
                        {r.ref}
                      </td>
                      <td className="border-b border-border/60 px-2.5 py-1.5 text-center font-semibold text-muted-foreground">
                        {r.forca}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-[26px]">
              <SectionHeading n="6">Testes especiais</SectionHeading>
              <p className="mb-3.5 ml-[33px] text-xs font-medium text-muted-foreground">
                Marque o resultado de cada teste ortopédico aplicado.
              </p>
              {SPECIAL_TESTS.map((t) => (
                <div
                  key={t.name}
                  className="mb-2 flex items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-[13px] font-bold">{t.name}</div>
                    <div className="text-[11px] font-semibold text-muted-foreground">{t.meta}</div>
                  </div>
                  <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
                    <span
                      className={`cursor-pointer px-3.5 py-1.5 text-[11px] font-extrabold ${
                        t.result === "pos"
                          ? "bg-[hsl(0_80%_50%)] text-white"
                          : "text-[hsl(0_70%_45%)]"
                      }`}
                    >
                      +
                    </span>
                    <span
                      className={`cursor-pointer px-3.5 py-1.5 text-[11px] font-extrabold ${
                        t.result === "neg"
                          ? "bg-[hsl(142_60%_42%)] text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      −
                    </span>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* Summary */}
          <div className="overflow-y-auto border-l border-border bg-muted/30 px-[18px] py-5">
            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
              Escala de dor (EVA)
            </h3>
            <div className="mb-4 rounded-[14px] border border-border bg-card p-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[hsl(0_72%_48%)]">
                  6
                </span>
                <span className="text-sm font-bold text-muted-foreground">/ 10 · pico</span>
              </div>
              <div className="mt-3 flex gap-[3px]">
                {[
                  "hsl(142 60% 55%)",
                  "hsl(110 55% 55%)",
                  "hsl(80 60% 55%)",
                  "hsl(55 80% 55%)",
                  "hsl(45 90% 55%)",
                  "hsl(32 90% 55%)",
                  "hsl(20 85% 55%)",
                  "hsl(10 80% 52%)",
                  "hsl(0 75% 50%)",
                  "hsl(0 70% 42%)",
                ].map((color, i) => (
                  <span
                    key={color}
                    className="h-6 flex-1 cursor-pointer rounded"
                    style={{
                      background: color,
                      opacity: i > 5 ? 0.3 : 1,
                      boxShadow:
                        i === 5
                          ? "0 0 0 2px hsl(0 0% 100%), 0 0 0 4px hsl(32 90% 45%)"
                          : undefined,
                    }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] font-bold text-muted-foreground">
                <span>0 · sem dor</span>
                <span>10 · máxima</span>
              </div>
            </div>

            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
              Mapa de dor
            </h3>
            <div className="mb-4 rounded-[14px] border border-border bg-card p-3.5">
              <div className="relative flex justify-center py-1.5">
                <svg
                  viewBox="0 0 100 200"
                  fill="none"
                  stroke="hsl(220 12% 70%)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-40"
                >
                  <circle cx="50" cy="20" r="11" fill="hsl(220 14% 92%)" />
                  <path d="M50 31 L50 95" strokeWidth="14" stroke="hsl(220 14% 92%)" />
                  <path d="M42 42 L26 78" stroke="hsl(220 14% 88%)" />
                  <path d="M58 42 L74 78" stroke="hsl(220 14% 88%)" />
                  <path d="M44 95 L40 165" strokeWidth="9" stroke="hsl(220 14% 90%)" />
                  <path d="M56 95 L60 165" strokeWidth="9" stroke="hsl(220 14% 90%)" />
                </svg>
                <span
                  className="absolute h-[18px] w-[18px] rounded-full border-2 border-[hsl(0_80%_50%)] bg-[hsl(0_80%_55%/0.35)]"
                  style={{ right: 30, top: 108 }}
                />
              </div>
              <div className="text-center text-[11px] font-semibold text-muted-foreground">
                Joelho anterior (D) · toque para marcar
              </div>
            </div>

            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
              Hipótese diagnóstica
            </h3>
            <div className="mb-4 rounded-[14px] border border-border bg-card p-3.5">
              <input
                className={`${INPUT} mb-2 border-primary/35`}
                defaultValue="Síndrome da dor patelofemoral (D)"
              />
              <div className="flex flex-wrap gap-1.5">
                <span className="cursor-pointer rounded-full border border-primary bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
                  Condromalácia G2
                </span>
                <span className="cursor-pointer rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-primary">
                  + CID
                </span>
              </div>
            </div>

            <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
              Objetivos do tratamento
            </h3>
            <div className="rounded-[14px] border border-border bg-card p-3.5">
              <div className="flex flex-col gap-2">
                {OBJECTIVES.map((o) => (
                  <div key={o.label} className="flex items-start gap-2 text-xs font-semibold">
                    <span
                      className={`mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border-2 border-primary text-white ${
                        o.done ? "bg-primary" : ""
                      }`}
                    >
                      {o.done ? ic(Check, 11) : null}
                    </span>
                    {o.label}
                  </div>
                ))}
                <span className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary">
                  {ic(Plus, 14)} Adicionar objetivo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
