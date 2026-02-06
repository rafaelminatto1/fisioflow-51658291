import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {

  MessageCircle, Send, Plus, CheckCircle2, Clock, Users,
  Settings, FileText, Zap, Check, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWhatsAppIntegration } from './hooks/useWhatsAppIntegration';
import { db, collection, getDocs, getDoc, doc, query as firestoreQuery, orderBy as fsOrderBy, limit as fsLimit } from '@/integrations/firebase/app';
import { normalizeFirestoreData } from '@/utils/firestoreData';

interface WhatsAppMessage {
  id: string;
  recipient: string;
  recipient_name?: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  template_id?: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface WhatsAppConfig {
  api_key: string;
  phone_number_id: string;
  business_account_id: string;
  webhook_url?: string;
  enabled: boolean;
}

export default function WhatsAppIntegration() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mensagens' | 'templates' | 'config'>('mensagens');

  const [formData, setFormData] = useState({
    recipient: '',
    recipient_name: '',
    message: '',
    template_id: '',
    schedule_type: 'imediato' as 'imediato' | 'agendado',
    scheduled_date: '',
    scheduled_time: '',
  });

  const [configData, setConfigData] = useState<WhatsAppConfig>({
    api_key: '',
    phone_number_id: '',
    business_account_id: '',
    webhook_url: '',
    enabled: false,
  });

