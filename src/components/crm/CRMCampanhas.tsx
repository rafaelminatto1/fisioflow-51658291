import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {

  Plus, Mail, MessageSquare, Smartphone, Send, Pause,
  Play, Trash2, Users, BarChart3
} from 'lucide-react';
import { useCRMCampanhas, useCreateCampanha, useUpdateCampanha, useDeleteCampanha, CRMCampanha } from '@/hooks/useCRM';
import { useLeads } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const TIPOS_CAMPANHA = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-blue-500' },
  { value: 'sms', label: 'SMS', icon: Smartphone, color: 'bg-purple-500' },
];

const STATUS_CAMPANHA = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-500' },
  agendada: { label: 'Agendada', color: 'bg-amber-500' },
  enviando: { label: 'Enviando', color: 'bg-blue-500' },
  concluida: { label: 'Concluída', color: 'bg-emerald-500' },
  pausada: { label: 'Pausada', color: 'bg-rose-500' },
};

const ESTAGIOS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'em_contato', label: 'Em Contato' },
  { value: 'avaliacao_agendada', label: 'Avaliação Agendada' },
  { value: 'avaliacao_realizada', label: 'Avaliação Realizada' },
  { value: 'efetivado', label: 'Efetivado' },
  { value: 'nao_efetivado', label: 'Não Efetivado' },
];

type TipoCampanha = 'whatsapp' | 'email' | 'sms';

interface FormDataCampanha {
  nome: string;
  descricao: string;
  tipo: TipoCampanha;
  assunto: string;
  conteudo: string;
  filtro_estagios: string[];
}

export function CRMCampanhas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormDataCampanha>({
    nome: '',
    descricao: '',
    tipo: 'whatsapp',
    assunto: '',
    conteudo: '',
    filtro_estagios: [],
  });

  const { data: campanhas = [] } = useCRMCampanhas();
  const { data: leads = [] } = useLeads();
  const createMutation = useCreateCampanha();
  const updateMutation = useUpdateCampanha();
  const deleteMutation = useDeleteCampanha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate recipients
    const destinatarios = leads.filter(lead => {
      if (formData.filtro_estagios.length === 0) return true;
      return formData.filtro_estagios.includes(lead.estagio);
    });

    await createMutation.mutateAsync({
      ...formData,
      total_destinatarios: destinatarios.length,
      status: 'rascunho',
    });
    
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'whatsapp',
      assunto: '',
      conteudo: '',
      filtro_estagios: [],
    });
  };

  const handleEnviar = async (campanha: CRMCampanha) => {
    // Simulate sending - in production this would trigger an edge function
    await updateMutation.mutateAsync({ id: campanha.id, status: 'enviando' });
    toast.success('Campanha iniciada! Os envios serão processados em segundo plano.');
    
    // Simulate completion after delay
    setTimeout(async () => {
      await updateMutation.mutateAsync({ 
        id: campanha.id, 
        status: 'concluida',
        total_enviados: campanha.total_destinatarios,
      });
    }, 3000);
  };

  const getTipoInfo = (tipo: string) => TIPOS_CAMPANHA.find(t => t.value === tipo) || TIPOS_CAMPANHA[0];

  const toggleEstagio = (estagio: string) => {
    setFormData(prev => ({
      ...prev,
      filtro_estagios: prev.filtro_estagios.includes(estagio)
        ? prev.filtro_estagios.filter(e => e !== estagio)
        : [...prev.filtro_estagios, estagio],
    }));
  };

  const countDestinatarios = () => {
    return leads.filter(lead => {
      if (formData.filtro_estagios.length === 0) return true;
      return formData.filtro_estagios.includes(lead.estagio);
    }).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6" />
            Campanhas de Marketing
          </h2>
          <p className="text-muted-foreground">Envie mensagens em massa para seus leads</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Lista de Campanhas */}
      <div className="grid gap-4">
        {campanhas.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma campanha criada</p>
              <p className="text-sm">Crie sua primeira campanha para engajar seus leads</p>
            </div>
          </Card>
        ) : (
          campanhas.map(campanha => {
            const tipoInfo = getTipoInfo(campanha.tipo);
            const statusInfo = STATUS_CAMPANHA[campanha.status as keyof typeof STATUS_CAMPANHA];
            const TipoIcon = tipoInfo.icon;
            
            return (
              <Card key={campanha.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${tipoInfo.color}`}>
                        <TipoIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{campanha.nome}</h3>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {campanha.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{campanha.descricao}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {campanha.total_destinatarios} destinatários
                          </span>
                          {campanha.total_enviados > 0 && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-4 w-4" />
                              {campanha.total_enviados} enviados
                            </span>
                          )}
                          <span>
                            {format(new Date(campanha.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {campanha.status === 'rascunho' && (
                        <Button size="sm" onClick={() => handleEnviar(campanha)}>
                          <Play className="h-4 w-4 mr-1" />
                          Enviar
                        </Button>
                      )}
                      {campanha.status === 'enviando' && (
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: campanha.id, status: 'pausada' })}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(campanha.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog Nova Campanha */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Campanha *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Promoção de Verão"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as TipoCampanha }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CAMPANHA.map(t => {
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
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição da campanha"
              />
            </div>

            {formData.tipo === 'email' && (
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input
                  value={formData.assunto}
                  onChange={(e) => setFormData(prev => ({ ...prev, assunto: e.target.value }))}
                  placeholder="Assunto do email"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={formData.conteudo}
                onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                placeholder="Use {nome} para personalizar com o nome do lead..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {'{nome}'}, {'{telefone}'}, {'{email}'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Estágio</Label>
              <div className="flex flex-wrap gap-2">
                {ESTAGIOS.map(estagio => (
                  <Badge
                    key={estagio.value}
                    variant={formData.filtro_estagios.includes(estagio.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleEstagio(estagio.value)}
                  >
                    {estagio.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.filtro_estagios.length === 0 ? 'Todos os estágios' : `${formData.filtro_estagios.length} estágios selecionados`}
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{countDestinatarios()} destinatários</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Leads que receberão esta campanha
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Campanha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
