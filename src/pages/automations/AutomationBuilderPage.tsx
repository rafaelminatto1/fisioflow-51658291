import { useCallback, useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { 
  Zap, 
  GitBranch, 
  Mail, 
  Clock, 
  Play, 
  Save, 
  Plus, 
  ArrowLeft, 
  MessageSquare, 
  Calendar, 
  UserPlus, 
  TrendingUp, 
  DollarSign,
  Trash2,
  AlertCircle
} from "lucide-react";
import { automationApi } from "@/api/v2";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      {data.kind === "condition" && (
         <>
           <Handle type="source" position={Position.Left} id="false" className="!bg-red-400" />
           <Handle type="source" position={Position.Right} id="true" className="!bg-emerald-400" />
         </>
      )}
    </div>
  );
}

let idSeq = 1;
const newId = (kind: NodeKind) => `${kind}-${idSeq++}`;

export default function AutomationBuilderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template");
  const navigate = useNavigate();

  const nodeTypes = useMemo(() => ({ flow: FlowNode }), []);
  const [name, setName] = useState("Nova automação");
  const [triggerEvent, setTriggerEvent] = useState("evolution.updated");
  const [nodes, setNodes, onNodesChange] = useNodesState<AutomationNodeData>([
    { id: "trigger-0", type: "flow", position: { x: 400, y: 40 }, data: { kind: "trigger", label: "Evento" } },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<Array<Record<string, unknown>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (templateId) {
      applyTemplate(templateId);
    } else if (id && id !== "new") {
      loadAutomation(id);
    }
  }, [id, templateId]);

  const loadAutomation = async (automationId: string) => {
    try {
      const res = await automationApi.get(automationId);
      const data = res.data;
      setName(data.name);
      setTriggerEvent(data.trigger_event ?? "evolution.updated");
      // definition parsing logic here if needed
    } catch (e) {
      toast.error("Falha ao carregar automação");
    }
  };

  const applyTemplate = (tid: string) => {
    if (tid === "onboarding") {
      setName("Boas-vindas (Onboarding)");
      setTriggerEvent("patient.created");
      setNodes([
        { id: "trigger-0", type: "flow", position: { x: 400, y: 40 }, data: { kind: "trigger", label: "Paciente Cadastrado" } },
        { id: "wait-1", type: "flow", position: { x: 400, y: 140 }, data: { kind: "wait", label: "aguardar 5min", seconds: 300 } },
        { id: "action-1", type: "flow", position: { x: 400, y: 240 }, data: { kind: "action", label: "Enviar WhatsApp", action: "whatsapp_send", paramsJson: '{"message": "Olá! Bem-vindo à FisioFlow..."}' } },
      ]);
      setEdges([
        { id: "e1", source: "trigger-0", target: "wait-1", markerEnd: { type: MarkerType.ArrowClosed } },
        { id: "e2", source: "wait-1", target: "action-1", markerEnd: { type: MarkerType.ArrowClosed } },
      ]);
    }
    // Adicionar outros templates aqui...
  };

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const addNode = (kind: NodeKind, subType?: string) => {
    const id = newId(kind);
    let defaults: AutomationNodeData = { kind, label: "Novo Bloco" };
    
    if (kind === "condition") {
      defaults = { kind, label: "se campo > valor", field: "vasDelta", op: "lt", value: "-2" };
    } else if (kind === "action") {
      if (subType === "whatsapp") {
        defaults = { kind, label: "Enviar WhatsApp", action: "whatsapp_send", paramsJson: '{"message": ""}' };
      } else if (subType === "email") {
        defaults = { kind, label: "Enviar Email", action: "send_email", paramsJson: '{"to":"","subject":"","message":""}' };
      } else {
        defaults = { kind, label: "Executar Ação", action: "log_event", paramsJson: "{}" };
      }
    } else if (kind === "wait") {
      defaults = { kind, label: "Aguardar 1h", seconds: 3600 };
    }

    setNodes((nds) => [
      ...nds,
      { id, type: "flow", position: { x: 400, y: 150 + nds.length * 40 }, data: defaults },
    ]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
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

  const save = async () => {
    setBusy(true);
    try {
      if (id && id !== "new") {
        await automationApi.update(id, { name, triggerEvent, enabled: true, definition: toDefinition() });
      } else {
        await automationApi.create({ name, triggerEvent, enabled: false, definition: toDefinition() });
      }
      toast.success("Automação salva com sucesso!");
      navigate("/automacoes");
    } catch (e) {
      toast.error("Erro ao salvar automação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/automacoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent text-lg font-bold text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
            <Zap className="h-4 w-4 text-blue-500" />
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none"
            >
              <option value="evolution.updated">Evolução atualizada</option>
              <option value="patient.created">Paciente cadastrado</option>
              <option value="appointment.scheduled">Agendamento criado</option>
              <option value="payment.overdue">Pagamento vencido</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTrace([])}>
            <Play className="mr-2 h-4 w-4" /> Simular
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <aside className="w-64 border-r bg-white p-4 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Controle</h3>
            <div className="space-y-2">
              <SidebarItem icon={GitBranch} label="Condição (If/Else)" color="text-amber-500" onClick={() => addNode("condition")} />
              <SidebarItem icon={Clock} label="Aguardar Tempo" color="text-slate-500" onClick={() => addNode("wait")} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Comunicação</h3>
            <div className="space-y-2">
              <SidebarItem icon={MessageSquare} label="Enviar WhatsApp" color="text-emerald-500" onClick={() => addNode("action", "whatsapp")} />
              <SidebarItem icon={Mail} label="Enviar Email" color="text-blue-500" onClick={() => addNode("action", "email")} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">FisioFlow</h3>
            <div className="space-y-2">
              <SidebarItem icon={Calendar} label="Mudar Status Agenda" color="text-indigo-500" onClick={() => addNode("action")} />
              <SidebarItem icon={DollarSign} label="Gerar Cobrança" color="text-green-500" onClick={() => addNode("action")} />
            </div>
          </div>

          <div className="mt-auto p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700">Dica da IA</p>
                <p className="text-[10px] text-blue-600 leading-tight mt-1">
                  Conecte os blocos para criar um fluxo. Use condições para caminhos diferentes.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="relative flex-1 bg-[#f8fafc]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background color="#cbd5e1" gap={20} />
            <Controls />
          </ReactFlow>
        </main>

        {/* Right Sidebar - Inspector */}
        <aside className={`w-80 border-l bg-white p-4 transition-all ${selectedId ? "translate-x-0" : "translate-x-full hidden"}`}>
          {selectedNode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800">Configurações</h3>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setNodes(nds => nds.filter(n => n.id !== selectedId))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <NodeInspector data={selectedNode.data} onChange={patchSelected} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Zap className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">Selecione um bloco para editar suas configurações.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-all hover:border-slate-200 hover:bg-slate-50 active:scale-95"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm border ${color.replace('text', 'border')}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Plus className="ml-auto h-3 w-3 text-slate-300" />
    </button>
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
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Bloco</label>
        <input
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none font-medium"
        />
      </div>

      <div className="h-px bg-slate-100" />

      {data.kind === "condition" && (
        <div className="space-y-4">
          <Field label="Campo de Dados" value={data.field ?? ""} onChange={(v) => onChange({ field: v })} />
          <SelectField
            label="Operador"
            value={data.op ?? "eq"}
            options={[
              { label: "Igual a", value: "eq" },
              { label: "Diferente de", value: "neq" },
              { label: "Maior que", value: "gt" },
              { label: "Menor que", value: "lt" },
              { label: "Contém", value: "contains" }
            ]}
            onChange={(v) => onChange({ op: v })}
          />
          <Field label="Valor Esperado" value={data.value ?? ""} onChange={(v) => onChange({ value: v })} />
          
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-[10px] text-amber-700 leading-tight">
              <strong>Nota:</strong> A saída da esquerda (Vermelha) é executada se a condição for FALSA. A da direita (Verde) se for VERDADEIRA.
            </p>
          </div>
        </div>
      )}

      {data.kind === "action" && (
        <div className="space-y-4">
          <SelectField
            label="Tipo de Ação"
            value={data.action ?? "whatsapp_send"}
            options={[
              { label: "Enviar WhatsApp", value: "whatsapp_send" },
              { label: "Enviar Email", value: "send_email" },
              { label: "Mudar Status Agenda", value: "appointment_status" },
              { label: "Notificar Equipe", value: "internal_notify" }
            ]}
            onChange={(v) => onChange({ action: v })}
          />
          <div className="space-y-1">
            <span className="mb-1 block text-sm font-semibold text-slate-600">Configuração (JSON)</span>
            <textarea
              value={data.paramsJson ?? "{}"}
              onChange={(e) => onChange({ paramsJson: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs focus:border-blue-400 focus:outline-none bg-slate-50"
              placeholder='{"message": "Olá..."}'
            />
          </div>
        </div>
      )}

      {data.kind === "wait" && (
        <div className="space-y-4">
          <Field
            label="Tempo de Espera (segundos)"
            value={String(data.seconds ?? 0)}
            onChange={(v) => onChange({ seconds: Number(v) || 0, label: `Aguardar ${v}s` })}
          />
          <p className="text-[10px] text-slate-400 italic">Dica: 3600 segundos = 1 hora</p>
        </div>
      )}

      {data.kind === "trigger" && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
          <Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-xs text-blue-700">Este é o ponto de partida. Ele é disparado pelo evento selecionado no topo da tela.</p>
        </div>
      )}
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
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
  options: Array<{ label: string, value: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none bg-white"
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
