import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Users, Plus, Phone, Mail, Search, Kanban, BarChart3, Download } from 'lucide-react';
import { useLeads, useLeadMetrics } from '@/hooks/useLeads';
import { LeadDialog } from '@/components/crm/LeadDialog';
import { LeadDetailSheet } from '@/components/crm/LeadDetailSheet';
import { LeadFunnel } from '@/components/crm/LeadFunnel';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useUpdateLead, Lead } from '@/hooks/useLeads';
import { toast } from 'sonner';

const ESTAGIOS = [
  { value: 'aguardando', label: 'Aguardando', color: 'bg-slate-500' },
  { value: 'em_contato', label: 'Em Contato', color: 'bg-blue-500' },
  { value: 'avaliacao_agendada', label: 'Avaliação Agendada', color: 'bg-amber-500' },
  { value: 'avaliacao_realizada', label: 'Avaliação Realizada', color: 'bg-purple-500' },
  { value: 'efetivado', label: 'Efetivado', color: 'bg-emerald-500' },
  { value: 'nao_efetivado', label: 'Não Efetivado', color: 'bg-rose-500' },
];

export function LeadsContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('');
  const [activeTab, setActiveTab] = useState('kanban');

  const { data: leads = [] } = useLeads();
  const { data: metrics } = useLeadMetrics();
  const updateMutation = useUpdateLead();

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm ||
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrigem = !filtroOrigem || lead.origem === filtroOrigem;
    return matchesSearch && matchesOrigem;
  });

  // Agrupar leads por estágio
  const leadsPorEstagio = ESTAGIOS.reduce((acc, estagio) => {
    acc[estagio.value] = filteredLeads.filter(l => l.estagio === estagio.value);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Origens únicas
  const origensUnicas = [...new Set(leads.map(l => l.origem).filter(Boolean))];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const leadId = result.draggableId;
    const novoEstagio = result.destination.droppableId as Lead['estagio'];

    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.estagio !== novoEstagio) {
      await updateMutation.mutateAsync({ id: leadId, estagio: novoEstagio });
      toast.success(`Lead movido para ${ESTAGIOS.find(e => e.value === novoEstagio)?.label}`);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Origem', 'Interesse', 'Estágio', 'Data Primeiro Contato', 'Data Último Contato'];
    const rows = filteredLeads.map(lead => [
      lead.nome,
      lead.telefone || '',
      lead.email || '',
      lead.origem || '',
      lead.interesse || '',
      ESTAGIOS.find(e => e.value === lead.estagio)?.label || '',
      lead.data_primeiro_contato || '',
      lead.data_ultimo_contato || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso!');
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingLead(null);
    setIsDialogOpen(true);
  };

  const getEstagioInfo = (estagio: string) => ESTAGIOS.find(e => e.value === estagio) || ESTAGIOS[0];

  return (

    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            CRM - Leads
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus potenciais clientes e acompanhe conversões</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{metrics?.porEstagio?.em_contato || 0}</div>
            <p className="text-sm text-muted-foreground">Em Contato</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{metrics?.porEstagio?.avaliacao_agendada || 0}</div>
            <p className="text-sm text-muted-foreground">Avaliações</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{metrics?.porEstagio?.avaliacao_realizada || 0}</div>
            <p className="text-sm text-muted-foreground">Realizadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{metrics?.porEstagio?.efetivado || 0}</div>
            <p className="text-sm text-muted-foreground">Efetivados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{metrics?.taxaConversao || 0}%</div>
            <p className="text-sm text-muted-foreground">Conversão</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value="">Todas origens</option>
            {origensUnicas.map(origem => (
              <option key={origem} value={origem!}>{origem}</option>
            ))}
          </select>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Funil
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo */}
      {activeTab === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {ESTAGIOS.map(estagio => (
              <Droppable key={estagio.value} droppableId={estagio.value}>
                {(provided, snapshot) => (
                  <Card
                    className={`min-w-[280px] flex-shrink-0 transition-colors ${snapshot.isDraggingOver ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${estagio.color}`} />
                          {estagio.label}
                        </div>
                        <Badge variant="secondary">{leadsPorEstagio[estagio.value]?.length || 0}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto"
                    >
                      {leadsPorEstagio[estagio.value]?.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary rotate-2' : ''
                                }`}
                              onClick={() => setSelectedLead(lead)}
                            >
                              <p className="font-medium truncate">{lead.nome}</p>
                              <div className="flex flex-col gap-1 mt-2">
                                {lead.telefone && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {lead.telefone}
                                  </p>
                                )}
                                {lead.email && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3" />
                                    {lead.email}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                {lead.origem && (
                                  <Badge variant="outline" className="text-xs">{lead.origem}</Badge>
                                )}
                                {lead.interesse && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                    {lead.interesse}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {leadsPorEstagio[estagio.value]?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum lead
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <LeadFunnel leads={filteredLeads} estagios={ESTAGIOS} />
      )}

      {/* Dialogs */}
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
    </div>
  );
}

export default function LeadsPage() {
  return (
    <MainLayout>
      <LeadsContent />
    </MainLayout>
  );
}
