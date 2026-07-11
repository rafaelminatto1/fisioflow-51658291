import "@/styles/bundles/exercises-protocols.css";

import { lazy, Suspense, useDeferredValue, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Grid3X3,
  Layers,
  ListFilter,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageContainer, PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { cn } from "@/lib/utils";
import { useExerciseProtocols, type ExerciseProtocol } from "@/hooks/useExerciseProtocols";

const NewProtocolModal = lazy(() =>
  import("@/components/modals/NewProtocolModal").then((m) => ({ default: m.NewProtocolModal })),
);
const ProtocolDetailView = lazy(() => import("@/components/exercises/ProtocolDetailView"));

type ViewMode = "grid" | "list";

const TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "pos_operatorio", label: "Pós-operatório" },
  { value: "conservador", label: "Conservador" },
  { value: "patologia", label: "Patologia" },
  { value: "esportivo", label: "Esportivo" },
  { value: "preventivo", label: "Preventivo" },
  { value: "funcional", label: "Funcional" },
  { value: "neurologico", label: "Neurológico" },
  { value: "respiratorio", label: "Respiratório" },
  { value: "geriatria", label: "Geriatria" },
] as const;

const EVIDENCE_OPTIONS = [
  { value: "all", label: "Todas evidências" },
  { value: "A", label: "Evidência A" },
  { value: "B", label: "Evidência B" },
  { value: "C", label: "Evidência C" },
  { value: "D", label: "Evidência D" },
] as const;

const DURATION_OPTIONS = [
  { value: "all", label: "Todas durações" },
  { value: "short", label: "Até 8 semanas" },
  { value: "medium", label: "9 a 16 semanas" },
  { value: "long", label: "17+ semanas" },
] as const;

const SORT_OPTIONS = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "evidence", label: "Maior evidência" },
  { value: "duration", label: "Menor duração" },
  { value: "name", label: "A-Z" },
] as const;

const REGION_RULES = [
  { value: "spine", label: "Coluna", terms: ["coluna", "lombar", "cervical", "torac", "disco"] },
  { value: "shoulder", label: "Ombro", terms: ["ombro", "manguito", "clavicula", "escapula"] },
  { value: "elbow", label: "Cotovelo", terms: ["cotovelo", "epicond"] },
  { value: "wrist_hand", label: "Punho e mão", terms: ["punho", "mao", "mão", "dedo", "carpo"] },
  { value: "hip", label: "Quadril", terms: ["quadril", "coxofemoral"] },
  { value: "knee", label: "Joelho", terms: ["joelho", "lca", "lcp", "menisco", "patelar"] },
  { value: "ankle_foot", label: "Tornozelo e pé", terms: ["tornozelo", "pe", "pé", "aquiles"] },
  { value: "neuro", label: "Neurológico", terms: ["avc", "parkinson", "neuro", "vestibular"] },
  { value: "cardioresp", label: "Cardiorrespiratório", terms: ["respirat", "cardio", "pulmonar"] },
] as const;

const REGION_OPTIONS = [{ value: "all", label: "Todas regiões" }, ...REGION_RULES] as const;

const QUICK_FILTERS = [
  { value: "all", label: "Todos", icon: Layers },
  { value: "pos_operatorio", label: "Pós-op", icon: CalendarClock },
  { value: "conservador", label: "Conservador", icon: ShieldCheck },
  { value: "high_evidence", label: "Alta evidência", icon: BookOpenCheck },
  { value: "with_safety", label: "Com segurança", icon: AlertTriangle },
] as const;

const normalize = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function getTypeLabel(value?: string) {
  return TYPE_OPTIONS.find((option) => option.value === value)?.label || "Protocolo";
}

function getEvidenceLevel(protocol: ExerciseProtocol) {
  const level = normalize(protocol.evidence_level).toUpperCase();
  return ["A", "B", "C", "D"].includes(level) ? level : "N/A";
}

function evidenceScore(protocol: ExerciseProtocol) {
  const level = getEvidenceLevel(protocol);
  return { A: 4, B: 3, C: 2, D: 1, "N/A": 0 }[level] ?? 0;
}

function getRegion(protocol: ExerciseProtocol) {
  const source = normalize(
    [
      protocol.name,
      protocol.condition_name,
      protocol.description,
      ...(protocol.tags || []),
      ...(protocol.clinical_tests || []),
    ].join(" "),
  );

  return (
    REGION_RULES.find((region) =>
      region.terms.some((term) => source.includes(normalize(term))),
    ) || { value: "general", label: "Geral" }
  );
}

function getSearchBlob(protocol: ExerciseProtocol) {
  const references = (protocol.references || [])
    .map((reference) => [reference.title, reference.authors, reference.journal, reference.year].join(" "))
    .join(" ");

  return normalize(
    [
      protocol.name,
      protocol.condition_name,
      protocol.description,
      protocol.protocol_type,
      protocol.evidence_level,
      ...(protocol.tags || []),
      ...(protocol.icd10_codes || []),
      ...(protocol.clinical_tests || []),
      references,
    ].join(" "),
  );
}

