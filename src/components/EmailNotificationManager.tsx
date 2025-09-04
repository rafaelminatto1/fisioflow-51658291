import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEmailNotifications, EmailTemplate, EmailNotification } from '@/hooks/useEmailNotifications';
import { usePatients } from '@/hooks/usePatients';
import { Mail, Send, Calendar, Settings, Plus, Edit, Trash2, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailNotificationManagerProps {
  patientId?: string;
}

export function EmailNotificationManager({ patientId }: EmailNotificationManagerProps) {
  const {
    templates,
    notifications,
    config,
    loading,
    fetchTemplates,
    fetchNotifications,
    fetchConfig,
    createTemplate,
    updateTemplate,
    sendNotification,
    updateConfig,
    cancelNotification,
    getStats
  } = useEmailNotifications();
  
  const { patients, fetchPatients } = usePatients();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Form states
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    subject: string;
    html_content: string;
    text_content: string;
    type: 'appointment_reminder' | 'appointment_confirmation' | 'exercise_reminder' | 'progress_report' | 'custom';
    variables: string[];
  }>({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    type: 'custom',
    variables: []
  });

  const [configForm, setConfigForm] = useState({
    provider: 'resend' as 'resend' | 'sendgrid',
    apiKey: '',
    fromEmail: '',
    fromName: '',
    replyTo: ''
  });

  const [sendForm, setSendForm] = useState({
    patientId: patientId || '',
    templateId: '',
    scheduledFor: '',
    variables: {} as Record<string, string>
  });

  useEffect(() => {
    fetchTemplates();
    fetchNotifications(patientId);
    fetchConfig();
    fetchPatients();
    loadStats();
  }, [patientId]);

  useEffect(() => {
    if (config) {
      setConfigForm({
        provider: config.provider,
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName || '',
        replyTo: config.replyTo || ''
      });
    }
  }, [config]);

  const loadStats = async () => {
    const data = await getStats();
    setStats(data);
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplate(templateForm);
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await updateTemplate(selectedTemplate.id, templateForm);
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
      resetTemplateForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSendNotification = async () => {
    try {
      const patient = patients.find(p => p.id === sendForm.patientId);
      if (!patient) {
        toast.error('Paciente não encontrado');
        return;
      }

      await sendNotification(
        patient.email,
        patient.name,
        sendForm.templateId,
        sendForm.variables,
        sendForm.scheduledFor || undefined
      );
      
      setIsSendDialogOpen(false);
      resetSendForm();
      fetchNotifications(patientId);
      loadStats();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await updateConfig(configForm);
      setIsConfigDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      html_content: '',
      text_content: '',
      type: 'custom',
      variables: []
    });
  };

  const resetSendForm = () => {
    setSendForm({
      patientId: patientId || '',
      templateId: '',
      scheduledFor: '',
      variables: {}
    });
  };

  const editTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      type: template.type,
      variables: template.variables
    });
    setIsTemplateDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-600">{stats?.total_sent || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.total_pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendados</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.total_scheduled || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{stats?.success_rate || 0}%</p>
              </div>
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enviar Notificação por Email</DialogTitle>
                  <DialogDescription>
                    Envie uma notificação personalizada para um paciente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient">Paciente</Label>
                      <Select value={sendForm.patientId} onValueChange={(value) => setSendForm(prev => ({ ...prev, patientId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map(patient => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name} - {patient.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="template">Template</Label>
                      <Select value={sendForm.templateId} onValueChange={(value) => setSendForm(prev => ({ ...prev, templateId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduledFor">Agendar para (opcional)</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={sendForm.scheduledFor}
                      onChange={(e) => setSendForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSendNotification} disabled={!sendForm.patientId || !sendForm.templateId}>
                      {sendForm.scheduledFor ? 'Agendar' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid gap-4">
            {notifications.map(notification => (
              <Card key={notification.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(notification.status)}
                        <h4 className="font-medium">{notification.subject}</h4>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Para: {notification.recipient_name} ({notification.recipient_email})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.scheduled_for 
                          ? `Agendado para: ${format(new Date(notification.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                          : `Criado em: ${format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                        }
                      </p>
                      {notification.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          Erro: {notification.error_message}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {notification.status === 'scheduled' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar Notificação</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja cancelar esta notificação agendada?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelNotification(notification.id)}>
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {notifications.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma notificação</h3>
                  <p className="text-muted-foreground">
                    Ainda não há notificações por email enviadas.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTemplate ? 'Editar Template' : 'Novo Template'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedTemplate ? 'Edite o template de email.' : 'Crie um novo template de email.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome do template"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={templateForm.type} onValueChange={(value: 'appointment_reminder' | 'appointment_confirmation' | 'exercise_reminder' | 'progress_report' | 'custom') => setTemplateForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appointment_reminder">Lembrete de Consulta</SelectItem>
                          <SelectItem value="appointment_confirmation">Confirmação de Consulta</SelectItem>
                          <SelectItem value="exercise_reminder">Lembrete de Exercícios</SelectItem>
                          <SelectItem value="progress_report">Relatório de Progresso</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Assunto do email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="html_content">Conteúdo HTML</Label>
                    <Textarea
                      id="html_content"
                      value={templateForm.html_content}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, html_content: e.target.value }))}
                      placeholder="Conteúdo HTML do email"
                      rows={10}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="text_content">Conteúdo Texto (opcional)</Label>
                    <Textarea
                      id="text_content"
                      value={templateForm.text_content}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, text_content: e.target.value }))}
                      placeholder="Versão em texto simples"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsTemplateDialogOpen(false);
                      setSelectedTemplate(null);
                      resetTemplateForm();
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                      {selectedTemplate ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                      <Badge variant="outline" className="mt-1">
                        {template.type}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editTemplate(template)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração de Email
              </CardTitle>
              <CardDescription>
                Configure o provedor de email para envio de notificações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Provedor</Label>
                  <Select value={configForm.provider} onValueChange={(value: any) => setConfigForm(prev => ({ ...prev, provider: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Sua API key"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_email">Email Remetente</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={configForm.fromEmail}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@exemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="from_name">Nome Remetente</Label>
                  <Input
                    id="from_name"
                    value={configForm.fromName}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="FisioFlow"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="reply_to">Reply To (opcional)</Label>
                <Input
                  id="reply_to"
                  type="email"
                  value={configForm.replyTo}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, replyTo: e.target.value }))}
                  placeholder="contato@exemplo.com"
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleUpdateConfig}>
                  Salvar Configuração
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}