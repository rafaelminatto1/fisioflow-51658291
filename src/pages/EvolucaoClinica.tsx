/**
 * FisioFlow — Evolução Clínica (prontuário em timeline, sem SOAP)
 * Recriação fiel do protótipo `ui_kits/web/evolucao-clinica.html` do
 * FisioFlow Design System, montada no shell autenticado via MainLayout.
 * @module pages/EvolucaoClinica
 */

import type { ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  GitCompare,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Video,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

type EntryKind = "sess" | "tele" | "eval";
type NodeTone = "primary" | "green" | "amber" | "gray";

interface Metric {
  label: string;
  value: string;
  pain?: "high" | "low";
}

interface Attachment {
  label: string;
  icon: ReactNode;
  bio?: boolean;
}

interface TimelineEntry {
  day: string;
  node: NodeTone;
  nodeIcon: ReactNode;
  badge: { kind: EntryKind; text: string };
  title: string;
  time: string;
  body: ReactNode;
  metrics: Metric[];
  attachments?: Attachment[];
}

const ic = (Icon: typeof Activity, size = 13) => <Icon style={{ width: size, height: size }} />;

const BADGE_STYLES: Record<EntryKind, string> = {
  sess: "bg-[hsl(211_100%_95%)] text-[hsl(211_100%_35%)]",
  tele: "bg-[hsl(158_64%_92%)] text-[hsl(158_64%_28%)]",
  eval: "bg-[hsl(264_60%_94%)] text-[hsl(264_50%_40%)]",
};

const NODE_STYLES: Record<NodeTone, string> = {
  primary: "border-primary text-primary",
  green: "border-[hsl(158_64%_42%)] text-[hsl(158_64%_42%)]",
  amber: "border-[hsl(35_92%_50%)] text-[hsl(35_92%_45%)]",
  gray: "border-[hsl(220_9%_60%)] text-[hsl(220_9%_55%)]",
};

const TIMELINE: TimelineEntry[] = [
  {
    day: "Hoje · 12 mai 2026",
    node: "primary",
    nodeIcon: ic(Stethoscope, 11),
    badge: { kind: "sess", text: "SESSÃO 12" },
    title: "Cinesioterapia + reavaliação biomecânica",
    time: "14:30 · 50 min",
    body: (
      <>
        Paciente refere melhora progressiva da dor anterior no joelho direito.{" "}
        <strong className="font-bold">
          Agachamento até 90° sem pinçada patelar até a 8ª repetição.
        </strong>{" "}
        Reavaliação biomecânica do agachamento mostra ganho de ROM (78°→118° em 8 semanas) e redução
        da inclinação de tronco. Persiste valgo dinâmico moderado à direita (+14°) — mantida ênfase
        em fortalecimento de glúteo médio e controle excêntrico.
      </>
    ),
    metrics: [
      { label: "Dor pico", value: "3/10", pain: "low" },
      { label: "ROM joelho", value: "118°" },
      { label: "Simetria", value: "84%" },
      { label: "Carga", value: "12kg" },
    ],
    attachments: [
      { label: "Análise biomecânica", icon: ic(Video), bio: true },
      { label: "Comparar S03 ↔ S12", icon: ic(GitCompare) },
    ],
  },
  {
    day: "8 mai 2026",
    node: "green",
    nodeIcon: ic(Dumbbell, 11),
    badge: { kind: "sess", text: "SESSÃO 11" },
    title: "Fortalecimento progressivo",
    time: "15:00 · 50 min",
    body: (
      <>
        Progredida carga do leg press (10→12kg) e agachamento isométrico (30s→45s). Boa ativação de
        quadríceps e glúteo médio. Sem queixa álgica durante a execução; leve desconforto ao final
        da série de step-down.
      </>
    ),
    metrics: [
      { label: "Dor pico", value: "3/10", pain: "low" },
      { label: "ROM joelho", value: "114°" },
      { label: "Adesão sem.", value: "100%" },
    ],
    attachments: [{ label: "Plano de exercícios.pdf", icon: ic(Paperclip) }],
  },
  {
    day: "30 abr 2026",
    node: "amber",
    nodeIcon: ic(MessageSquare, 11),
    badge: { kind: "tele", text: "TELE-RETORNO" },
    title: "Acompanhamento remoto",
    time: "18:20 · 15 min",
    body: (
      <>
        Contato por vídeo. Paciente relatou pico de dor (5/10) após caminhada longa no fim de
        semana. Orientado gelo e ajuste de volume nos exercícios domiciliares. Mantida conduta;
        reforçada importância de respeitar a progressão.
      </>
    ),
    metrics: [
      { label: "Dor relatada", value: "5/10", pain: "high" },
      { label: "Adesão sem.", value: "75%" },
    ],
  },
  {
    day: "17 mar 2026",
    node: "gray",
    nodeIcon: ic(ClipboardList, 11),
    badge: { kind: "eval", text: "AVALIAÇÃO INICIAL" },
    title: "Anamnese + exame físico",
    time: "09:00 · 60 min",
    body: (
      <>
        Quadro de dor anterior no joelho direito há ~4 meses, agravada por agachar e descer escadas.
        Exame: teste de compressão patelar positivo, ADM ativa limitada por dor a 78° de flexão sob
        carga, valgo dinâmico acentuado no agachamento. Definido protocolo de reabilitação de 20
        sessões com ênfase em controle motor.
      </>
    ),
    metrics: [
      { label: "Dor pico", value: "6/10", pain: "high" },
      { label: "ROM joelho", value: "78°" },
      { label: "Simetria", value: "71%" },
    ],
    attachments: [
      { label: "Baseline biomecânico", icon: ic(Video), bio: true },
      { label: "Ficha de avaliação.pdf", icon: ic(FileText) },
    ],
  },
];

const TABS = [
  "Resumo",
  "Evolução clínica",
  "Agendamentos",
  "Protocolo",
  "Avaliações",
  "Documentos",
];

function MetricsStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="flex min-w-[64px] flex-col gap-px rounded-[10px] bg-muted/60 px-[11px] py-[7px]"
        >
          <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-muted-foreground">
            {m.label}
          </span>
          <span
            className="text-[15px] font-extrabold tabular-nums"
            style={{
              color:
                m.pain === "high"
                  ? "hsl(0 70% 45%)"
                  : m.pain === "low"
                    ? "hsl(158 64% 32%)"
                    : undefined,
            }}
          >
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <>
      <div className="my-3 flex items-center gap-[10px]">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
          {entry.day}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="relative pl-[30px]">
        <span className="absolute left-[9px] top-[6px] bottom-[6px] w-[2px] bg-border" />
        <div className="relative mb-4">
          <div
            className={`absolute -left-[29px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-card ${NODE_STYLES[entry.node]}`}
          >
            {entry.nodeIcon}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="mb-[10px] flex items-center gap-[10px]">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] ${BADGE_STYLES[entry.badge.kind]}`}
              >
                {entry.badge.text}
              </span>
              <span className="text-sm font-extrabold">{entry.title}</span>
              <span className="ml-auto text-[11px] font-bold tabular-nums text-muted-foreground">
                {entry.time}
              </span>
            </div>
            <div className="text-[13px] leading-[1.55] text-foreground">{entry.body}</div>
            <MetricsStrip metrics={entry.metrics} />
            <div className="mt-3 flex items-center gap-1.5">
              {entry.attachments?.map((a) => (
                <span
                  key={a.label}
                  className={`flex cursor-pointer items-center gap-[5px] rounded-lg px-[10px] py-[5px] text-[11px] font-bold ${
                    a.bio
                      ? "bg-[hsl(211_100%_95%)] text-[hsl(211_100%_35%)]"
                      : "bg-muted/60 text-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {a.icon}
                  {a.label}
                </span>
              ))}
              <div className="ml-auto flex gap-1">
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                  {ic(Pencil, 14)}
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                  {ic(MoreHorizontal, 14)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h4 className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

const GOALS = [
  { label: "ROM ≥ 120°", pct: 98, green: true },
  { label: "Dor < 3/10 sustentada", pct: 70, green: false },
  { label: "Valgo dinâmico < 8°", pct: 45, green: false },
  { label: "Simetria ≥ 90%", pct: 62, green: false },
];

export default function EvolucaoClinica() {
  return (
    <MainLayout fullWidth noPadding hideDefaultHeader showBreadcrumbs={false}>
      <div className="flex h-[calc(100dvh-3rem)] min-h-[600px] flex-col bg-background font-sans text-foreground">
        {/* Patient header */}
        <div className="px-6 pt-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(211_100%_60%)] to-[hsl(211_100%_40%)] text-[19px] font-extrabold text-white">
              CF
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Carla Ferreira</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span>34 anos · ♀</span>
                <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground" />
                <span>Início em 17/03/2026</span>
                <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground" />
                <span>Convênio: Unimed</span>
                <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground" />
                <span>CPF 342.118.***-09</span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(28_92%_95%)] px-2.5 py-1 text-[11px] font-bold text-[hsl(25_70%_30%)]">
                  {ic(Activity, 12)} Condromalácia patelar G2
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(211_100%_95%)] px-2.5 py-1 text-[11px] font-bold text-[hsl(211_100%_30%)]">
                  {ic(ClipboardList, 12)} Reabilitação joelho · sessão 12/20
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(158_64%_92%)] px-2.5 py-1 text-[11px] font-bold text-[hsl(158_64%_25%)]">
                  {ic(CheckCircle2, 12)} Adesão 88%
                </span>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="flex items-center gap-1.5 rounded-[10px] border border-transparent bg-transparent px-3.5 py-2 text-[13px] font-bold text-foreground">
                {ic(Printer, 14)}
              </button>
              <button className="flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2 text-[13px] font-bold text-foreground">
                {ic(Paperclip, 14)} Anexar
              </button>
              <button className="flex items-center gap-1.5 rounded-[10px] border border-primary bg-primary px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_0_0_4px_hsl(211_100%_50%/0.15)]">
                {ic(Plus, 14)} Nova evolução
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-6 pt-4">
          {TABS.map((t) => {
            const active = t === "Evolução clínica";
            return (
              <span
                key={t}
                className={`-mb-px cursor-pointer border-b-2 px-3.5 py-2.5 text-[13px] font-bold ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {t}
              </span>
            );
          })}
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px]">
          {/* Timeline */}
          <div className="overflow-y-auto px-6 py-5">
            {/* Composer */}
            <div className="mb-5 rounded-2xl border border-border bg-card px-4 py-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[hsl(211_100%_92%)] text-[11px] font-extrabold text-[hsl(211_100%_30%)]">
                  RM
                </div>
                <div className="flex-1 text-[13px] font-medium text-muted-foreground">
                  Registrar evolução da sessão de hoje…
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { icon: ic(Activity), label: "Dor (VAS)" },
                  { icon: ic(TrendingUp), label: "ROM" },
                  { icon: ic(Dumbbell), label: "Condutas" },
                  { icon: ic(Video), label: "Anexar vídeo" },
                ].map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    {c.icon}
                    {c.label}
                  </span>
                ))}
                <span className="flex-1" />
                <button className="rounded-[10px] border border-primary bg-primary px-3.5 py-[7px] text-[13px] font-bold text-white shadow-[0_0_0_4px_hsl(211_100%_50%/0.15)]">
                  Publicar
                </button>
              </div>
            </div>

            {TIMELINE.map((entry) => (
              <TimelineCard key={entry.title} entry={entry} />
            ))}
          </div>

          {/* Side */}
          <div className="flex flex-col gap-[18px] overflow-y-auto border-l border-border bg-muted/30 p-[18px]">
            <Widget title="Dor (VAS) — evolução">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[28px] font-extrabold tabular-nums tracking-[-0.02em]">
                  3<small className="text-sm font-bold text-muted-foreground">/10</small>
                </span>
                <span className="flex items-center gap-1 text-xs font-extrabold text-[hsl(158_64%_35%)]">
                  {ic(TrendingDown)} −3 em 8 sem
                </span>
              </div>
              <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="h-[90px] w-full">
                <g stroke="hsl(220 13% 91%)" strokeWidth="1">
                  <line x1="0" y1="15" x2="300" y2="15" />
                  <line x1="0" y1="45" x2="300" y2="45" />
                  <line x1="0" y1="75" x2="300" y2="75" />
                </g>
                <path
                  d="M 8 24 L 55 24 L 102 38 L 150 30 L 198 52 L 246 60 L 292 66"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 8 24 L 55 24 L 102 38 L 150 30 L 198 52 L 246 60 L 292 66 L 292 88 L 8 88 Z"
                  fill="hsl(var(--primary) / 0.08)"
                  stroke="none"
                />
                <circle cx="8" cy="24" r="3.5" fill="hsl(0 70% 50%)" />
                <circle cx="292" cy="66" r="3.5" fill="hsl(158 64% 42%)" />
              </svg>
            </Widget>

            <Widget title="Indicadores">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em]">
                    +40°
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">ROM joelho</div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-[hsl(158_64%_35%)]">
                    {ic(TrendingUp, 12)} 78°→118°
                  </div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em]">
                    88%
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    Adesão protocolo
                  </div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-[hsl(158_64%_35%)]">
                    {ic(TrendingUp, 12)} +9 p.p.
                  </div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em]">
                    12
                    <span className="text-[15px] text-muted-foreground">/20</span>
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">Sessões</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    8 restantes
                  </div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em]">
                    84%
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    Simetria L/R
                  </div>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-[hsl(158_64%_35%)]">
                    {ic(TrendingUp, 12)} +13 p.p.
                  </div>
                </div>
              </div>
            </Widget>

            <Widget title="Metas do protocolo">
              <div>
                {GOALS.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span>{g.label}</span>
                      <span className="font-bold">{g.pct}%</span>
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${g.green ? "bg-[hsl(158_64%_45%)]" : "bg-primary"}`}
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Widget>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
