import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Phone, Mail, MessageSquare, ArrowRight, UserCheck, UserX } from 'lucide-react';
import { useLeads, useCreateLead, useUpdateLead, useLeadMetrics, Lead } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ESTAGIOS = [
  { value: 'aguardando', label: 'Aguardando', color: 'bg-gray-500' },
  { value: 'em_contato', label: 'Em Contato', color: 'bg-blue-500' },
  { value: 'avaliacao_agendada', label: 'Avaliação Agendada', color: 'bg-yellow-500' },
  { value: 'avaliacao_realizada', label: 'Avaliação Realizada', color: 'bg-purple-500' },
  { value: 'efetivado', label: 'Efetivado', color: 'bg-green-500' },
  { value: 'nao_efetivado', label: 'Não Efetivado', color: 'bg-red-500' },
];

const ORIGENS = ['Instagram', 'Google', 'Indicação', 'Evento', 'Site', 'Facebook', 'WhatsApp', 'Outro'];

export default function LeadsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [filtroEstagio, setFiltroEstagio] = useState<string>('');

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: '',
    interesse: '',
    observacoes: '',
    estagio: 'aguardando' as Lead['estagio'],
  });

  const { data: leads = [] } = useLeads(filtroEstagio || undefined);
  const { data: metrics } = useLeadMetrics();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        nome: lead.nome,
        telefone: lead.telefone || '',
        email: lead.email || '',
        origem: lead.origem || '',
        interesse: lead.interesse || '',
        observacoes: lead.observacoes || '',
        estagio: lead.estagio,
      });
    } else {
      setEditingLead(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        origem: '',
        interesse: '',
        observacoes: '',
        estagio: 'aguardando',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      await updateMutation.mutateAsync({ id: editingLead.id, ...formData });
    } else {
      await createMutation.mutateAsync({
        ...formData,
        data_primeiro_contato: new Date().toISOString().split('T')[0],
        data_ultimo_contato: null,
        responsavel_id: null,
        motivo_nao_efetivacao: null,
      });
    }
    setIsDialogOpen(false);
  };

  const handleMoveEstagio = async (lead: Lead, novoEstagio: Lead['estagio']) => {
    await updateMutation.mutateAsync({ id: lead.id, estagio: novoEstagio });
  };

  const getEstagioInfo = (estagio: string) => ESTAGIOS.find(e => e.value === estagio) || ESTAGIOS[0];

  // Agrupar leads por estágio para visualização Kanban
  const leadsPorEstagio = ESTAGIOS.reduce((acc, estagio) => {
    acc[estagio.value] = leads.filter(l => l.estagio === estagio.value);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Leads / Prospecções
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie seus potenciais clientes</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{metrics?.porEstagio.em_contato || 0}</div>
              <p className="text-sm text-muted-foreground">Em Contato</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{metrics?.porEstagio.avaliacao_agendada || 0}</div>
              <p className="text-sm text-muted-foreground">Avaliações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{metrics?.porEstagio.efetivado || 0}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><UserCheck className="h-4 w-4" />Efetivados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{metrics?.taxaConversao}%</div>
              <p className="text-sm text-muted-foreground">Taxa Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {ESTAGIOS.map(estagio => (
            <Card key={estagio.value} className="min-w-[250px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${estagio.color}`} />
                    {estagio.label}
                  </div>
                  <Badge variant="secondary">{leadsPorEstagio[estagio.value]?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {leadsPorEstagio[estagio.value]?.map(lead => (
                  <div
                    key={lead.id}
                    className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleOpenDialog(lead)}
                  >
                    <p className="font-medium truncate">{lead.nome}</p>
                    {lead.telefone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.telefone}
                      </p>
                    )}
                    {lead.origem && (
                      <Badge variant="outline" className="mt-1 text-xs">{lead.origem}</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select value={formData.origem} onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interesse</Label>
                  <Input value={formData.interesse} onChange={(e) => setFormData(prev => ({ ...prev, interesse: e.target.value }))} placeholder="Ex: Pilates, Fisioterapia" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estágio</Label>
                <Select value={formData.estagio} onValueChange={(v) => setFormData(prev => ({ ...prev, estagio: v as Lead['estagio'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTAGIOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingLead ? 'Salvar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