  // Buscar mensagens
  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'whatsapp_messages'),
        fsOrderBy('created_at', 'desc'),
        fsLimit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as WhatsAppMessage[];
    },
  });

  // Buscar templates (unused but kept for future use)
  // const { data: templates = [] } = useQuery({
  //   queryKey: ['whatsapp-templates'],
  //   queryFn: async () => {
  //     const { data, error } = await supabase
  //       .from('whatsapp_templates')
  //       .select('*');
  //     if (error) throw error;
  //     return data as WhatsAppTemplate[];
  //   },
  // });

  // Buscar configuração
  const { data: config } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: async () => {
      const configRef = doc(db, 'whatsapp_config', 'default');
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        return null;
      }
      return configSnap.data() as WhatsAppConfig;
    },
  });

  // Enviar mensagem
  const { sendMessage } = useWhatsAppIntegration();

  const handleSend = async () => {
    if (!formData.recipient || !formData.message) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    await sendMessage.mutateAsync({
      recipient: formData.recipient,
      message: formData.message,
      templateId: formData.template_id || undefined,
    });

    setIsDialogOpen(false);
    setFormData({
      recipient: '',
      recipient_name: '',
      message: '',
      template_id: '',
      schedule_type: 'imediato',
      scheduled_date: '',
      scheduled_time: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ElementType }> = {
      pending: { variant: 'secondary', label: 'Pendente', icon: Clock },
      sent: { variant: 'outline', label: 'Enviado', icon: Send },
      delivered: { variant: 'default', label: 'Entregue', icon: Check },
      read: { variant: 'default', label: 'Lido', icon: CheckCircle2 },
      failed: { variant: 'destructive', label: 'Falhou', icon: X },
    };
    const { variant, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const stats = {
    total: mensagens.length,
    sent: mensagens.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
    read: mensagens.filter(m => m.status === 'read').length,
    failed: mensagens.filter(m => m.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-green-500" />
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground mt-1">
            Integração com WhatsApp Business para comunicação com pacientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} disabled={!config?.enabled}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      {!config?.enabled && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">WhatsApp não configurado</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Configure a integração com WhatsApp Business para enviar mensagens.
                </p>
              </div>
              <Button onClick={() => setIsConfigOpen(true)} className="bg-yellow-600 hover:bg-yellow-700">
                Configurar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.read}</p>
                <p className="text-xs text-muted-foreground">Lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'mensagens' | 'templates' | 'config')}>
        <TabsList>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="mensagens" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !mensagens.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma mensagem enviada ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mensagens.map((msg) => (
                    <div key={msg.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/5">
                      <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{msg.recipient_name || msg.recipient}</p>
                        <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {getStatusBadge(msg.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Templates pré-definidos */}
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Confirmação de Agendamento</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Olá {'{nome}'}, seu agendamento para {'{data}'} às {'{hora}'} foi confirmado.
                          Esperamos você na {'{clinica}'}!
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Usar Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Lembrete de Sessão</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Olá {'{nome}'}, lembramos que sua sessão de fisioterapia
                          é amanhã às {'{hora}'}. Confirmamos?
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Usar Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Users className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Boas-vindas</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Olá {'{nome}'}! Bem-vindo à {'{clinica}'}.
                          Estamos felizes em atender você!
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Usar Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Zap className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Follow-up Pós-Consulta</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Olá {'{nome}'}, como você está se sentindo após a sessão?
                          Alguma dúvida sobre os exercícios?
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Usar Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do WhatsApp Business API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Para configurar o WhatsApp Business, você precisa de uma conta no
                  Meta Business Suite e criar um aplicativo com acesso à WhatsApp Business API.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Habilitar Integração</p>
                    <p className="text-sm text-muted-foreground">
                      Ativar envio de mensagens via WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={configData.enabled}
                    onCheckedChange={(checked) => setConfigData({ ...configData, enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Insira sua API Key do Meta"
                    value={configData.api_key}
                    onChange={(e) => setConfigData({ ...configData, api_key: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="ID do número de telefone"
                    value={configData.phone_number_id}
                    onChange={(e) => setConfigData({ ...configData, phone_number_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input
                    placeholder="ID da conta comercial"
                    value={configData.business_account_id}
                    onChange={(e) => setConfigData({ ...configData, business_account_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL (opcional)</Label>
                  <Input
                    placeholder="URL para receber atualizações de status"
                    value={configData.webhook_url}
                    onChange={(e) => setConfigData({ ...configData, webhook_url: e.target.value })}
                  />
                </div>

                <Button className="w-full">
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Mensagem */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mensagem WhatsApp</DialogTitle>
            <DialogDescription>
              Enviar mensagem para um paciente ou lead
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número do WhatsApp *</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Inclui o código do país e DDD. Ex: 5511999999999
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome do Destinatário (opcional)</Label>
              <Input
                placeholder="Para referência"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Usar Template</Label>
              <Select value={formData.template_id} onValueChange={(v) => setFormData({ ...formData, template_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem template</SelectItem>
                  <SelectItem value="confirmacao">Confirmação de Agendamento</SelectItem>
                  <SelectItem value="lembrete">Lembrete de Sessão</SelectItem>
                  <SelectItem value="boas_vindas">Boas-vindas</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Digite sua mensagem... Use {nome} para personalizar"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, message: formData.message + '{nome}' })}>
                  {'{nome}'}
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, message: formData.message + '{data}' })}>
                  {'{data}'}
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, message: formData.message + '{hora}' })}>
                  {'{hora}'}
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, message: formData.message + '{clinica}' })}>
                  {'{clinica}'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sendMessage.isPending}>
              {sendMessage.isPending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configuração */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar WhatsApp Business</DialogTitle>
            <DialogDescription>
              Configure a integração com a API do WhatsApp Business
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg space-y-2">
                <p className="font-medium text-blue-700 dark:text-blue-300">Passo a passo:</p>
                <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                  <li>Acesse o Meta Business Suite (business.facebook.com)</li>
                  <li>Crie ou selecione sua conta comercial</li>
                  <li>Adicione o produto WhatsApp ao seu aplicativo</li>
                  <li>Copie o Phone Number ID e o Access Token</li>
                  <li>Cole os dados abaixo e salve a configuração</li>
                </ol>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Status da Integração</p>
                    <p className="text-sm text-muted-foreground">
                      {config?.enabled ? 'Ativo' : 'Não configurado'}
                    </p>
                  </div>
                  <Switch
                    checked={configData.enabled}
                    onCheckedChange={(checked) => setConfigData({ ...configData, enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Access Token (Permanent)</Label>
                  <Input
                    type="password"
                    placeholder="Cole seu access token aqui"
                    value={configData.api_key}
                    onChange={(e) => setConfigData({ ...configData, api_key: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="ID do número de telefone do WhatsApp Business"
                    value={configData.phone_number_id}
                    onChange={(e) => setConfigData({ ...configData, phone_number_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Account ID (WABA ID)</Label>
                  <Input
                    placeholder="ID da conta do WhatsApp Business"
                    value={configData.business_account_id}
                    onChange={(e) => setConfigData({ ...configData, business_account_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL (opcional)</Label>
                  <Input
                    placeholder="https://seuservico.com/webhooks/whatsapp"
                    value={configData.webhook_url}
                    onChange={(e) => setConfigData({ ...configData, webhook_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL para receber atualizações de status das mensagens
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Salvar configuração
              toast.success('Configuração salva com sucesso!');
              setIsConfigOpen(false);
            }}>
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}