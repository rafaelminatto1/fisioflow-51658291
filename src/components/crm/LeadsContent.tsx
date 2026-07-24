import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Search,
  Kanban,
  BarChart3,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { useLeads, useLeadMetrics, useUpdateLead, Lead } from "@/hooks/useLeads";
import { LeadDialog } from "@/components/crm/LeadDialog";
import { LeadDetailSheet } from "@/components/crm/LeadDetailSheet";
import { LeadFunnel } from "@/components/crm/LeadFunnel";
import { PostConversionDialog } from "@/components/crm/PostConversionDialog";
import { KanbanLeadCard } from "@/components/crm/KanbanLeadCard";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";

const ESTAGIOS = [
  { value: "aguardando", label: "Aguardando", color: "bg-slate-500" },
  { value: "em_contato", label: "Em Contato", color: "bg-blue-500" },
  {
    value: "avaliacao_agendada",
    label: "Avaliação Agendada",
    color: "bg-amber-500",
  },
  {
    value: "avaliacao_realizada",
    label: "Avaliação Realizada",
    color: "bg-emerald-500",
  },
  { value: "efetivado", label: "Efetivado", color: "bg-emerald-500" },
  { value: "nao_efetivado", label: "Não Efetivado", color: "bg-rose-500" },
];

export function LeadsContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("");
  const [filtroTemperatura, setFiltroTemperatura] = useState<string>("");
  const [ordenacao, setOrdenacao] = useState<"recentes" | "valor" | "score">("recentes");
  const [activeTab, setActiveTab] = useState("kanban");
  const [defaultStageForNewLead, setDefaultStageForNewLead] = useState<string>("aguardando");

  const { data: leads = [] } = useLeads();
  const { data: metrics } = useLeadMetrics();
  const updateMutation = useUpdateLead();

  // Filtrar e Ordenar Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        const matchesSearch =
          !searchTerm ||
          lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.telefone?.includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesOrigem = !filtroOrigem || lead.origem === filtroOrigem;
        const matchesTemperatura =
          !filtroTemperatura || (lead as any).contact_score_temperature === filtroTemperatura;

        return matchesSearch && matchesOrigem && matchesTemperatura;
      })
      .sort((a, b) => {
        if (ordenacao === "valor") {
          return (Number((b as any).valor_estimado) || 0) - (Number((a as any).valor_estimado) || 0);
        }
        if (ordenacao === "score") {
          return (Number((b as any).contact_score) || 0) - (Number((a as any).contact_score) || 0);
        }
        // padrão: mais recentes
        const dateA = new Date(a.data_ultimo_contato || (a as any).created_at || 0).getTime();
        const dateB = new Date(b.data_ultimo_contato || (b as any).created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [leads, searchTerm, filtroOrigem, filtroTemperatura, ordenacao]);

  // Agrupar leads por estágio
  const leadsPorEstagio = useMemo(() => {
    return ESTAGIOS.reduce(
      (acc, estagio) => {
        acc[estagio.value] = filteredLeads.filter((l) => l.estagio === estagio.value);
        return acc;
      },
      {} as Record<string, Lead[]>,
    );
  }, [filteredLeads]);

  // Valor Total em Potencial do Pipeline Geral
  const valorTotalPipeline = useMemo(() => {
    return filteredLeads
      .filter((l) => l.estagio !== "nao_efetivado")
      .reduce((sum, l) => {
        const val = Number((l as any).valor_estimado);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }, [filteredLeads]);

  // Origens únicas
  const origensUnicas = useMemo(() => {
    return [...new Set(leads.map((l) => l.origem).filter(Boolean))];
  }, [leads]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const leadId = result.draggableId;
    const novoEstagio = result.destination.droppableId as Lead["estagio"];

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.estagio !== novoEstagio) {
      await updateMutation.mutateAsync({ id: leadId, estagio: novoEstagio });
      toast.success(`Lead movido para ${ESTAGIOS.find((e) => e.value === novoEstagio)?.label}`);
      if (novoEstagio === "efetivado") {
        setConversionLead({ ...lead, estagio: novoEstagio });
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Nome",
      "Telefone",
      "Email",
      "Origem",
      "Interesse",
      "Valor Estimado",
      "Estágio",
      "Data Primeiro Contato",
      "Data Último Contato",
    ];
    const rows = filteredLeads.map((lead) => [
      lead.nome,
      lead.telefone || "",
      lead.email || "",
      lead.origem || "",
      lead.interesse || "",
      (lead as any).valor_estimado || "0",
      ESTAGIOS.find((e) => e.value === lead.estagio)?.label || "",
      lead.data_primeiro_contato || "",
      lead.data_ultimo_contato || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_kanban_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV do Kanban exportado com sucesso!");
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsDialogOpen(true);
  };

  const handleOpenNew = (estagioInicial?: string) => {
    setEditingLead(null);
    if (estagioInicial) {
      setDefaultStageForNewLead(estagioInicial);
    } else {
      setDefaultStageForNewLead("aguardando");
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controles Globais */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 tracking-tight text-foreground">
            <Users className="h-7 w-7 text-primary" />
            CRM Pipeline de Leads
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão visual do funil comercial, controle de SLA e atalhos rápidos de atendimento
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-xl">
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => handleOpenNew()} className="rounded-xl shadow-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Grid de KPIs do Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono">{metrics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total no Pipeline</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {metrics?.porEstagio?.em_contato || 0}
            </div>
            <p className="text-xs text-muted-foreground">Em Contato</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics?.porEstagio?.avaliacao_agendada || 0}
            </div>
            <p className="text-xs text-muted-foreground">Avaliações Agendadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics?.porEstagio?.efetivado || 0}
            </div>
            <p className="text-xs text-muted-foreground">Efetivados / Pacientes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              R$ {valorTotalPipeline.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Pipeline Ativo
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-3.5">
            <div className="text-xl font-bold font-mono text-primary flex items-center gap-1">
              {metrics?.taxaConversao || 0}%
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros Pro e Alternância de Visão */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card/60 p-3 rounded-xl border">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>

          {/* Filtro Origem */}
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="h-9 px-3 border rounded-lg bg-background text-xs text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas as Origens</option>
            {origensUnicas.map((origem) => (
              <option key={origem} value={origem!}>
                {origem}
              </option>
            ))}
          </select>

          {/* Filtro Temperatura */}
          <select
            value={filtroTemperatura}
            onChange={(e) => setFiltroTemperatura(e.target.value)}
            className="h-9 px-3 border rounded-lg bg-background text-xs text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas as Temperaturas</option>
            <option value="hot">🔥 Quente (Alta Intenção)</option>
            <option value="warm">☀️ Morno</option>
            <option value="cold">❄️ Frio</option>
          </select>

          {/* Ordenação */}
          <div className="flex items-center gap-1 bg-background border rounded-lg px-2 h-9">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="bg-transparent text-xs text-foreground focus:outline-none"
            >
              <option value="recentes">Mais recentes</option>
              <option value="valor">Maior valor R$</option>
              <option value="score">Maior Lead Score</option>
            </select>
          </div>
        </div>

        {/* Tab Switcher Kanban vs Funil */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 p-0.5 rounded-lg">
            <TabsTrigger value="kanban" className="gap-1.5 text-xs h-8 rounded-md">
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5 text-xs h-8 rounded-md">
              <BarChart3 className="h-3.5 w-3.5" />
              Funil
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo Principal do Kanban / Funil */}
      {activeTab === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {ESTAGIOS.map((estagio) => {
              const leadsColuna = leadsPorEstagio[estagio.value] || [];
              const valorTotalColuna = leadsColuna.reduce((sum, l) => {
                const val = Number((l as any).valor_estimado);
                return sum + (isNaN(val) ? 0 : val);
              }, 0);

              return (
                <Droppable key={estagio.value} droppableId={estagio.value}>
                  {(provided, snapshot) => (
                    <Card
                      className={`min-w-[295px] w-[295px] flex-shrink-0 transition-all rounded-2xl shadow-xs border ${
                        snapshot.isDraggingOver ? "ring-2 ring-primary bg-primary/5" : "bg-card"
                      }`}
                    >
                      {/* Header da Coluna */}
                      <CardHeader className="pb-2.5 pt-3.5 px-3.5 border-b border-border/40 mb-2">
                        <CardTitle className="text-sm flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${estagio.color} shadow-xs`} />
                              <span className="font-semibold tracking-tight">{estagio.label}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 rounded-md">
                                {leadsColuna.length}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                                title={`Adicionar Lead em ${estagio.label}`}
                                onClick={() => handleOpenNew(estagio.value)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {valorTotalColuna > 0 && (
                            <div className="flex justify-between items-center text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-0.5">
                              <span className="text-muted-foreground font-normal text-[10px]">Valor da Coluna:</span>
                              <span className="font-semibold">R$ {valorTotalColuna.toLocaleString("pt-BR")}</span>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>

                      {/* Conteúdo da Coluna com Cards */}
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2.5 min-h-[260px] max-h-[calc(100vh-360px)] overflow-y-auto p-2.5 scrollbar-thin"
                      >
                        {leadsColuna.map((lead, index) => (
                          <KanbanLeadCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            onSelectLead={setSelectedLead}
                            onOpenEdit={handleOpenEdit}
                          />
                        ))}
                        {provided.placeholder}
                        {leadsColuna.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground/50 text-xs border border-dashed rounded-xl m-1 space-y-1">
                            <Sparkles className="w-4 h-4 mx-auto text-muted-foreground/40" />
                            <p>Sem leads nesta etapa</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <LeadFunnel leads={filteredLeads} estagios={ESTAGIOS} />
      )}

      {/* Modais e Dialogs */}
      <LeadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        lead={editingLead}
        estagios={ESTAGIOS}
      />

      <LeadDetailSheet
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={handleOpenEdit}
        estagios={ESTAGIOS}
      />

      <PostConversionDialog
        open={!!conversionLead}
        onClose={() => setConversionLead(null)}
        lead={conversionLead}
      />
    </div>
  );
}
