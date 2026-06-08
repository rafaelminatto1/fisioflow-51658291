/**
 * FisioFlow — CRM · WhatsApp (inbox unificado em 3 colunas)
 * Recriação fiel do protótipo `ui_kits/web/crm-whatsapp.html` do
 * FisioFlow Design System, montada no shell autenticado via MainLayout.
 * @module pages/CrmWhatsApp
 */

import type { ReactNode } from "react";
import {
  Bell,
  CalendarPlus,
  Camera,
  CheckCheck,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  MapPin,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Sparkles,
  StickyNote,
  UserPlus,
  Zap,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

const ic = (Icon: typeof Bell, size = 13, style?: React.CSSProperties) => (
  <Icon style={{ width: size, height: size, ...style }} />
);

type Stage = "lead" | "wait" | "eval" | "treat" | "done";

const STAGE_META: Record<Stage, { label: string; chip: string; dot: string }> = {
  lead: {
    label: "NOVO LEAD",
    chip: "bg-[hsl(264_60%_94%)] text-[hsl(264_50%_42%)]",
    dot: "hsl(264 50% 50%)",
  },
  wait: {
    label: "AGUARDANDO",
    chip: "bg-[hsl(28_92%_93%)] text-[hsl(25_70%_34%)]",
    dot: "hsl(28 70% 48%)",
  },
  eval: {
    label: "AVALIAÇÃO AGENDADA",
    chip: "bg-[hsl(211_100%_93%)] text-[hsl(211_100%_35%)]",
    dot: "hsl(211 100% 50%)",
  },
  treat: {
    label: "EM TRATAMENTO",
    chip: "bg-[hsl(142_60%_92%)] text-[hsl(142_55%_28%)]",
    dot: "hsl(142 55% 40%)",
  },
  done: {
    label: "ALTA",
    chip: "bg-[hsl(220_14%_92%)] text-[hsl(220_9%_38%)]",
    dot: "hsl(220 9% 50%)",
  },
};

interface Conv {
  initials: string;
  avatar: string;
  name: string;
  time: string;
  preview: ReactNode;
  unread?: number;
  stage: Stage;
  active?: boolean;
}

const CONVERSATIONS: Conv[] = [
  {
    initials: "MA",
    avatar: "linear-gradient(135deg,hsl(264 55% 62%),hsl(264 55% 48%))",
    name: "Marina Alves",
    time: "09:42",
    preview: "Bom dia! Gostaria de saber o valor da avaliação",
    unread: 2,
    stage: "lead",
    active: true,
  },
  {
    initials: "CF",
    avatar: "linear-gradient(135deg,hsl(211 100% 60%),hsl(211 100% 42%))",
    name: "Carla Ferreira",
    time: "09:15",
    preview: (
      <>
        {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Perfeito, confirmado para amanhã 14h
      </>
    ),
    stage: "treat",
  },
  {
    initials: "RS",
    avatar: "linear-gradient(135deg,hsl(28 85% 58%),hsl(28 85% 46%))",
    name: "Rafael Souza",
    time: "08:50",
    preview: "Posso remarcar para sexta?",
    unread: 1,
    stage: "wait",
  },
  {
    initials: "JP",
    avatar: "linear-gradient(135deg,hsl(340 70% 60%),hsl(340 70% 48%))",
    name: "Juliana Pires",
    time: "ontem",
    preview: (
      <>
        {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Obrigada, doutor! Até quinta 🙏
      </>
    ),
    stage: "eval",
  },
  {
    initials: "ET",
    avatar: "linear-gradient(135deg,hsl(180 50% 48%),hsl(180 50% 36%))",
    name: "Eduardo Tavares",
    time: "ontem",
    preview: "Vi vocês no Instagram, atendem joelho?",
    unread: 3,
    stage: "lead",
  },
  {
    initials: "LM",
    avatar: "linear-gradient(135deg,hsl(142 50% 50%),hsl(142 50% 38%))",
    name: "Lucas Martins",
    time: "ter",
    preview: (
      <>
        {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Enviei o plano de exercícios 📎
      </>
    ),
    stage: "treat",
  },
  {
    initials: "BC",
    avatar: "linear-gradient(135deg,hsl(220 12% 58%),hsl(220 12% 44%))",
    name: "Beatriz Campos",
    time: "seg",
    preview: (
      <>
        {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Tratamento concluído. Cuide-se!
      </>
    ),
    stage: "done",
  },
];

const PIPELINE = [
  { label: "Todos", n: 23, active: true },
  { label: "Novos leads", n: 7 },
  { label: "Aguardando", n: 5 },
  { label: "Avaliação", n: 4 },
  { label: "Em tratamento", n: 7 },
];

const QUICK_REPLIES = [
  { icon: ic(Zap, 12), label: "Horários disponíveis", tmpl: true },
  { icon: ic(MapPin, 12), label: "Endereço" },
  { icon: ic(FileText, 12), label: "Tabela de valores" },
  { icon: ic(CalendarPlus, 12), label: "Agendar avaliação" },
];

const LEAD_DETAILS = [
  {
    k: "Origem",
    v: (
      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(142_60%_92%)] px-2 py-0.5 text-[11px] font-bold text-[hsl(142_55%_28%)]">
        {ic(Camera, 11)} Instagram Ads
      </span>
    ),
  },
  { k: "Campanha", v: "Dor no joelho" },
  { k: "Convênio", v: "Unimed" },
  { k: "Interesse", v: "Joelho · avaliação" },
  { k: "Primeiro contato", v: "Hoje, 09:41" },
  { k: "Responsável", v: "Dr. Rafael M." },
];

function IconBtn({ children }: { children: ReactNode }) {
  return (
    <button className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-transparent bg-transparent text-muted-foreground hover:bg-secondary">
      {children}
    </button>
  );
}

export default function CrmWhatsApp() {
  return (
    <MainLayout fullWidth noPadding hideDefaultHeader showBreadcrumbs={false}>
      <div className="flex h-[calc(100dvh-3rem)] min-h-[600px] flex-col bg-background font-sans text-foreground">
        {/* Topbar */}
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-3.5">
          <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.01em]">
            CRM
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(142_70%_94%)] px-2.5 py-[3px] text-[10px] font-extrabold tracking-[0.04em] text-[hsl(142_60%_28%)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(142_70%_42%)]" /> WhatsApp conectado
            </span>
          </h1>
          <div className="ml-2 flex gap-1.5">
            {PIPELINE.map((p) => (
              <span
                key={p.label}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  p.active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {p.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    p.active ? "bg-white/25" : "bg-secondary"
                  }`}
                >
                  {p.n}
                </span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconBtn>{ic(Filter, 18)}</IconBtn>
            <IconBtn>{ic(Bell, 18)}</IconBtn>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(211_100%_92%)] text-xs font-extrabold text-[hsl(211_100%_30%)]">
              RM
            </div>
          </div>
        </div>

        {/* 3-column inbox */}
        <div className="grid min-h-0 flex-1 grid-cols-[326px_1fr_304px]">
          {/* Conversation list */}
          <div className="flex min-h-0 flex-col border-r border-border">
            <div className="border-b border-border px-3.5 py-3">
              <div className="flex items-center gap-2 rounded-[10px] bg-muted/60 px-3 py-2">
                {ic(Search, 15, { color: "hsl(var(--muted-foreground))" })}
                <input
                  placeholder="Buscar conversa ou paciente…"
                  className="w-full border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {CONVERSATIONS.map((c) => {
                const stage = STAGE_META[c.stage];
                return (
                  <div
                    key={c.name}
                    className={`relative flex cursor-pointer gap-[11px] border-b border-border/60 px-3.5 py-3 hover:bg-muted/40 ${
                      c.active ? "bg-primary/[0.07]" : ""
                    }`}
                  >
                    {c.active && (
                      <span className="absolute bottom-0 left-0 top-0 w-[3px] bg-primary" />
                    )}
                    <div
                      className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                      style={{ background: c.avatar }}
                    >
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold">{c.name}</span>
                        <span className="ml-auto flex-shrink-0 text-[10px] font-semibold text-muted-foreground">
                          {c.time}
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 flex items-center gap-1 truncate text-xs ${
                          c.unread ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {c.preview}
                      </div>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.03em] ${stage.chip}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: stage.dot }}
                        />
                        {stage.label}
                      </span>
                    </div>
                    {c.unread ? (
                      <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center self-center rounded-full bg-[hsl(142_70%_42%)] text-[10px] font-extrabold text-white">
                        {c.unread}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat thread */}
          <div className="flex min-h-0 min-w-0 flex-col bg-[hsl(40_30%_96%)]">
            <div className="flex items-center gap-3 border-b border-border bg-card px-[18px] py-[11px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(264_55%_62%)] to-[hsl(264_55%_48%)] text-sm font-extrabold text-white">
                MA
              </div>
              <div>
                <div className="text-sm font-extrabold">Marina Alves</div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  +55 11 98432-1170 ·{" "}
                  <span className="font-bold text-[hsl(142_60%_38%)]">online agora</span>
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                <IconBtn>{ic(Phone, 18)}</IconBtn>
                <IconBtn>{ic(CalendarPlus, 18)}</IconBtn>
                <IconBtn>{ic(MoreVertical, 18)}</IconBtn>
              </div>
            </div>

            <div
              className="flex flex-1 flex-col gap-2 overflow-y-auto px-[22px] py-[18px]"
              style={{
                backgroundImage:
                  "radial-gradient(hsl(40 20% 88%) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            >
              <div className="self-center rounded-full bg-[hsl(40_25%_90%)] px-3 py-[3px] text-[10px] font-bold text-[hsl(40_15%_40%)]">
                HOJE
              </div>
              <div className="flex max-w-[80%] items-center gap-1.5 self-center rounded-[10px] bg-[hsl(211_100%_95%)] px-3.5 py-1.5 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]">
                {ic(UserPlus, 13)} Lead capturado via anúncio "Dor no joelho" · Instagram
              </div>

              <div className="max-w-[64%] self-start rounded-xl rounded-tl-[3px] bg-white px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,.06)]">
                Bom dia! Vi o anúncio de vocês sobre dor no joelho. Gostaria de saber o valor da
                avaliação 🦵
                <div className="mt-[3px] text-right text-[9px] text-muted-foreground">09:41</div>
              </div>
              <div className="max-w-[64%] self-start rounded-xl rounded-tl-[3px] bg-white px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,.06)]">
                Vocês atendem Unimed?
                <div className="mt-[3px] text-right text-[9px] text-muted-foreground">09:42</div>
              </div>

              <div className="max-w-[64%] self-end rounded-xl rounded-tr-[3px] border border-[hsl(142_50%_75%)] bg-white px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,.06)]">
                <div className="mb-[3px] flex items-center gap-1 text-[9px] font-extrabold tracking-[0.04em] text-[hsl(142_55%_32%)]">
                  {ic(Zap, 11)} RESPOSTA RÁPIDA · BOAS-VINDAS
                </div>
                Olá, Marina! 😊 Que bom ter você por aqui. A avaliação fisioterapêutica completa dura
                60 min e custa R$ 180 (particular). Atendemos Unimed sim — nesse caso a avaliação é
                coberta!
                <div className="mt-[3px] flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                  09:43 {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })}
                </div>
              </div>
              <div className="max-w-[64%] self-end rounded-xl rounded-tr-[3px] bg-[hsl(142_65%_88%)] px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,.06)]">
                Posso já deixar um horário reservado pra você esta semana. Prefere manhã ou tarde?
                <div className="mt-[3px] flex items-center justify-end gap-1 text-[9px] text-[hsl(142_40%_38%)]">
                  09:43 {ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })}
                </div>
              </div>

              <div className="max-w-[64%] self-start rounded-xl rounded-tl-[3px] bg-white px-3 py-2 text-[13px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,.06)]">
                Ah, que ótimo! Tenho Unimed sim 🙌 Prefiro de manhã
                <div className="mt-[3px] text-right text-[9px] text-muted-foreground">09:44</div>
              </div>

              <div className="flex max-w-[80%] items-center gap-1.5 self-center rounded-[10px] bg-[hsl(211_100%_95%)] px-3.5 py-1.5 text-center text-[11px] font-semibold text-[hsl(211_100%_32%)]">
                {ic(Sparkles, 13)} IA sugere: oferecer quinta 09:00 (horário livre na agenda)
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto border-t border-border bg-card px-4 py-2">
              {QUICK_REPLIES.map((q) => (
                <span
                  key={q.label}
                  className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${
                    q.tmpl
                      ? "border-[hsl(142_50%_80%)] bg-[hsl(142_60%_95%)] text-[hsl(142_55%_30%)]"
                      : "border-border bg-background text-muted-foreground hover:border-[hsl(142_50%_55%)] hover:text-[hsl(142_55%_30%)]"
                  }`}
                >
                  {q.icon}
                  {q.label}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-card px-4 py-3">
              <IconBtn>{ic(Paperclip, 20)}</IconBtn>
              <div className="flex flex-1 items-center gap-2.5 rounded-full bg-muted/60 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                {ic(Smile, 18)} Escreva uma mensagem…
              </div>
              <IconBtn>{ic(Mic, 20)}</IconBtn>
              <button className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-[hsl(142_70%_42%)] text-white">
                {ic(Send, 18)}
              </button>
            </div>
          </div>

          {/* Context / CRM panel */}
          <div className="flex flex-col overflow-y-auto border-l border-border bg-muted/30">
            <div className="border-b border-border bg-card px-4 pb-4 pt-5 text-center">
              <div className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(264_55%_62%)] to-[hsl(264_55%_48%)] text-[22px] font-extrabold text-white">
                MA
              </div>
              <div className="text-base font-extrabold">Marina Alves</div>
              <div className="mt-px text-xs font-semibold text-muted-foreground">
                +55 11 98432-1170
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {[
                  { icon: ic(UserPlus, 18), label: "Criar paciente" },
                  { icon: ic(CalendarPlus, 18), label: "Agendar" },
                  { icon: ic(StickyNote, 18), label: "Nota" },
                ].map((a) => (
                  <div
                    key={a.label}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-muted/70 px-3 py-2 text-[10px] font-bold text-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="text-primary">{a.icon}</span>
                    {a.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-border px-4 py-3.5">
              <h4 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Estágio no funil
              </h4>
              <div className="flex cursor-pointer items-center justify-between rounded-[10px] border border-border bg-card px-3 py-2.5 text-[13px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(264_60%_94%)] px-2.5 py-[3px] text-[11px] font-extrabold text-[hsl(264_50%_42%)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(264_50%_50%)]" /> Novo lead
                </span>
                {ic(ChevronDown, 16, { color: "hsl(var(--muted-foreground))" })}
              </div>
              <div className="mt-3 flex gap-[3px]">
                <div className="h-[5px] flex-1 rounded-full bg-primary" />
                <div className="h-[5px] flex-1 rounded-full bg-secondary" />
                <div className="h-[5px] flex-1 rounded-full bg-secondary" />
                <div className="h-[5px] flex-1 rounded-full bg-secondary" />
                <div className="h-[5px] flex-1 rounded-full bg-secondary" />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] font-bold text-muted-foreground">
                <span className="text-primary">Lead</span>
                <span>Contato</span>
                <span>Avaliação</span>
                <span>Tratamento</span>
                <span>Alta</span>
              </div>
            </div>

            <div className="border-b border-border px-4 py-3.5">
              <h4 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Detalhes do lead
              </h4>
              {LEAD_DETAILS.map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between border-b border-border/50 py-1.5 text-xs last:border-b-0"
                >
                  <span className="font-semibold text-muted-foreground">{row.k}</span>
                  <span className="font-bold">{row.v}</span>
                </div>
              ))}
            </div>

            <div className="border-b border-border px-4 py-3.5">
              <h4 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Próxima ação
              </h4>
              <div className="rounded-[10px] border border-[hsl(28_80%_85%)] bg-[hsl(28_92%_95%)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[hsl(25_70%_38%)]">
                  {ic(Clock, 12)} Pendente
                </div>
                <div className="mt-1 text-xs font-bold text-[hsl(25_60%_25%)]">
                  Confirmar horário de avaliação — responder com slots de manhã
                </div>
              </div>
            </div>

            <div className="px-4 py-3.5">
              <h4 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Etiquetas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {["# joelho", "# convênio", "# quente"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-foreground"
                  >
                    {t}
                  </span>
                ))}
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  + adicionar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
