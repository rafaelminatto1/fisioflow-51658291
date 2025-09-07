import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare,
  Mail,
  Phone,
  Bell,
  Send,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  MessageCircle,
  Plus,
  Search,
  Eye,
  Trash2
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for notifications
const mockNotifications = [
  {
    id: '1',
    patientId: '1',
    type: 'lembrete_consulta' as const,
    title: 'Lembrete de Consulta',
    message: 'Olá Maria! Lembramos que você tem consulta amanhã às 08:00. Confirme sua presença.',
    status: 'enviado' as const,
    scheduledFor: new Date(),
    sentAt: new Date(),
    method: 'whatsapp' as const,
    createdAt: new Date()
  },
  {
    id: '2',
    patientId: '2',
    type: 'exercicio_pendente' as const,
    title: 'Exercícios Pendentes',
    message: 'João, você ainda não marcou seus exercícios de hoje. Que tal fazer agora?',
    status: 'pendente' as const,
    scheduledFor: addDays(new Date(), 1),
    method: 'email' as const,
    createdAt: new Date()
  }
];

const mockTemplates = [
  {
    id: '1',
    name: 'Lembrete de Consulta',
    type: 'lembrete_consulta',
    content: 'Olá {NOME}! Lembramos que você tem {TIPO_CONSULTA} agendada para {DATA} às {HORA}. Confirme sua presença.',
    variables: ['NOME', 'TIPO_CONSULTA', 'DATA', 'HORA']
  },
  {
    id: '2',
    name: 'Exercícios Pendentes',
    type: 'exercicio_pendente',
    content: 'Olá {NOME}! Você ainda não realizou seus exercícios de hoje. Acesse o app para marcar como concluído.',
    variables: ['NOME']
  }
];

