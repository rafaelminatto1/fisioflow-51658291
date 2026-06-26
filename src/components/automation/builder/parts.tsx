/**
 * Automation Builder — partes reutilizáveis (catálogo de nós estilo n8n + inspector).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  GitBranch,
  Clock,
  MessageSquare,
  Mail,
  CheckSquare,
  Webhook,
  Terminal,
  Zap,
  X,
  Trash2,
  type LucideIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { AutomationRecord } from "@/api/v2";
import {
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
} from "@/hooks/useAutomations";
import { TRIGGER_EVENTS, triggerLabel } from "./triggerEvents";
import type { AutomationNodeData, NodeKind, Category, CatalogEntry } from "./types";
import { cn } from "@/lib/utils";

/* ======================== Catálogo de Nós ======================== */

export const CONDITION_OPS: Array<{ value: string; label: string }> = [
  { value: "eq", label: "Igual a (==)" },
  { value: "neq", label: "Diferente de (!=)" },
  { value: "gt", label: "Maior que (>)" },
  { value: "gte", label: "Maior ou igual (>=)" },
  { value: "lt", label: "Menor que (<)" },
  { value: "lte", label: "Menor ou igual (<=)" },
  { value: "contains", label: "Contém" },
  { value: "exists", label: "Existe (preenchido)" },
];

export const CONTEXT_FIELDS: string[] = [
  "patient.name",
  "patient.phone",
  "patient.email",
  "patient.status",
  "appointment.status",
  "appointment.startTime",
  "appointment.type",
  "payment.amount",
  "payment.status",
  "evolution.painScale",
  "vasDelta",
  "organizationId",
];

export const CATEGORY_ORDER: Category[] = ["Controle", "Comunicação", "FisioFlow", "Avançado"];

const baseNodeDefaults: Record<NodeKind, Partial<AutomationNodeData>> = {
  trigger: { kind: "trigger" },
  condition: { kind: "condition", field: "", op: "eq", value: "" },
  wait: { kind: "wait", seconds: 3600 },
  action: { kind: "action", action: "log_event", paramsJson: "{}" },
};

export const NODE_CATALOG: CatalogEntry[] = [
  {
    type: "condition",
    kind: "condition",
    category: "Controle",
    label: "Condição (If/Else)",
    description: "Ramifica o fluxo em Verdadeiro / Falso",
    Icon: GitBranch,
    color: "#f59e0b",
    build: () => ({ ...baseNodeDefaults.condition, label: "Condição", field: "patient.status", op: "eq", value: "ativo" }),
  },
  {
    type: "wait",
    kind: "wait",
    category: "Controle",
    label: "Aguardar",
    description: "Pausa o fluxo por um tempo",
    Icon: Clock,
    color: "#64748b",
    build: () => ({ ...baseNodeDefaults.wait, label: "Aguardar 1 hora" }),
  },
  {
    type: "send_whatsapp",
    kind: "action",
    category: "Comunicação",
    label: "Enviar WhatsApp",
    description: "Envia mensagem via WhatsApp",
    Icon: MessageSquare,
    color: "#22c55e",
    build: () => ({ ...baseNodeDefaults.action, label: "Enviar WhatsApp", action: "send_whatsapp", paramsJson: '{"message": ""}' }),
  },
  {
    type: "send_email",
    kind: "action",
    category: "Comunicação",
    label: "Enviar E-mail",
    description: "Envia e-mail transacional",
    Icon: Mail,
    color: "#3b82f6",
    build: () => ({ ...baseNodeDefaults.action, label: "Enviar E-mail", action: "send_email", paramsJson: '{"to": "", "subject": "", "message": ""}' }),
  },
  {
    type: "create_task",
    kind: "action",
    category: "FisioFlow",
    label: "Criar Tarefa",
    description: "Cria uma tarefa para a equipe",
    Icon: CheckSquare,
    color: "#8b5cf6",
    build: () => ({ ...baseNodeDefaults.action, label: "Criar Tarefa", action: "create_task", paramsJson: '{"title": "", "description": ""}' }),
  },
  {
    type: "send_webhook",
    kind: "action",
    category: "Avançado",
    label: "Webhook",
    description: "Chama uma URL externa (HTTPS)",
    Icon: Webhook,
    color: "#06b6d4",
    build: () => ({ ...baseNodeDefaults.action, label: "Webhook", action: "send_webhook", paramsJson: '{"url": "", "method": "POST", "body": ""}' }),
  },
  {
    type: "log_event",
    kind: "action",
    category: "Avançado",
    label: "Registrar Log",
    description: "Registra uma mensagem no console",
    Icon: Terminal,
    color: "#64748b",
    build: () => ({ ...baseNodeDefaults.action, label: "Registrar Log", action: "log_event", paramsJson: '{"message": ""}' }),
  },
];