function matchesDuration(protocol: ExerciseProtocol, duration: string) {
  if (duration === "all") return true;
  const weeks = protocol.weeks_total || 0;
  if (duration === "short") return weeks > 0 && weeks <= 8;
  if (duration === "medium") return weeks >= 9 && weeks <= 16;
  return weeks >= 17;
}

function ProtocolCard({
  protocol,
  viewMode,
  onOpen,
  onEdit,
  onDelete,
}: {
  protocol: ExerciseProtocol;
  viewMode: ViewMode;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const region = getRegion(protocol);
  const evidence = getEvidenceLevel(protocol);
  const milestones = Array.isArray(protocol.milestones) ? protocol.milestones.length : 0;
  const restrictions = Array.isArray(protocol.restrictions) ? protocol.restrictions.length : 0;
  const references = Array.isArray(protocol.references) ? protocol.references.length : 0;

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md",
        viewMode === "list" ? "p-4" : "p-0",
      )}
      onClick={onOpen}
    >
      <div
        className={cn(
          "flex gap-4",
          viewMode === "grid" ? "min-h-[260px] flex-col p-5" : "items-center",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                  {getTypeLabel(protocol.protocol_type)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    evidence === "A" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    evidence === "B" && "border-blue-200 bg-blue-50 text-blue-700",
                    (evidence === "C" || evidence === "D") &&
                      "border-amber-200 bg-amber-50 text-amber-700",
                  )}
                >
                  Evidência {evidence}
                </Badge>
              </div>
              <h3 className="mt-3 line-clamp-2 text-base font-black leading-tight text-slate-950 group-hover:text-brand-blue">
                {protocol.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                {protocol.condition_name || region.label}
              </p>
            </div>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue" />
        </div>

        <div
          className={cn(
            "grid gap-2 text-xs font-semibold text-slate-600",
            viewMode === "grid" ? "grid-cols-2" : "ml-auto hidden min-w-[360px] grid-cols-4 md:grid",
          )}
        >
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              Duração
            </div>
            <div className="mt-1 text-slate-900">{protocol.weeks_total || "-"} sem.</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Activity className="h-3.5 w-3.5" />
              Região
            </div>
            <div className="mt-1 text-slate-900">{region.label}</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marcos
            </div>
            <div className="mt-1 text-slate-900">{milestones}</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <BookOpenCheck className="h-3.5 w-3.5" />
              Fontes
            </div>
            <div className="mt-1 text-slate-900">{references}</div>
          </div>
        </div>

        {viewMode === "grid" && (
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {restrictions} restrições
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-slate-500 hover:text-brand-blue"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                title="Editar protocolo"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-slate-500 hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                title="Excluir protocolo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Protocols() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeProtocolId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    protocols,
    loading,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    isCreating,
    isUpdating,
    isDeleting,
  } = useExerciseProtocols();

  const rawSearch = searchParams.get("q") || "";
  const search = useDeferredValue(rawSearch);
  const type = searchParams.get("type") || "all";
  const region = searchParams.get("region") || "all";
  const evidence = searchParams.get("evidence") || "all";
  const duration = searchParams.get("duration") || "all";
  const quick = searchParams.get("quick") || "all";
  const sort = searchParams.get("sort") || "relevance";

  const selectedProtocol = useMemo(
    () => protocols.find((protocol) => protocol.id === routeProtocolId) || null,
    [protocols, routeProtocolId],
  );

  const stats = useMemo(() => {
    const highEvidence = protocols.filter((protocol) => evidenceScore(protocol) >= 3).length;
    const postOp = protocols.filter((protocol) => protocol.protocol_type === "pos_operatorio").length;
    const withSafety = protocols.filter((protocol) => (protocol.restrictions || []).length > 0).length;

    return { total: protocols.length, highEvidence, postOp, withSafety };
  }, [protocols]);

  const filteredProtocols = useMemo(() => {
    const query = normalize(search);

    return protocols
      .filter((protocol) => {
        if (query && !getSearchBlob(protocol).includes(query)) return false;
        if (type !== "all" && protocol.protocol_type !== type) return false;
        if (region !== "all" && getRegion(protocol).value !== region) return false;
        if (evidence !== "all" && getEvidenceLevel(protocol) !== evidence) return false;
        if (!matchesDuration(protocol, duration)) return false;
        if (quick === "pos_operatorio" && protocol.protocol_type !== "pos_operatorio") return false;
        if (quick === "conservador" && protocol.protocol_type !== "conservador") return false;
        if (quick === "high_evidence" && evidenceScore(protocol) < 3) return false;
        if (quick === "with_safety" && (protocol.restrictions || []).length === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
        if (sort === "duration") return (a.weeks_total || 999) - (b.weeks_total || 999);
        if (sort === "evidence") return evidenceScore(b) - evidenceScore(a);
        if (!query) return evidenceScore(b) - evidenceScore(a) || a.name.localeCompare(b.name, "pt-BR");
        return getSearchBlob(a).indexOf(query) - getSearchBlob(b).indexOf(query);
      });
  }, [duration, evidence, protocols, quick, region, search, sort, type]);

  const hasFilters = Boolean(rawSearch) || type !== "all" || region !== "all" || evidence !== "all" || duration !== "all" || quick !== "all";

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === "all") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["q", "type", "region", "evidence", "duration", "quick"].forEach((key) => next.delete(key));
      return next;
    });
  };

  const openProtocol = (protocol: ExerciseProtocol) => {
    navigate(`/protocols/${protocol.id}${location.search}`);
  };

  const closeProtocol = () => {
    navigate(`/protocols${location.search}`);
  };

  const handleSubmit = (data: any) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProtocol(deleteId);
    setDeleteId(null);
    if (routeProtocolId === deleteId) closeProtocol();
  };

  return (
    <PageLayout fullWidth compactHeader>
      <PageContainer maxWidth="full">
        <PageHeader
          title="Protocolos"
          subtitle="Diretrizes clínicas, progressões e marcos funcionais em uma área dedicada."
          icon={Layers}
          actions={
            <Button
              className="h-10 rounded-2xl bg-brand-blue px-5 font-bold shadow-sm hover:bg-brand-blue/90"
              onClick={() => {
                setEditingProtocol(null);
                setShowModal(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Protocolo
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Total</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{stats.total}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">protocolos cadastrados</div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Evidência</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{stats.highEvidence}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">nível A ou B</div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Pós-op</div>
            <div className="mt-2 text-2xl font-black text-brand-blue">{stats.postOp}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">protocolos cirúrgicos</div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Segurança</div>
            <div className="mt-2 text-2xl font-black text-amber-600">{stats.withSafety}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">com restrições registradas</div>
          </Card>
        </div>

        <Card className="sticky top-0 z-20 mt-5 border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={rawSearch}
                onChange={(event) => setParam("q", event.target.value)}
                placeholder="Buscar por protocolo, condição, CID, tag, teste ou referência..."
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-5 xl:flex xl:w-auto">
              <Select value={type} onValueChange={(value) => setParam("type", value)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white xl:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={region} onValueChange={(value) => setParam("region", value)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white xl:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={evidence} onValueChange={(value) => setParam("evidence", value)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white xl:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={duration} onValueChange={(value) => setParam("duration", value)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white xl:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => setParam("sort", value)}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white xl:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_FILTERS.map((item) => {
                const Icon = item.icon;
                const active = quick === item.value;

                return (
                  <Button
                    key={item.value}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-9 shrink-0 rounded-2xl font-bold",
                      active ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "border-slate-200 bg-white text-slate-600",
                    )}
                    onClick={() => setParam("quick", item.value)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <ListFilter className="h-4 w-4" />
                {filteredProtocols.length} resultados
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 rounded-2xl" onClick={clearFilters}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setViewMode("grid")}
                  title="Grade"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setViewMode("list")}
                  title="Lista"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-5 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} className="h-[260px] rounded-2xl" />
              ))}
            </div>
          ) : filteredProtocols.length === 0 ? (
            <Card className="flex min-h-[320px] flex-col items-center justify-center border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">Nenhum protocolo encontrado</h2>
              <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                Ajuste os filtros ou cadastre um protocolo com metadados clínicos mais completos.
              </p>
            </Card>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1",
              )}
            >
              {filteredProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  viewMode={viewMode}
                  onOpen={() => openProtocol(protocol)}
                  onEdit={() => {
                    setEditingProtocol(protocol);
                    setShowModal(true);
                  }}
                  onDelete={() => setDeleteId(protocol.id)}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {selectedProtocol && (
        <Suspense fallback={null}>
          <ProtocolDetailView
            protocol={selectedProtocol}
            onClose={closeProtocol}
            onEdit={(protocol) => {
              setEditingProtocol(protocol);
              setShowModal(true);
            }}
          />
        </Suspense>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-slate-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-950">
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o protocolo selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive font-bold text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir protocolo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense fallback={null}>
        <NewProtocolModal
          open={showModal}
          onOpenChange={(open: boolean) => {
            setShowModal(open);
            if (!open) setEditingProtocol(null);
          }}
          onSubmit={handleSubmit}
          protocol={editingProtocol || undefined}
          isLoading={isCreating || isUpdating}
        />
      </Suspense>
    </PageLayout>
  );
}