export function Communications() {
  const { patients } = useData();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isNewNotificationOpen, setIsNewNotificationOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [newNotification, setNewNotification] = useState({
    type: 'lembrete_consulta' as const,
    title: '',
    message: '',
    method: 'whatsapp' as const,
    scheduledFor: new Date(),
    recipients: [] as string[]
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'lembrete_consulta',
    content: ''
  });

  const [settings, setSettings] = useState({
    autoReminders: true,
    reminderHours: 24,
    whatsappEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    exerciseReminders: true,
    confirmationRequired: true
  });

  const filteredNotifications = mockNotifications.filter(notification => {
    const patient = patients.find(p => p.id === notification.patientId);
    const matchesSearch = !searchTerm || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleSendNotification = () => {
    if (!newNotification.title || !newNotification.message || newNotification.recipients.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Notificação enviada para ${newNotification.recipients.length} paciente(s)!`,
    });

    setNewNotification({
      type: 'lembrete_consulta',
      title: '',
      message: '',
      method: 'whatsapp',
      scheduledFor: new Date(),
      recipients: []
    });
    setIsNewNotificationOpen(false);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Template criado com sucesso!",
    });

    setNewTemplate({
      name: '',
      type: 'lembrete_consulta',
      content: ''
    });
    setIsTemplateOpen(false);
  };

  const handleSaveSettings = () => {
    toast({
      title: "Sucesso",
      description: "Configurações salvas com sucesso!",
    });
    setIsSettingsOpen(false);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'enviado': 'bg-green-100 text-green-800',
      'lido': 'bg-blue-100 text-blue-800',
      'falhou': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getMethodIcon = (method: string) => {
    const icons = {
      'email': Mail,
      'sms': Phone,
      'whatsapp': MessageCircle,
      'push': Bell
    };
    const IconComponent = icons[method as keyof typeof icons] || Bell;
    return <IconComponent className="w-4 h-4" />;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'lembrete_consulta': Calendar,
      'confirmacao_agendamento': CheckCircle,
      'cancelamento': XCircle,
      'exercicio_pendente': Zap
    };
    const IconComponent = icons[type as keyof typeof icons] || Bell;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comunicação</h1>
            <p className="text-muted-foreground">Central de mensagens e notificações</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isNewNotificationOpen} onOpenChange={setIsNewNotificationOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Notificação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova Notificação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select value={newNotification.type} onValueChange={(value: string) => setNewNotification(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lembrete_consulta">Lembrete de Consulta</SelectItem>
                          <SelectItem value="confirmacao_agendamento">Confirmação</SelectItem>
                          <SelectItem value="cancelamento">Cancelamento</SelectItem>
                          <SelectItem value="exercicio_pendente">Exercícios Pendentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Método de Envio</label>
                      <Select value={newNotification.method} onValueChange={(value: string) => setNewNotification(prev => ({ ...prev, method: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="push">Notificação Push</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input 
                      value={newNotification.title}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Lembrete de Consulta"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mensagem</label>
                    <Textarea 
                      value={newNotification.message}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Digite sua mensagem aqui..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Destinatários</label>
                    <Select onValueChange={(value) => {
                      if (!newNotification.recipients.includes(value)) {
                        setNewNotification(prev => ({ 
                          ...prev, 
                          recipients: [...prev.recipients, value] 
                        }));
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione os pacientes" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newNotification.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newNotification.recipients.map((patientId) => {
                          const patient = patients.find(p => p.id === patientId);
                          return (
                            <Badge key={patientId} variant="outline" className="flex items-center gap-1">
                              {patient?.name}
                              <button
                                onClick={() => setNewNotification(prev => ({
                                  ...prev,
                                  recipients: prev.recipients.filter(id => id !== patientId)
                                }))}
                                className="ml-1 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNewNotificationOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSendNotification}>
                      Enviar Agora
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurações de Comunicação</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Lembretes Automáticos</h3>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-reminders">Ativar lembretes automáticos</Label>
                      <Switch 
                        id="auto-reminders"
                        checked={settings.autoReminders}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoReminders: checked }))}
                      />
                    </div>
                    {settings.autoReminders && (
                      <div>
                        <Label>Enviar lembrete (horas antes da consulta)</Label>
                        <Input 
                          type="number"
                          value={settings.reminderHours}
                          onChange={(e) => setSettings(prev => ({ ...prev, reminderHours: parseInt(e.target.value) }))}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Canais de Comunicação</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Switch 
                          id="whatsapp"
                          checked={settings.whatsappEnabled}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, whatsappEnabled: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email">Email</Label>
                        <Switch 
                          id="email"
                          checked={settings.emailEnabled}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailEnabled: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms">SMS</Label>
                        <Switch 
                          id="sms"
                          checked={settings.smsEnabled}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsEnabled: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Outros</h3>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="exercise-reminders">Lembretes de exercícios</Label>
                      <Switch 
                        id="exercise-reminders"
                        checked={settings.exerciseReminders}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, exerciseReminders: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="confirmation-required">Exigir confirmação</Label>
                      <Switch 
                        id="confirmation-required"
                        checked={settings.confirmationRequired}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, confirmationRequired: checked }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveSettings}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Enviadas Hoje</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Leitura</p>
                  <p className="text-2xl font-bold">89%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Falharam</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar notificações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="enviado">Enviadas</SelectItem>
                  <SelectItem value="lido">Lidas</SelectItem>
                  <SelectItem value="falhou">Falharam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma notificação encontrada</h3>
                  <p className="text-muted-foreground">
                    As notificações enviadas aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const patient = patients.find(p => p.id === notification.patientId);
                  return (
                    <Card key={notification.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{notification.title}</h3>
                                <Badge className={getStatusColor(notification.status)}>
                                  {notification.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  {getMethodIcon(notification.method)}
                                  <span className="text-xs">{notification.method}</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Para: {patient?.name} • {format(notification.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-muted rounded">
                          <p className="text-sm">{notification.message}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nome do Template</label>
                      <Input 
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Lembrete Personalizado"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select value={newTemplate.type} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lembrete_consulta">Lembrete de Consulta</SelectItem>
                          <SelectItem value="confirmacao_agendamento">Confirmação</SelectItem>
                          <SelectItem value="cancelamento">Cancelamento</SelectItem>
                          <SelectItem value="exercicio_pendente">Exercícios Pendentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Conteúdo do Template</label>
                      <Textarea 
                        value={newTemplate.content}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Use variáveis como {NOME}, {DATA}, {HORA}..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Variáveis disponíveis: {'{NOME}, {DATA}, {HORA}, {TIPO_CONSULTA}'}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsTemplateOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateTemplate}>
                        Criar Template
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {mockTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>Tipo: {template.type}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-sm">{template.content}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {'{' + variable + '}'}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">96%</div>
                  <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Leitura</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">89%</div>
                  <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tempo Médio de Resposta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">2.3h</div>
                  <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Canais Mais Eficazes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span>WhatsApp</span>
                  </div>
                  <span className="font-medium">94% taxa de leitura</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email</span>
                  </div>
                  <span className="font-medium">76% taxa de leitura</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-600" />
                    <span>SMS</span>
                  </div>
                  <span className="font-medium">98% taxa de entrega</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}