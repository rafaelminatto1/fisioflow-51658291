import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

  Plus, Zap, Cake, RefreshCw, Star, MessageSquare, Mail,
  Smartphone, Trash2, Clock
} from 'lucide-react';
import { useCRMAutomacoes, useCreateAutomacao, useToggleAutomacao, useDeleteAutomacao } from '@/hooks/useCRM';

const TIPOS_AUTOMACAO = [
  { value: 'aniversario', label: 'Aniversário', icon: Cake, description: 'Mensagem automática no aniversário' },
  { value: 'reengajamento', label: 'Reengajamento', icon: RefreshCw, description: 'Contato com leads inativos' },
  { value: 'pos_avaliacao', label: 'Pós-Avaliação', icon: Star, description: 'Follow-up após avaliação' },
  { value: 'boas_vindas', label: 'Boas-vindas', icon: MessageSquare, description: 'Mensagem para novos leads' },
  { value: 'follow_up_automatico', label: 'Follow-up Automático', icon: Clock, description: 'Lembrete de acompanhamento' },
];

const CANAIS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: Smartphone },
];

type TipoAutomacao = 'aniversario' | 'reengajamento' | 'pos_avaliacao' | 'boas_vindas' | 'follow_up_automatico';
type CanalAutomacao = 'whatsapp' | 'email' | 'sms';

interface GatilhoConfig {
  dias_inativo?: number;
  horas_apos?: number;
  intervalo_dias?: number;
}

interface FormDataAutomacao {
  nome: string;
  descricao: string;
  tipo: TipoAutomacao;
  canal: CanalAutomacao;
  template_mensagem: string;
  gatilho_config: GatilhoConfig;
}

export function CRMAutomacoes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormDataAutomacao>({
    nome: '',
    descricao: '',
    tipo: 'boas_vindas',
    canal: 'whatsapp',
    template_mensagem: '',
    gatilho_config: {},
  });

  const { data: automacoes = [] } = useCRMAutomacoes();
  const createMutation = useCreateAutomacao();
  const toggleMutation = useToggleAutomacao();
  const deleteMutation = useDeleteAutomacao();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      ativo: false,
    });
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'boas_vindas',
      canal: 'whatsapp',
      template_mensagem: '',
      gatilho_config: {},
    });
  };

  const getTipoInfo = (tipo: string) => TIPOS_AUTOMACAO.find(t => t.value === tipo) || TIPOS_AUTOMACAO[0];
  const getCanalInfo = (canal: string) => CANAIS.find(c => c.value === canal) || CANAIS[0];

  const getGatilhoDescription = (tipo: string, config: GatilhoConfig) => {
    switch (tipo) {
      case 'aniversario': return 'Dispara no aniversário do lead';
      case 'reengajamento': return `Dispara após ${config.dias_inativo || 7} dias sem contato`;
      case 'pos_avaliacao': return `Dispara ${config.horas_apos || 24}h após avaliação`;
      case 'boas_vindas': return 'Dispara quando um novo lead é cadastrado';
      case 'follow_up_automatico': return `Dispara a cada ${config.intervalo_dias || 3} dias`;
      default: return 'Gatilho personalizado';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automações
          </h2>
          <p className="text-muted-foreground">Configure ações automáticas para seus leads</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {/* Templates Pré-definidos */}
      <div className="grid md:grid-cols-3 gap-4">
        {TIPOS_AUTOMACAO.map(tipo => {
          const Icon = tipo.icon;
          const existente = automacoes.find(a => a.tipo === tipo.value);
          return (
            <Card key={tipo.value} className={`cursor-pointer transition-all hover:shadow-md ${existente ? 'border-primary/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{tipo.label}</h3>
                      {existente && (
                        <Badge variant={existente.ativo ? 'default' : 'secondary'} className="text-xs">
                          {existente.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tipo.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de Automações */}
      <Card>
        <CardHeader>
          <CardTitle>Automações Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {automacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma automação configurada</p>
              <p className="text-sm">Crie automações para engajar seus leads automaticamente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {automacoes.map(automacao => {
                const tipoInfo = getTipoInfo(automacao.tipo);
                const canalInfo = getCanalInfo(automacao.canal);
                const TipoIcon = tipoInfo.icon;
                const CanalIcon = canalInfo.icon;

                return (
                  <div key={automacao.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${automacao.ativo ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                        <TipoIcon className={`h-5 w-5 ${automacao.ativo ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{automacao.nome}</h4>
                          <Badge variant="outline" className="text-xs">
                            <CanalIcon className="h-3 w-3 mr-1" />
                            {canalInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getGatilhoDescription(automacao.tipo, automacao.gatilho_config)}
                        </p>
                        {automacao.total_executado > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {automacao.total_executado} execuções
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{automacao.ativo ? 'Ativa' : 'Inativa'}</span>
                        <Switch
                          checked={automacao.ativo}
                          onCheckedChange={(ativo) => toggleMutation.mutate({ id: automacao.id, ativo })}
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(automacao.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova Automação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Boas-vindas WhatsApp"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as TipoAutomacao }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_AUTOMACAO.map(t => {
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
                <Label>Canal</Label>
                <Select value={formData.canal} onValueChange={(v) => setFormData(prev => ({ ...prev, canal: v as CanalAutomacao }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANAIS.map(c => {
                      const Icon = c.icon;
                      return (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {c.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.tipo === 'reengajamento' && (
              <div className="space-y-2">
                <Label>Dias sem contato</Label>
                <Input
                  type="number"
                  value={formData.gatilho_config.dias_inativo || 7}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    gatilho_config: { ...prev.gatilho_config, dias_inativo: parseInt(e.target.value) }
                  }))}
                  min={1}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={formData.template_mensagem}
                onChange={(e) => setFormData(prev => ({ ...prev, template_mensagem: e.target.value }))}
                placeholder="Olá {nome}! ..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use {'{nome}'}, {'{telefone}'} para personalizar
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Automação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
