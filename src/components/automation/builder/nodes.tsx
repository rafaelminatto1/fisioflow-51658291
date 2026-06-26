/**
 * Automation Builder — Nó de Gatilho customizado estilo n8n.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Zap,
  Play,
  Save,
  Plus,
  ArrowLeft,
  Search,
  Loader2,
  Eraser,
  Workflow,
  X,
  GitBranch,
  Clock,
  MessageSquare,
  Mail,
  CheckSquare,
  Webhook,
  Terminal,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { automationApi, type AutomationRecord } from "@/api/v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AutomationNodeData, NodeKind, Category, CatalogEntry } from "./types";
import {
  NODE_CATALOG,
  CATEGORY_ORDER,
  entryByType,
  actionLabel,
  CONTEXT_FIELDS,
  CONDITION_OPS,
  WAIT_UNITS,
  formatWait,
} from "./parts";
import { NodeInspector } from "./parts";
import { TRIGGER_EVENTS, triggerLabel } from "./triggerEvents";

/* ====================== Componentes do Builder ====================== */

const STATUS_STYLE: Record<string, { ring: string; dot: string }> = {
  idle: { ring: "", dot: "" },
  running: { ring: "ring-2 ring-amber-300", dot: "bg-amber-400 animate-pulse" },
  success: { ring: "ring-2 ring-emerald-300", dot: "bg-emerald-500" },
  error: { ring: "ring-2 ring-red-300", dot: "bg-red-500" },
};

function TriggerNode({ id, data, selected }: NodeProps<AutomationNodeData>) {
  const meta = KIND_META.trigger;
  const Icon = meta.icon;

  return (
    <div
      className={`relative min-w-[210px] rounded-xl border-2 bg-gradient-to-br from-blue-100 to-blue-50 pb-3 pt-2 shadow-sm transition-shadow ${
        selected ? "ring-2 ring-offset-1 ring-blue-400" : meta.ring
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-blue-300" />
      <div className="flex items-center gap-2.5 px-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white`} style={{ backgroundColor: meta.color }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-bold text-blue-700 truncate">{data.label}</div>
          <div className="truncate text-[11px] text-slate-500">{data.desc}</div>
        </div>
        <div className={`flex-shrink-0 h-2 w-2 rounded-full ${meta.dot}`} />
      </div>
    </div>
  );
}

const KIND_META: Record<
  NodeKind,
  { label: string; icon: LucideIcon; ring: string; chip: string; dot: string }
> = {
  trigger: { label: "Gatilho", icon: Zap, ring: "border-blue-300", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  condition: { label: "Condição", icon: GitBranch, ring: "border-amber-300", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  action: { label: "Ação", icon: Mail, ring: "border-emerald-300", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  wait: { label: "Espera", icon: Clock, ring: "border-slate-300", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
};

function FlowNode({ id, data, selected }: NodeProps<AutomationNodeData>) {
  const meta = KIND_META[data.kind];
  const actionMeta = data.kind === "action" ? ACTION_META[data.action ?? ""] : undefined;
  const Icon = actionMeta?.icon ?? meta.icon;
  const color = actionMeta?.color ?? meta.color;
  const status = STATUS_STYLE[data.status ?? "idle"];

  const subtitle =
    data.kind === "trigger"
      ? data.desc
      : data.kind === "condition"
        ? `${data.field ?? ""} ${data.op ?? ""} ${data.value ?? ""}`
        : data.kind === "wait"
          ? formatWait(data.seconds)
          : actionMeta?.label ?? data.label;

  return (
    <div
      className={`relative min-w-[210px] rounded-xl border-2 bg-white shadow-sm transition-shadow ${
        selected ? "ring-2 ring-offset-1 ring-blue-400" : meta.ring
      }`}
    >
      {/* status dot */}
      {data.status && data.status !== "idle" && (
        <span className={`absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-white ${status.dot}`} />
      )}

      {data.kind !== "trigger" && (
        <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-300" />
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white`} style={{ backgroundColor: color }}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-bold text-slate-800">{data.label ?? meta.label}</div>
          {subtitle && <div className="truncate text-[11px] text-slate-400">{subtitle}</div>}
        </div>
        {data.kind === "condition" && (
          <>
            <Handle type="source" position={Position.Right} id="true" className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500" />
            <Handle type="source" position={Position.Left} id="false" className="!h-2.5 !w-2.5 !border-2 !border-white !bg-red-400" />
            <div className="absolute right-1 bottom-1 translate-x-full rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-600 pointer-events-none">✓</div>
            <div className="absolute left-1 bottom-1 -translate-x-full rounded bg-red-50 px-1 text-[9px] font-bold text-red-600 pointer-events-none">✗</div>
          </>
        )}
      </div>

      {data.kind !== "trigger" && data.kind !== "condition" && (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-300" />
      )}

      {/* quick-add tab */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("ff:quick-add", { detail: { from: id, kind: data.kind, sourceHandle: data.kind === "condition" ? "true" : undefined } }));
        }}
        className="absolute -bottom-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500"
        title="Adicionar próximo bloco"
        disabled={data.kind === "trigger"} // Trigger doesn't have quick add connection
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const ACTION_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  send_whatsapp: { label: "Enviar WhatsApp", icon: MessageSquare, color: "#22c55e" },
  send_email: { label: "Enviar E-mail", icon: Mail, color: "#3b82f6" },
  create_task: { label: "Criar Tarefa", icon: CheckSquare, color: "#8b5cf6" },
  send_webhook: { label: "Webhook", icon: Webhook, color: "#06b6d4" },
  log_event: { label: "Registrar Log", icon: Terminal, color: "#64748b" },
};
