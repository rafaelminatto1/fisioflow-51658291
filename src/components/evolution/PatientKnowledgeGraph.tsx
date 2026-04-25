/**
 * PatientKnowledgeGraph - Grafo de conhecimento do paciente estilo Obsidian
 * Visualiza relações entre sessões, metas, patologias e exercícios
 *
 * Features:
 * - Grafo interativo com layout radial automático
 * - Nós personalizados por tipo com ícones e cores
 * - Popover com detalhes ao clicar em um nó
 * - Minimap, zoom, fit view
 * - Legenda visual
 * - Estado vazio com instruções
 */

import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, Activity, Dumbbell, User, GitBranch, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface PatientKnowledgeGraphProps {
  patientId: string;
  patientName?: string;
  sessions?: Array<{
    id: string;
    date: string;
    sessionNumber?: number;
    subjective?: string;
    painLevel?: number;
  }>;
  goals?: Array<{
    id: string;
    goal_title: string;
    status: string;
    current_progress: number;
    priority: string;
  }>;
  pathologies?: Array<{
    id: string;
    pathology_name: string;
    status: string;
    severity?: string;
  }>;
  exercises?: Array<{
    id: string;
    name?: string;
    exerciseName?: string;
  }>;
  className?: string;
}

export type { PatientKnowledgeGraphProps };

// ---------------------------------------------------------------------------
// Tipos internos de dados de nó
// ---------------------------------------------------------------------------

interface PatientNodeData {
  label: string;
  patientId: string;
  onNodeClick: (data: NodeDetailData) => void;
}

interface SessionNodeData {
  label: string;
  date: string;
  sessionNumber?: number;
  subjective?: string;
  painLevel?: number;
  onNodeClick: (data: NodeDetailData) => void;
}

interface GoalNodeData {
  label: string;
  status: string;
  current_progress: number;
  priority: string;
  onNodeClick: (data: NodeDetailData) => void;
}

interface PathologyNodeData {
  label: string;
  status: string;
  severity?: string;
  onNodeClick: (data: NodeDetailData) => void;
}

interface ExerciseNodeData {
  label: string;
  onNodeClick: (data: NodeDetailData) => void;
}

interface NodeDetailData {
  type: "patient" | "session" | "goal" | "pathology" | "exercise";
  title: string;
  details: Record<string, string | number | undefined>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const safeFormatDate = (dateStr: string): string => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (!isValid(d)) return "Data inválida";
  return format(d, "dd/MM/yyyy", { locale: ptBR });
};

const truncate = (text: string | undefined, max = 28): string => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
};

const getPainEmoji = (level?: number): string => {
  if (level === undefined) return "";
  if (level <= 3) return " 🟢";
  if (level <= 6) return " 🟡";
  return " 🔴";
};

const getSeverityLabel = (severity?: string): string => {
  const map: Record<string, string> = {
    leve: "Leve",
    moderada: "Moderada",
    grave: "Grave",
    severa: "Severa",
  };
  return severity ? (map[severity.toLowerCase()] ?? severity) : "N/A";
};

const getGoalStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    em_andamento: "Em andamento",
    concluido: "Concluído",
    cancelado: "Cancelado",
    ativo: "Ativo",
  };
  return map[status] ?? status;
};

const getPathologyStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    ativo: "Ativo",
    resolvido: "Resolvido",
    cronico: "Crônico",
    em_tratamento: "Em tratamento",
  };
  return map[status] ?? status;
};

// ---------------------------------------------------------------------------
// Estilos compartilhados de nó
// ---------------------------------------------------------------------------

const nodeBaseClass =
  "relative flex flex-col items-center justify-center rounded-full border-2 shadow-lg cursor-pointer select-none transition-all duration-200 hover:scale-110 hover:shadow-xl";

// ---------------------------------------------------------------------------
// Nó: Paciente (central, cinza)
// ---------------------------------------------------------------------------

