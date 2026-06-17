import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { Zap, GitBranch, Mail, Clock, Play, Save, Plus } from "lucide-react";
import { automationApi } from "@/api/v2";

type NodeKind = "trigger" | "condition" | "action" | "wait";

type AutomationNodeData = {
  kind: NodeKind;
  label: string;
  // condition
  field?: string;
  op?: string;
  value?: string;
  // action
  action?: string;
  paramsJson?: string;
  // wait
  seconds?: number;
};

const KIND_META: Record<
  NodeKind,
  { label: string; icon: typeof Zap; ring: string; chip: string; dot: string }
> = {
  trigger: { label: "Gatilho", icon: Zap, ring: "border-blue-300", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  condition: { label: "Condição", icon: GitBranch, ring: "border-amber-300", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  action: { label: "Ação", icon: Mail, ring: "border-emerald-300", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  wait: { label: "Espera", icon: Clock, ring: "border-slate-300", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
};

function FlowNode({ data, selected }: NodeProps<AutomationNodeData>) {
  const meta = KIND_META[data.kind];
  const Icon = meta.icon;
  return (
    <div
      className={`min-w-[180px] rounded-xl border-2 bg-white shadow-sm ${meta.ring} ${
        selected ? "ring-2 ring-offset-1 ring-blue-400" : ""
      }`}
    >
      {data.kind !== "trigger" && <Handle type="target" position={Position.Top} className="!bg-slate-400" />}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{meta.label}</div>
          <div className="text-sm font-bold text-slate-800">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

let idSeq = 1;
const newId = (kind: NodeKind) => `${kind}-${idSeq++}`;

export default function AutomationBuilderPage() {
  const nodeTypes = useMemo(() => ({ flow: FlowNode }), []);
  const [name, setName] = useState("Nova automação");
  const [triggerEvent, setTriggerEvent] = useState("evolution.updated");
  const [nodes, setNodes, onNodesChange] = useNodesState<AutomationNodeData>([
    { id: "trigger-0", type: "flow", position: { x: 240, y: 40 }, data: { kind: "trigger", label: "Evento" } },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<Array<Record<string, unknown>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const addNode = (kind: NodeKind) => {
    const id = newId(kind);
    const defaults: AutomationNodeData =
      kind === "condition"
        ? { kind, label: "campo > valor", field: "vasDelta", op: "lt", value: "-2" }
        : kind === "action"
          ? { kind, label: "send_email", action: "send_email", paramsJson: '{"to":"","subject":"","message":""}' }
          : kind === "wait"
            ? { kind, label: "aguardar", seconds: 3600 }
            : { kind, label: "Evento" };
    setNodes((nds) => [
      ...nds,
      { id, type: "flow", position: { x: 120 + Math.random() * 240, y: 160 + nds.length * 30 }, data: defaults },
    ]);
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const patchSelected = (patch: Partial<AutomationNodeData>) =>
    setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)));

  const toDefinition = () => ({
    nodes: nodes.map((n) => {
      const d = n.data;
      if (d.kind === "trigger") return { id: n.id, type: "trigger" as const };
      if (d.kind === "condition")
        return { id: n.id, type: "condition" as const, field: d.field ?? "", op: d.op ?? "eq", value: d.value };
      if (d.kind === "wait") return { id: n.id, type: "wait" as const, seconds: Number(d.seconds ?? 0) };
      let params: Record<string, unknown> = {};
      try {
        params = d.paramsJson ? JSON.parse(d.paramsJson) : {};
      } catch {
        params = {};
      }
      return { id: n.id, type: "action" as const, action: d.action ?? "log_event", params };
    }),
    edges: edges.map((e) => ({
      from: e.source,
      to: e.target,
      ...(e.sourceHandle === "true" || e.sourceHandle === "false" ? { branch: e.sourceHandle } : {}),
    })),
  });

  const runSimulate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await automationApi.simulate(toDefinition(), { vasDelta: -3, organizationId: "preview" });
      setTrace(res.trace);
    } catch (e) {
      setMsg(`Falha ao simular: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await automationApi.create({ name, triggerEvent, enabled: false, definition: toDefinition() });
      setMsg("Automação salva (desativada). Ative quando estiver pronta.");
    } catch (e) {
      setMsg(`Falha ao salvar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 font-[Nunito,sans-serif]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-5 py-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base font-bold text-slate-800 focus:border-blue-400 focus:outline-none"
          aria-label="Nome da automação"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Gatilho
          <select
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="evolution.updated">Evolução atualizada</option>
            <option value="appointment.created">Consulta criada</option>
            <option value="appointment.completed">Consulta concluída</option>
            <option value="patient.inactive">Paciente inativo</option>
          </select>
        </label>
        <button
          onClick={runSimulate}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> Simular
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> Salvar
        </button>
      </div>

      {msg && <div className="bg-blue-50 px-5 py-2 text-sm text-blue-800">{msg}</div>}

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <aside className="w-44 shrink-0 border-r bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Adicionar bloco</div>
          <div className="flex flex-col gap-2">
            {(["condition", "action", "wait"] as NodeKind[]).map((k) => {
              const m = KIND_META[k];
              const Icon = m.icon;
              return (
                <button
                  key={k}
                  onClick={() => addNode(k)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ${m.chip}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {m.label}
                  <Plus className="ml-auto h-3.5 w-3.5 text-slate-400" />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background color="#cbd5e1" gap={18} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Inspector / trace */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4">
          {selected ? (
            <NodeInspector data={selected.data} onChange={patchSelected} />
          ) : trace ? (
            <TracePanel trace={trace} />
          ) : (
            <p className="text-sm text-slate-500">
              Selecione um bloco para editar, ou clique <strong>Simular</strong> para ver a execução passo a passo.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeInspector({
  data,
  onChange,
}: {
  data: AutomationNodeData;
  onChange: (p: Partial<AutomationNodeData>) => void;
}) {
  const meta = KIND_META[data.kind];
  return (
    <div className="space-y-3">
      <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold ${meta.chip}`}>
        {meta.label}
      </div>
      {data.kind === "condition" && (
        <>
          <Field label="Campo" value={data.field ?? ""} onChange={(v) => onChange({ field: v, label: `${v} ${data.op} ${data.value}` })} />
          <SelectField
            label="Operador"
            value={data.op ?? "eq"}
            options={["eq", "neq", "gt", "gte", "lt", "lte", "contains", "exists"]}
            onChange={(v) => onChange({ op: v, label: `${data.field} ${v} ${data.value}` })}
          />
          <Field label="Valor" value={data.value ?? ""} onChange={(v) => onChange({ value: v, label: `${data.field} ${data.op} ${v}` })} />
        </>
      )}
      {data.kind === "action" && (
        <>
          <SelectField
            label="Ação"
            value={data.action ?? "send_email"}
            options={["send_email", "log_event"]}
            onChange={(v) => onChange({ action: v, label: v })}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Parâmetros (JSON)</span>
            <textarea
              value={data.paramsJson ?? "{}"}
              onChange={(e) => onChange({ paramsJson: e.target.value })}
              rows={5}
              className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-blue-400 focus:outline-none"
            />
          </label>
        </>
      )}
      {data.kind === "wait" && (
        <Field
          label="Segundos"
          value={String(data.seconds ?? 0)}
          onChange={(v) => onChange({ seconds: Number(v) || 0, label: `aguardar ${v}s` })}
        />
      )}
      {data.kind === "trigger" && <p className="text-sm text-slate-500">O gatilho é definido pelo evento na barra superior.</p>}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-blue-400 focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-blue-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function TracePanel({ trace }: { trace: Array<Record<string, unknown>> }) {
  return (
    <div>
      <div className="mb-3 text-sm font-bold text-slate-800">Execução simulada</div>
      <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
        {trace.map((t, i) => {
          const kind = String(t.type) as NodeKind;
          const meta = KIND_META[kind] ?? KIND_META.action;
          return (
            <li key={i} className="relative">
              <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${meta.dot}`} />
              <div className="text-sm font-semibold text-slate-700">{meta.label}</div>
              <div className="text-xs text-slate-500">
                {kind === "condition" && `resultado: ${t.passed ? "verdadeiro" : "falso"}`}
                {kind === "action" && String(t.action ?? "")}
                {kind === "wait" && `${t.seconds}s`}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
