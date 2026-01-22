import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import {
  Plus, Phone, Mail, MessageSquare, Calendar, Clock,
  CheckCircle2, Trash2, Users
} from 'lucide-react';
import { useCRMTarefas, useCreateTarefa, useConcluirTarefa, useDeleteTarefa } from '@/hooks/useCRM';
import { useLeads } from '@/hooks/useLeads';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_TAREFA = [
  { value: 'follow_up', label: 'Follow-up', icon: Users, color: 'bg-blue-500' },
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-green-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500' },
  { value: 'reuniao', label: 'Reunião', icon: Calendar, color: 'bg-orange-500' },
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-slate-400' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-amber-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-rose-500' },
];

interface CRMTarefasProps {
  leadId?: string;
  compact?: boolean;
}

export function CRMTarefas({ leadId, compact = false }: CRMTarefasProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'follow_up',
    prioridade: 'normal',
    data_vencimento: '',
    hora_vencimento: '',
    lead_id: leadId || '',
  });

  const { data: tarefas = [] } = useCRMTarefas(leadId);
  const { data: leads = [] } = useLeads();
  const createMutation = useCreateTarefa();
  const concluirMutation = useConcluirTarefa();
  const deleteMutation = useDeleteTarefa();

  const tarefasPendentes = tarefas.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
  const tarefasConcluidas = tarefas.filter(t => t.status === 'concluida');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      lead_id: formData.lead_id || null,
      data_vencimento: formData.data_vencimento || null,
      hora_vencimento: formData.hora_vencimento || null,
      status: 'pendente',
      responsavel_id: null,
    } as any);
    setIsDialogOpen(false);
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'follow_up',
      prioridade: 'normal',
      data_vencimento: '',
      hora_vencimento: '',
      lead_id: leadId || '',
    });
  };

  const getDateBadge = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return <Badge variant="destructive" className="text-xs">Atrasada</Badge>;
    if (isToday(d)) return <Badge className="bg-amber-500 text-xs">Hoje</Badge>;
    if (isTomorrow(d)) return <Badge className="bg-blue-500 text-xs">Amanhã</Badge>;
    return null;
  };

  const getTipoInfo = (tipo: string) => TIPOS_TAREFA.find(t => t.value === tipo) || TIPOS_TAREFA[0];
  const getPrioridadeInfo = (prioridade: string) => PRIORIDADES.find(p => p.value === prioridade) || PRIORIDADES[1];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Tarefas</h4>
          <Button size="sm" variant="ghost" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tarefasPendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
        ) : (
          <div className="space-y-1">
            {tarefasPendentes.slice(0, 3).map(tarefa => {
              const TipoIcon = getTipoInfo(tarefa.tipo).icon;
              return (
                <div key={tarefa.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                  <Checkbox
                    checked={tarefa.status === 'concluida'}
                    onCheckedChange={() => concluirMutation.mutate(tarefa.id)}
                  />
                  <TipoIcon className="h-3 w-3" />
                  <span className="flex-1 truncate">{tarefa.titulo}</span>
                  {getDateBadge(tarefa.data_vencimento)}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_TAREFA.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>Criar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Tarefas
          </CardTitle>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {tarefasPendentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma tarefa pendente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tarefasPendentes.map(tarefa => {
                const TipoIcon = getTipoInfo(tarefa.tipo).icon;
                const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade);
                return (
                  <div
                    key={tarefa.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={tarefa.status === 'concluida'}
                      onCheckedChange={() => concluirMutation.mutate(tarefa.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${getTipoInfo(tarefa.tipo).color}`}>
                          <TipoIcon className="h-3 w-3 text-white" />
                        </div>
                        <span className="font-medium truncate">{tarefa.titulo}</span>
                        <div className={`w-2 h-2 rounded-full ${prioridadeInfo.color}`} />
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {tarefa.data_vencimento && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}
                            {tarefa.hora_vencimento && ` ${tarefa.hora_vencimento.slice(0, 5)}`}
                          </span>
                        )}
                        {getDateBadge(tarefa.data_vencimento)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(tarefa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {tarefasConcluidas.length > 0 && (
            <>
              <div className="mt-6 mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">Concluídas ({tarefasConcluidas.length})</h4>
              </div>
              <div className="space-y-2 opacity-60">
                {tarefasConcluidas.slice(0, 5).map(tarefa => (
                  <div key={tarefa.id} className="flex items-center gap-2 p-2 text-sm line-through">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {tarefa.titulo}
                  </div>
                ))}
              </div>
            </>
          )}
        </ScrollArea>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Ligar para confirmar avaliação"
                  required
                />
              </div>

              {!leadId && (
                <div className="space-y-2">
                  <Label>Lead (opcional)</Label>
                  <Select value={formData.lead_id} onValueChange={(v) => setFormData(prev => ({ ...prev, lead_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>{lead.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_TAREFA.map(t => {
                        const Icon = t.icon;
                        return (
                          <SelectItem key={t.value} value={t.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {t.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={formData.prioridade} onValueChange={(v) => setFormData(prev => ({ ...prev, prioridade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${p.color}`} />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formData.hora_vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora_vencimento: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Detalhes da tarefa..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Tarefa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