const PatientNode: React.FC<NodeProps<PatientNodeData>> = ({ data, selected }) => {
  const handleClick = () => {
    data.onNodeClick({
      type: "patient",
      title: data.label,
      details: { ID: data.patientId },
    });
  };

  return (
    <>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div
        onClick={handleClick}
        className={cn(
          nodeBaseClass,
          "w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400 text-white",
          selected && "ring-4 ring-slate-300 ring-offset-2",
        )}
      >
        <User className="w-7 h-7 mb-0.5" />
        <span className="text-[10px] font-semibold text-center leading-tight px-1 max-w-full truncate">
          {truncate(data.label, 14)}
        </span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Nó: Sessão (azul)
// ---------------------------------------------------------------------------

const SessionNode: React.FC<NodeProps<SessionNodeData>> = ({ data, selected }) => {
  const handleClick = () => {
    data.onNodeClick({
      type: "session",
      title: `Sessão ${data.sessionNumber ?? "?"}`,
      details: {
        Data: safeFormatDate(data.date),
        "Nível de dor":
          data.painLevel !== undefined
            ? `${data.painLevel}/10${getPainEmoji(data.painLevel)}`
            : "N/A",
        Subjetivo: truncate(data.subjective, 80) || "Sem registro",
      },
    });
  };

  return (
    <>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div
        onClick={handleClick}
        className={cn(
          nodeBaseClass,
          "w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 border-blue-300 text-white",
          selected && "ring-4 ring-blue-300 ring-offset-2",
        )}
      >
        <FileText className="w-4 h-4" />
        <span className="text-[9px] font-bold mt-0.5">
          {data.sessionNumber !== undefined ? `S${data.sessionNumber}` : "—"}
        </span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Nó: Meta (verde)
// ---------------------------------------------------------------------------

const GoalNode: React.FC<NodeProps<GoalNodeData>> = ({ data, selected }) => {
  const progressColor =
    data.current_progress >= 75
      ? "text-emerald-200"
      : data.current_progress >= 40
        ? "text-yellow-200"
        : "text-red-200";

  const handleClick = () => {
    data.onNodeClick({
      type: "goal",
      title: truncate(data.label, 40),
      details: {
        Status: getGoalStatusLabel(data.status),
        Progresso: `${data.current_progress}%`,
        Prioridade:
          data.priority === "alta" ? "Alta" : data.priority === "media" ? "Média" : "Baixa",
      },
    });
  };

  return (
    <>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div
        onClick={handleClick}
        className={cn(
          nodeBaseClass,
          "w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-300 text-white",
          selected && "ring-4 ring-emerald-300 ring-offset-2",
        )}
      >
        <Target className="w-4 h-4" />
        <span className={cn("text-[9px] font-bold mt-0.5", progressColor)}>
          {data.current_progress}%
        </span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Nó: Patologia (laranja/vermelho)
// ---------------------------------------------------------------------------

const PathologyNode: React.FC<NodeProps<PathologyNodeData>> = ({ data, selected }) => {
  const handleClick = () => {
    data.onNodeClick({
      type: "pathology",
      title: truncate(data.label, 40),
      details: {
        Status: getPathologyStatusLabel(data.status),
        Severidade: getSeverityLabel(data.severity),
      },
    });
  };

  return (
    <>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div
        onClick={handleClick}
        className={cn(
          nodeBaseClass,
          "w-13 h-13 w-[52px] h-[52px] bg-gradient-to-br from-orange-500 to-red-600 border-orange-300 text-white",
          selected && "ring-4 ring-orange-300 ring-offset-2",
        )}
      >
        <Activity className="w-4 h-4" />
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Nó: Exercício (roxo)
// ---------------------------------------------------------------------------

const ExerciseNode: React.FC<NodeProps<ExerciseNodeData>> = ({ data, selected }) => {
  const handleClick = () => {
    data.onNodeClick({
      type: "exercise",
      title: truncate(data.label, 40),
      details: { Nome: data.label },
    });
  };

  return (
    <>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div
        onClick={handleClick}
        className={cn(
          nodeBaseClass,
          "w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 border-purple-300 text-white",
          selected && "ring-4 ring-purple-300 ring-offset-2",
        )}
      >
        <Dumbbell className="w-4 h-4" />
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Mapa de tipos de nó (necessário fora do componente para evitar re-render)
// ---------------------------------------------------------------------------

const nodeTypes = {
  patient: PatientNode,
  session: SessionNode,
  goal: GoalNode,
  pathology: PathologyNode,
  exercise: ExerciseNode,
};

// ---------------------------------------------------------------------------
// Layout radial
// ---------------------------------------------------------------------------

function radialLayout(
  cx: number,
  cy: number,
  count: number,
  radius: number,
  startAngle = 0,
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + (2 * Math.PI * i) / count;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

// ---------------------------------------------------------------------------
// Componente de detalhe (popover lateral)
// ---------------------------------------------------------------------------

const typeConfig: Record<
  NodeDetailData["type"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  patient: {
    label: "Paciente",
    color: "text-slate-700 bg-slate-100 border-slate-300",
    icon: <User className="w-4 h-4" />,
  },
  session: {
    label: "Sessão",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <FileText className="w-4 h-4" />,
  },
  goal: {
    label: "Meta",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <Target className="w-4 h-4" />,
  },
  pathology: {
    label: "Patologia",
    color: "text-orange-700 bg-orange-50 border-orange-200",
    icon: <Activity className="w-4 h-4" />,
  },
  exercise: {
    label: "Exercício",
    color: "text-purple-700 bg-purple-50 border-purple-200",
    icon: <Dumbbell className="w-4 h-4" />,
  },
};

interface NodeDetailPanelProps {
  detail: NodeDetailData | null;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ detail, onClose }) => {
  if (!detail) return null;
  const cfg = typeConfig[detail.type];

  return (
    <div
      className={cn(
        "absolute top-3 right-3 z-10 w-64 rounded-xl border shadow-xl bg-white",
        "animate-in fade-in slide-in-from-right-4 duration-200",
      )}
    >
      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-t-xl border-b", cfg.color)}>
        {cfg.icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{cfg.label}</span>
        <button
          onClick={onClose}
          className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{detail.title}</p>
        {Object.entries(detail.details).map(([key, val]) =>
          val !== undefined && val !== "" ? (
            <div key={key} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="font-medium text-gray-500 min-w-[72px]">{key}:</span>
              <span className="text-gray-800 flex-1">{String(val)}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Legenda
// ---------------------------------------------------------------------------

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={cn("w-3 h-3 rounded-full", color)} />
    <span className="text-[10px] text-gray-600">{label}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
      <GitBranch className="w-8 h-8 text-gray-400" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-700">Nenhum dado para visualizar</p>
      <p className="text-xs text-gray-500 mt-1 max-w-xs">
        Adicione sessões, metas, patologias ou exercícios para visualizar o grafo de conhecimento do
        paciente.
      </p>
    </div>
    <div className="flex flex-wrap justify-center gap-2 mt-1">
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
        Sessões
      </Badge>
      <Badge
        variant="outline"
        className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs"
      >
        Metas
      </Badge>
      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">
        Patologias
      </Badge>
      <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 text-xs">
        Exercícios
      </Badge>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const PatientKnowledgeGraph: React.FC<PatientKnowledgeGraphProps> = ({
  patientId,
  patientName = "Paciente",
  sessions = [],
  goals = [],
  pathologies = [],
  exercises = [],
  className,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<NodeDetailData | null>(null);

  const handleNodeClick = useCallback((data: NodeDetailData) => {
    setSelectedDetail((prev) =>
      prev?.title === data.title && prev?.type === data.type ? null : data,
    );
  }, []);

  const hasData =
    sessions.length > 0 || goals.length > 0 || pathologies.length > 0 || exercises.length > 0;

  // --- Build nodes -----------------------------------------------------------
  const { initialNodes, initialEdges } = useMemo(() => {
    const CENTER_X = 400;
    const CENTER_Y = 300;

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Patient (center)
    const patientNodeId = `patient-${patientId}`;
    nodes.push({
      id: patientNodeId,
      type: "patient",
      position: { x: CENTER_X - 40, y: CENTER_Y - 40 },
      data: {
        label: patientName,
        patientId,
        onNodeClick: handleNodeClick,
      } satisfies PatientNodeData,
      draggable: true,
    });

    // Sessions – first ring (radius 160)
    const sessionPositions = radialLayout(
      CENTER_X - 28,
      CENTER_Y - 28,
      sessions.length,
      170,
      -Math.PI / 2,
    );
    sessions.forEach((s, i) => {
      const nodeId = `session-${s.id}`;
      nodes.push({
        id: nodeId,
        type: "session",
        position: {
          x: sessionPositions[i].x - 28,
          y: sessionPositions[i].y - 28,
        },
        data: {
          label: `Sessão ${s.sessionNumber ?? i + 1}`,
          date: s.date,
          sessionNumber: s.sessionNumber ?? i + 1,
          subjective: s.subjective,
          painLevel: s.painLevel,
          onNodeClick: handleNodeClick,
        } satisfies SessionNodeData,
        draggable: true,
      });
      edges.push({
        id: `e-patient-${nodeId}`,
        source: patientNodeId,
        target: nodeId,
        style: { stroke: "#93c5fd", strokeWidth: 1.5 },
        animated: false,
      });
    });

    // Goals – second ring (radius 300, offset angle)
    const goalPositions = radialLayout(
      CENTER_X - 28,
      CENTER_Y - 28,
      goals.length,
      290,
      Math.PI / 4,
    );
    goals.forEach((g, i) => {
      const nodeId = `goal-${g.id}`;
      nodes.push({
        id: nodeId,
        type: "goal",
        position: { x: goalPositions[i].x - 28, y: goalPositions[i].y - 28 },
        data: {
          label: g.goal_title,
          status: g.status,
          current_progress: g.current_progress,
          priority: g.priority,
          onNodeClick: handleNodeClick,
        } satisfies GoalNodeData,
        draggable: true,
      });
      edges.push({
        id: `e-patient-${nodeId}`,
        source: patientNodeId,
        target: nodeId,
        style: { stroke: "#6ee7b7", strokeWidth: 1.5 },
        animated: false,
      });
    });

    // Pathologies – connected to patient, ring at radius 240 (upper area)
    const pathologyPositions = radialLayout(
      CENTER_X - 26,
      CENTER_Y - 26,
      pathologies.length,
      240,
      (3 * Math.PI) / 4,
    );
    pathologies.forEach((p, i) => {
      const nodeId = `pathology-${p.id}`;
      nodes.push({
        id: nodeId,
        type: "pathology",
        position: {
          x: pathologyPositions[i].x - 26,
          y: pathologyPositions[i].y - 26,
        },
        data: {
          label: p.pathology_name,
          status: p.status,
          severity: p.severity,
          onNodeClick: handleNodeClick,
        } satisfies PathologyNodeData,
        draggable: true,
      });
      edges.push({
        id: `e-patient-${nodeId}`,
        source: patientNodeId,
        target: nodeId,
        style: { stroke: "#fdba74", strokeWidth: 1.5 },
        animated: false,
      });

      // Connect pathologies to most recent sessions (up to 2)
      sessions.slice(0, 2).forEach((s) => {
        edges.push({
          id: `e-${nodeId}-session-${s.id}`,
          source: nodeId,
          target: `session-${s.id}`,
          style: { stroke: "#fdba74", strokeWidth: 1, strokeDasharray: "4 3" },
          animated: false,
        });
      });
    });

    // Exercises – connected to sessions (distribute evenly)
    const exercisePositions = radialLayout(
      CENTER_X - 24,
      CENTER_Y - 24,
      exercises.length,
      340,
      (5 * Math.PI) / 6,
    );
    exercises.forEach((ex, i) => {
      const nodeId = `exercise-${ex.id}`;
      const exerciseName = ex.name ?? ex.exerciseName ?? `Exercício ${i + 1}`;
      nodes.push({
        id: nodeId,
        type: "exercise",
        position: {
          x: exercisePositions[i].x - 24,
          y: exercisePositions[i].y - 24,
        },
        data: {
          label: exerciseName,
          onNodeClick: handleNodeClick,
        } satisfies ExerciseNodeData,
        draggable: true,
      });

      // Connect exercise to nearest session (round-robin)
      if (sessions.length > 0) {
        const targetSession = sessions[i % sessions.length];
        edges.push({
          id: `e-${nodeId}-session-${targetSession.id}`,
          source: `session-${targetSession.id}`,
          target: nodeId,
          style: { stroke: "#c4b5fd", strokeWidth: 1, strokeDasharray: "4 3" },
          animated: false,
        });
      } else {
        edges.push({
          id: `e-patient-${nodeId}`,
          source: patientNodeId,
          target: nodeId,
          style: { stroke: "#c4b5fd", strokeWidth: 1.5 },
          animated: false,
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [patientId, patientName, sessions, goals, pathologies, exercises, handleNodeClick]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
            <Brain className="w-5 h-5 text-indigo-500" />
            Grafo de Conhecimento do Paciente
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <GitBranch className="w-3.5 h-3.5" />
            <span>
              {sessions.length + goals.length + pathologies.length + exercises.length} conexões
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative h-[520px] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
          {!hasData ? (
            <EmptyState />
          ) : (
            <>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                minZoom={0.3}
                maxZoom={2.5}
                proOptions={{ hideAttribution: true }}
                className="rounded-b-xl"
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#cbd5e1"
                  className="opacity-60"
                />
                <Controls
                  showInteractive={false}
                  className="!shadow-md !rounded-lg !border !border-gray-200 !bg-white"
                />
                <MiniMap
                  nodeColor={(n) => {
                    const type = n.type as string;
                    if (type === "patient") return "#64748b";
                    if (type === "session") return "#3b82f6";
                    if (type === "goal") return "#10b981";
                    if (type === "pathology") return "#f97316";
                    if (type === "exercise") return "#8b5cf6";
                    return "#94a3b8";
                  }}
                  maskColor="rgba(248, 250, 252, 0.85)"
                  className="!rounded-xl !border !border-gray-200 !shadow-md"
                  style={{ width: 140, height: 90 }}
                />

                {/* Legenda */}
                <Panel position="bottom-left">
                  <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2.5 shadow-md space-y-1.5 mb-2 ml-1">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Legenda
                    </p>
                    <LegendItem color="bg-slate-600" label="Paciente" />
                    <LegendItem color="bg-blue-500" label="Sessões" />
                    <LegendItem color="bg-emerald-500" label="Metas" />
                    <LegendItem color="bg-orange-500" label="Patologias" />
                    <LegendItem color="bg-purple-500" label="Exercícios" />
                  </div>
                </Panel>

                {/* Estatísticas no topo */}
                <Panel position="top-left">
                  <div className="flex gap-2 mt-2 ml-1">
                    {sessions.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                        <FileText className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-semibold text-blue-700">
                          {sessions.length} {sessions.length === 1 ? "Sessão" : "Sessões"}
                        </span>
                      </div>
                    )}
                    {goals.length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                        <Target className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-700">
                          {goals.length} {goals.length === 1 ? "Meta" : "Metas"}
                        </span>
                      </div>
                    )}
                    {pathologies.length > 0 && (
                      <div className="bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                        <Activity className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px] font-semibold text-orange-700">
                          {pathologies.length}{" "}
                          {pathologies.length === 1 ? "Patologia" : "Patologias"}
                        </span>
                      </div>
                    )}
                    {exercises.length > 0 && (
                      <div className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                        <Dumbbell className="w-3 h-3 text-purple-500" />
                        <span className="text-[10px] font-semibold text-purple-700">
                          {exercises.length} {exercises.length === 1 ? "Exercício" : "Exercícios"}
                        </span>
                      </div>
                    )}
                  </div>
                </Panel>
              </ReactFlow>

              {/* Painel de detalhe do nó selecionado */}
              <NodeDetailPanel detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