export function entryByType(type: string): CatalogEntry | undefined {
  return NODE_CATALOG.find((e) => e.type === type);
}

export function actionLabel(action?: string): string {
  return entryByType(action ?? "")?.label ?? action ?? "Ação";
}

export const WAIT_UNITS: Array<{ unit: "s" | "min" | "h" | "d"; label: string; factor: number }> = [
  { unit: "s", label: "segundos", factor: 1 },
  { unit: "min", label: "minutos", factor: 60 },
  { unit: "h", label: "horas", factor: 3600 },
  { unit: "d", label: "dias", factor: 86400 },
];

export function formatWait(seconds?: number): string {
  const s = seconds ?? 0;
  if (s <= 0) return "0s";
  if (s >= 86400 && s % 86400 === 0) return `${s / 86400}d`;
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600}h`;
  if (s >= 60 && s % 60 === 0) return `${s / 60}min`;
  return `${s}s`;
}

/* =============================== Campos =============================== */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  list,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  list?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        list={list}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------- Inspector -------------------------------- */

function ParamHelper({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">{children}</p>;
}

/**
 * Helper to get parameter value from paramsJson string.
 */
function getParam(data: AutomationNodeData, key: string, fallback = ""): string {
  try {
    const obj = data.paramsJson ? JSON.parse(data.paramsJson) : {};
    return obj[key] == null ? fallback : String(obj[key]);
  } catch {
    return fallback; // Return fallback if JSON parsing fails
  }
}

/**
 * Helper to set parameter value in paramsJson string.
 */
function setParam(data: AutomationNodeData, key: string, value: string): Partial<AutomationNodeData> {
  const obj = data.paramsJson ? JSON.parse(data.paramsJson) : {};
  obj[key] = value;
  return { paramsJson: JSON.stringify(obj) };
}

export function NodeInspector({
  data,
  onChange,
  onClose,
  onDelete,
}: {
  data: AutomationNodeData;
  onChange: (p: Partial<AutomationNodeData>) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const entry = data.kind === "action" ? entryByType(data.action ?? "") : undefined;
  const accent = entry?.color ?? (data.kind === "condition" ? "#f59e0b" : "#64748b"); // Default colors
  const AccentIcon = entry?.Icon ?? Zap;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white`} style={{ backgroundColor: accent }}>
          <AccentIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">{entry?.label ?? data.label}</p>
          <p className="truncate text-[11px] text-slate-400">{entry?.description ?? "Bloco"}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Fechar">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={onDelete} title="Excluir bloco">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <TextField label="Nome do bloco" value={data.label} onChange={(v) => onChange({ label: v })} />

        <div className="h-px bg-slate-100" />

        {data.kind === "trigger" && (
          <ParamHelper>
            Este é o ponto de partida. O evento é definido no seletor no topo da tela.
          </ParamHelper>
        )}

        {data.kind === "condition" && (
          <div className="space-y-3">
            <TextField
              label="Campo do contexto"
              value={data.field ?? ""}
              list="ctx-fields"
              onChange={(v) => onChange({ field: v })}
              placeholder="patient.status"
            />
            <datalist id="ctx-fields">
              {CONTEXT_FIELDS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <SelectField
              label="Operador"
              value={data.op ?? "eq"}
              options={CONDITION_OPS}
              onChange={(v) => onChange({ op: v })}
            />
            {data.op !== "exists" && (
              <TextField
                label="Valor esperado"
                value={String(data.value ?? "")}
                onChange={(v) => onChange({ value: v })}
                placeholder="ativo"
              />
            )}
            <ParamHelper>
              Saída <strong className="text-emerald-600">Verdadeiro</strong> → direita. Saída{" "}
              <strong className="text-red-600">Falso</strong> → esquerda.
            </ParamHelper>
          </div>
        )}

        {data.kind === "wait" && <WaitEditor data={data} onChange={onChange} />}

        {data.kind === "action" && (
          <>
            {(data.action === "send_whatsapp" || data.action === "send_email") && (
              <SelectField
                label="Tipo de Ação"
                value={data.action ?? "send_whatsapp"}
                options={[
                  { label: "Enviar WhatsApp", value: "send_whatsapp" },
                  { label: "Enviar E-mail", value: "send_email" },
                ]}
                onChange={(v) => {
                  const entry = NODE_CATALOG.find(n => n.type === v);
                  onChange({ action: v, paramsJson: JSON.stringify(entry?.build()?.params ?? {}) });
                }}
              />
            )}

            {data.action === "send_whatsapp" && (
              <div className="space-y-3">
                <TextArea
                  label="Mensagem"
                  value={getParam(data, "message")}
                  onChange={(v) => onChange(setParam(data, "message", v))}
                  placeholder="Olá {patient.name}! Lembrete da sua sessão amanhã..."
                  rows={5}
                />
                <TextField
                  label="Template (opcional)"
                  value={getParam(data, "templateName")}
                  onChange={(v) => onChange(setParam(data, "templateName", v))}
                  placeholder="nome_do_template_aprovado"
                />
                <ParamHelper>Se não informar destinatário ('to'), usa o telefone do paciente do contexto.</ParamHelper>
              </div>
            )}

            {data.action === "send_email" && (
              <div className="space-y-3">
                <TextField
                  label="Para (e-mail)"
                  value={getParam(data, "to")}
                  onChange={(v) => onChange(setParam(data, "to", v))}
                  placeholder="paciente@email.com"
                />
                <TextField
                  label="Assunto"
                  value={getParam(data, "subject")}
                  onChange={(v) => onChange(setParam(data, "subject", v))}
                  placeholder="Confirmação de agendamento"
                />
                <TextArea
                  label="Mensagem"
                  value={getParam(data, "message")}
                  onChange={(v) => onChange(setParam(data, "message", v))}
                  placeholder="Conteúdo do e-mail..."
                  rows={6}
                />
              </div>
            )}

            {data.action === "create_task" && (
              <div className="space-y-3">
                <TextField
                  label="Título"
                  value={getParam(data, "title")}
                  onChange={(v) => onChange(setParam(data, "title", v))}
                  placeholder="Ligar para paciente"
                />
                <TextArea
                  label="Descrição"
                  value={getParam(data, "description")}
                  onChange={(v) => onChange(setParam(data, "description", v))}
                  placeholder="Detalhes da tarefa..."
                  rows={4}
                />
              </div>
            )}

            {data.action === "send_webhook" && (
              <div className="space-y-3">
                <TextField
                  label="URL (https)"
                  value={getParam(data, "url")}
                  onChange={(v) => onChange(setParam(data, "url", v))}
                  placeholder="https://exemplo.com/webhook"
                />
                <SelectField
                  label="Método"
                  value={getParam(data, "method", "POST")}
                  options={[
                    { label: "POST", value: "POST" },
                    { label: "GET", value: "GET" },
                    { label: "PUT", value: "PUT" },
                  ]}
                  onChange={(v) => onChange(setParam(data, "method", v))}
                />
                <TextArea
                  label="Corpo (JSON, opcional)"
                  value={getParam(data, "body")}
                  onChange={(v) => onChange(setParam(data, "body", v))}
                  placeholder='{"evento": "teste"}'
                  rows={4}
                />
              </div>
            )}

            {data.action === "log_event" && (
              <TextArea
                label="Mensagem de log"
                value={getParam(data, "message")}
                onChange={(v) => onChange(setParam(data, "message", v))}
                placeholder="Automação executada"
                rows={3}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WaitEditor({
  data,
  onChange,
}: {
  data: AutomationNodeData;
  onChange: (p: Partial<AutomationNodeData>) => void;
}) {
  const prevSeconds = data.seconds ?? 0;
  let unitIdx = WAIT_UNITS.findIndex((u) => u.unit === "h"); // Default to hours if seconds is 0
  let amount = prevSeconds;

  if (prevSeconds > 0) {
    for (let i = WAIT_UNITS.length - 1; i >= 0; i--) {
      const f = WAIT_UNITS[i].factor;
      if (prevSeconds >= f && prevSeconds % f === 0) {
        unitIdx = i;
        amount = prevSeconds / f;
        break;
      }
    }
  }
  const unit = WAIT_UNITS[unitIdx];

  const label = `Aguardar ${amount} ${amount === 1 ? unit.label.slice(0, -1) : unit.label}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <TextField
          label="Duração"
          value={String(amount || "")}
          onChange={(v) => {
            const n = Number(v) || 0;
            const seconds = n * unit.factor;
            onChange({ seconds: seconds, label: `Aguardar ${n} ${n === 1 ? unit.label.slice(0, -1) : unit.label}` });
          }}
          placeholder="1"
          type="number"
        />
        <SelectField
          label="Unidade"
          value={unit.unit}
          options={WAIT_UNITS.map((u) => ({ label: u.label, value: u.unit }))}
          onChange={(v) => {
            const u = WAIT_UNITS.find((x) => x.unit === v)!;
            const n = Math.round((data.seconds ?? 0) / unit.factor) || 1;
            onChange({ seconds: n * u.factor, label: `Aguardar ${n} ${n === 1 ? u.label.slice(0, -1) : u.label}` });
          }}
        />
      </div>
      <ParamHelper>O fluxo pausa até continuar. Máximo 30 dias.</ParamHelper>
    </div>
  );
}
