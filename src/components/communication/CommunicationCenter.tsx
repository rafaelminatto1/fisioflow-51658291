import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  Calendar,
  Target,
  Zap,
  Eye,
  Copy,
  Download
} from 'lucide-react';
import { useCommunication, CommunicationTemplate, CommunicationHistory } from '@/hooks/useCommunication';

interface CommunicationCenterProps {
  className?: string;
}

interface TemplateFormData {
  name: string;
  type: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  content: string;
  category: 'appointment' | 'reminder' | 'marketing' | 'follow-up' | 'emergency';
  variables: string[];
}

const TemplateCard: React.FC<{
  template: CommunicationTemplate;
  onEdit: (template: CommunicationTemplate) => void;
  onDelete: (templateId: string) => void;
  onUse: (template: CommunicationTemplate) => void;
}> = ({ template, onEdit, onDelete, onUse }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return MessageSquare;
      case 'email': return Mail;
      case 'sms': return Phone;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'whatsapp': return 'bg-green-100 text-green-800 border-green-200';
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sms': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'appointment': return 'bg-blue-50 text-blue-700';
      case 'reminder': return 'bg-yellow-50 text-yellow-700';
      case 'marketing': return 'bg-purple-50 text-purple-700';
      case 'follow-up': return 'bg-green-50 text-green-700';
      case 'emergency': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const TypeIcon = getTypeIcon(template.type);

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-semibold text-foreground">{template.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getTypeColor(template.type)}>
                    {template.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(template)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(template.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Subject (for email) */}
          {template.subject && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Assunto:</span>
              <p className="text-foreground">{template.subject}</p>
            </div>
          )}

          {/* Content Preview */}
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Conteúdo:</span>
            <p className="text-foreground line-clamp-3 mt-1">{template.content}</p>
          </div>

          {/* Variables */}
          {template.variables.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Variáveis:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.variables.map((variable, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {template.usage_count} usos
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(template.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => onUse(template)} className="flex-1">
              <Send className="w-3 h-3 mr-1" />
              Usar Template
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="w-3 h-3 mr-1" />
              Visualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HistoryCard: React.FC<{ history: CommunicationHistory }> = ({ history }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return Clock;
      case 'delivered': return CheckCircle;
      case 'read': return CheckCircle;
      case 'failed': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return MessageSquare;
      case 'email': return Mail;
      case 'sms': return Phone;
      default: return MessageSquare;
    }
  };

  const StatusIcon = getStatusIcon(history.status);
  const TypeIcon = getTypeIcon(history.type);

  return (
    <Card className="hover:shadow-sm transition-all duration-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4 text-primary" />
              <div>
                <h5 className="font-medium text-foreground">{history.patient_name}</h5>
                <p className="text-sm text-muted-foreground">{history.template_name}</p>
              </div>
            </div>
            <Badge className={getStatusColor(history.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {history.status}
            </Badge>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-muted-foreground line-clamp-2">{history.content}</p>

          {/* Error Message */}
          {history.error_message && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {history.error_message}
              </AlertDescription>
            </Alert>
          )}

          {/* Timeline */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Enviado: {new Date(history.sent_at).toLocaleString()}
            </div>
            {history.delivered_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Entregue: {new Date(history.delivered_at).toLocaleString()}
              </div>
            )}
            {history.read_at && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Lido: {new Date(history.read_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CommunicationCenter: React.FC<CommunicationCenterProps> = ({ className }) => {
  const {
    templates,
    history,
    bulkCommunications,
    stats,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    sendCommunication,
    getTemplatesByType,
    getTemplatesByCategory,
    getRecentHistory
  } = useCommunication();

  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    type: 'whatsapp',
    content: '',
    category: 'reminder',
    variables: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCreateTemplate = async () => {
    try {
      await createTemplate(templateForm);
      setIsCreateTemplateOpen(false);
      setTemplateForm({
        name: '',
        type: 'whatsapp',
        content: '',
        category: 'reminder',
        variables: []
      });
    } catch (err) {
      console.error('Erro ao criar template:', err);
    }
  };

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      category: template.category,
      variables: template.variables
    });
    setIsCreateTemplateOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      try {
        await deleteTemplate(templateId);
      } catch (err) {
        console.error('Erro ao excluir template:', err);
      }
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const recentHistory = getRecentHistory(10);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground ml-3">Carregando centro de comunicação...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Centro de Comunicação Omnichannel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-primary">{stats.total_sent}</div>
                <div className="text-sm text-muted-foreground">Total Enviado</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{stats.whatsapp_sent}</div>
                <div className="text-sm text-muted-foreground">WhatsApp</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{stats.email_sent}</div>
                <div className="text-sm text-muted-foreground">Email</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{stats.sms_sent}</div>
                <div className="text-sm text-muted-foreground">SMS</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-primary">{stats.delivery_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Taxa Entrega</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-primary">{stats.read_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Taxa Leitura</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xl font-bold text-primary">{stats.response_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Taxa Resposta</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas ({bulkCommunications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates Populares */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Templates Mais Usados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates
                    .sort((a, b) => b.usage_count - a.usage_count)
                    .slice(0, 5)
                    .map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          {template.type === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-600" />}
                          {template.type === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
                          {template.type === 'sms' && <Phone className="w-4 h-4 text-purple-600" />}
                          <span className="font-medium">{template.name}</span>
                        </div>
                        <Badge variant="outline">{template.usage_count} usos</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Histórico Recente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recentHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          {item.type === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-600" />}
                          {item.type === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
                          {item.type === 'sms' && <Phone className="w-4 h-4 text-purple-600" />}
                          <div>
                            <span className="font-medium">{item.patient_name}</span>
                            <p className="text-xs text-muted-foreground">{item.template_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={item.status === 'read' ? 'bg-green-100 text-green-800' : 
                                          item.status === 'failed' ? 'bg-red-100 text-red-800' : 
                                          'bg-blue-100 text-blue-800'}>
                            {item.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.sent_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Filtros e Ações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </div>
                <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nome do Template</Label>
                          <Input
                            id="name"
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Lembrete de Consulta"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Tipo</Label>
                          <Select value={templateForm.type} onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, type: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={templateForm.category} onValueChange={(value: any) => setTemplateForm(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="appointment">Agendamento</SelectItem>
                            <SelectItem value="reminder">Lembrete</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                            <SelectItem value="emergency">Emergência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {templateForm.type === 'email' && (
                        <div>
                          <Label htmlFor="subject">Assunto</Label>
                          <Input
                            id="subject"
                            value={templateForm.subject || ''}
                            onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Assunto do email"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="content">Conteúdo</Label>
                        <Textarea
                          id="content"
                          value={templateForm.content}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Digite o conteúdo do template. Use {{variavel}} para campos dinâmicos."
                          rows={6}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateTemplate}>
                          {editingTemplate ? 'Atualizar' : 'Criar'} Template
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    <SelectItem value="appointment">Agendamento</SelectItem>
                    <SelectItem value="reminder">Lembrete</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="emergency">Emergência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onUse={(template) => console.log('Usar template:', template)}
              />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou criar um novo template.
                </p>
                <Button onClick={() => setIsCreateTemplateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <HistoryCard key={item.id} history={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Campanhas em Massa</h3>
              <p className="text-muted-foreground mb-4">
                Funcionalidade em desenvolvimento. Em breve você poderá criar e gerenciar campanhas de comunicação em massa.
              </p>
              <Button disabled>
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};