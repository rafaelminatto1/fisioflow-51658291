import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/shared/ui/sheet';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import {
  Phone, Mail, Calendar, Clock, Edit,
  Plus, User, History, ExternalLink
} from 'lucide-react';
import { Lead, useLeadHistorico, useAddLeadHistorico, useUpdateLead } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const TIPOS_CONTATO = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { value: 'ligacao', label: 'Ligação', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'presencial', label: 'Presencial', icon: '🏢' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
];

interface LeadDetailSheetProps {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  estagios: { value: string; label: string; color: string }[];
}

export function LeadDetailSheet({ lead, onClose, onEdit, estagios }: LeadDetailSheetProps) {
  const [showAddHistorico, setShowAddHistorico] = useState(false);
  const [historicoForm, setHistoricoForm] = useState({
    tipo_contato: 'whatsapp',
    descricao: '',
    resultado: '',
    proximo_contato: '',
  });

  const { data: historico = [] } = useLeadHistorico(lead?.id);
  const addHistoricoMutation = useAddLeadHistorico();
  const updateLeadMutation = useUpdateLead();

  const getEstagioInfo = (estagio: string) => estagios.find(e => e.value === estagio) || estagios[0];

  const handleAddHistorico = async () => {
    if (!lead || !historicoForm.tipo_contato) return;
    
    await addHistoricoMutation.mutateAsync({
      lead_id: lead.id,
      tipo_contato: historicoForm.tipo_contato,
      descricao: historicoForm.descricao || null,
      resultado: historicoForm.resultado || null,
      proximo_contato: historicoForm.proximo_contato || null,
    });
    
    setHistoricoForm({ tipo_contato: 'whatsapp', descricao: '', resultado: '', proximo_contato: '' });
    setShowAddHistorico(false);
  };

  const handleMoveEstagio = async (novoEstagio: Lead['estagio']) => {
    if (!lead || lead.estagio === novoEstagio) return;
    await updateLeadMutation.mutateAsync({ id: lead.id, estagio: novoEstagio });
    toast.success(`Lead movido para ${getEstagioInfo(novoEstagio).label}`);
  };

  const handleWhatsApp = () => {
    if (!lead?.telefone) return;
    const phone = lead.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  if (!lead) return null;

  const estagioInfo = getEstagioInfo(lead.estagio);

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{lead.nome}</SheetTitle>
              <Badge className={`mt-2 ${estagioInfo.color} text-white`}>
                {estagioInfo.label}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(lead)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Informações de Contato */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.telefone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {lead.telefone}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleWhatsApp}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                  </div>
                )}
                {lead.origem && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Origem:</span>
                    <Badge variant="outline">{lead.origem}</Badge>
                  </div>
                )}
                {lead.interesse && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Interesse:</span>
                    <span>{lead.interesse}</span>
                  </div>
                )}
                {lead.data_primeiro_contato && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Primeiro contato:</span>
                    {format(new Date(lead.data_primeiro_contato), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
                {lead.observacoes && (
                  <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                    {lead.observacoes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mover Estágio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mover para</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {estagios.map(e => (
                    <Button
                      key={e.value}
                      variant={lead.estagio === e.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMoveEstagio(e.value as Lead['estagio'])}
                      disabled={lead.estagio === e.value}
                      className="text-xs"
                    >
                      <div className={`w-2 h-2 rounded-full ${e.color} mr-1`} />
                      {e.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Contatos */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Contatos
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddHistorico(!showAddHistorico)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form para adicionar histórico */}
                {showAddHistorico && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label>Tipo de Contato</Label>
                      <Select 
                        value={historicoForm.tipo_contato}
                        onValueChange={(v) => setHistoricoForm(prev => ({ ...prev, tipo_contato: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CONTATO.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                <span>{t.icon}</span>
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={historicoForm.descricao}
                        onChange={(e) => setHistoricoForm(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="O que foi conversado..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resultado</Label>
                      <Input
                        value={historicoForm.resultado}
                        onChange={(e) => setHistoricoForm(prev => ({ ...prev, resultado: e.target.value }))}
                        placeholder="Ex: Demonstrou interesse, pediu orçamento"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Próximo Contato</Label>
                      <Input
                        type="date"
                        value={historicoForm.proximo_contato}
                        onChange={(e) => setHistoricoForm(prev => ({ ...prev, proximo_contato: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleAddHistorico}
                        disabled={addHistoricoMutation.isPending}
                      >
                        {addHistoricoMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddHistorico(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de histórico */}
                <div className="space-y-3">
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum registro de contato
                    </p>
                  ) : (
                    historico.map(h => {
                      const tipoInfo = TIPOS_CONTATO.find(t => t.value === h.tipo_contato);
                      return (
                        <div key={h.id} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {tipoInfo?.icon || '📝'}
                            </div>
                            <div className="w-px flex-1 bg-border mt-2" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tipoInfo?.label || h.tipo_contato}</span>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {h.descricao && <p className="text-muted-foreground mt-1">{h.descricao}</p>}
                            {h.resultado && (
                              <p className="mt-1">
                                <span className="text-muted-foreground">Resultado:</span> {h.resultado}
                              </p>
                            )}
                            {h.proximo_contato && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Próximo: {format(new Date(h.proximo_contato), "dd/MM/yyyy", { locale: ptBR })}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
