/**
 * CRM Campaigns Page - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('email_campanhas') → Firestore collection 'email_campanhas'
 * - Uses deleteDoc() for deletion
 */

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Mail, Plus, Edit, Trash2, Send, Users, Eye, Clock, CheckCircle2,
  XCircle, AlertCircle, TrendingUp, Filter, FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, collection, query as firestoreQuery, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, QueryDocumentSnapshot } from '@/integrations/firebase/app';
 from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  content: string;
  status: 'rascunho' | 'agendado' | 'enviando' | 'enviado' | 'pausado';
  target_segment?: string;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'boas_vindas' | 'follow_up' | 'lembrete' | 'promocional' | 'informativo';
  variables: string[];
}

export default function CRMCampanhasPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'campanhas' | 'templates' | 'relatorio'>('campanhas');
  const [selectedCampaign] = useState<EmailCampaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    preview_text: '',
    content: '',
    target_segment: 'todos',
    schedule_type: 'imediato' as 'imediato' | 'agendado',
    scheduled_date: '',
    scheduled_time: '',
  });

  // Buscar campanhas
  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ['email-campanhas'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'email_campanhas'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })) as EmailCampaign[];
    },
  });

  // Buscar templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'email_templates'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })) as EmailTemplate[];
    },
  });

  // Buscar leads para segmentação
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-segmentacao'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'leads'));
      return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
    },
  });

  // Criar campanha
  const createCampaign = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Calcular destinatários baseado no segmento
      let recipientCount = leads.length;
      if (data.target_segment === 'novos') {
        recipientCount = leads.filter(l => {
          const daysSinceCreation = (new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCreation <= 7;
        }).length;
      } else if (data.target_segment === 'prospecao') {
        recipientCount = leads.filter(l => l.stage === 'prospecacao').length;
      }

      const scheduledAt = data.schedule_type === 'agendado' && data.scheduled_date && data.scheduled_time
        ? new Date(`${data.scheduled_date}T${data.scheduled_time}`).toISOString()
        : undefined;

      const campaignData = {
        name: data.name,
        subject: data.subject,
        preview_text: data.preview_text,
        content: data.content,
        target_segment: data.target_segment,
        recipient_count: recipientCount,
        scheduled_at: scheduledAt,
        status: data.schedule_type === 'agendado' ? 'agendado' : 'rascunho',
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'email_campanhas'), campaignData);
      return { id: docRef.id, ...campaignData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campanhas'] });
      toast.success('Campanha criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        subject: '',
        preview_text: '',
        content: '',
        target_segment: 'todos',
        schedule_type: 'imediato',
        scheduled_date: '',
        scheduled_time: '',
      });
    },
    onError: () => toast.error('Erro ao criar campanha'),
  });

  // Enviar campanha
  const sendCampaign = useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, 'email_campanhas', id), {
        status: 'enviando',
        sent_at: new Date().toISOString()
      });

      // Simular envio (em produção, isso seria processado por uma fila)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Atualizar como enviado
      await updateDoc(doc(db, 'email_campanhas', id), {
        status: 'enviado',
        sent_count: leads.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campanhas'] });
      toast.success('Campanha enviada com sucesso!');
    },
    onError: () => toast.error('Erro ao enviar campanha'),
  });

  // Criar template
  const createTemplate = useMutation({
    mutationFn: async (data: typeof formData) => {
      const templateData = {
        name: data.name,
        subject: data.subject,
        content: data.content,
        category: 'custom',
        variables: extractVariables(data.content),
      };

      const docRef = await addDoc(collection(db, 'email_templates'), templateData);
      return { id: docRef.id, ...templateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template salvo com sucesso!');
      setIsTemplateDialogOpen(false);
    },
    onError: () => toast.error('Erro ao salvar template'),
  });

  // Deletar campanha
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'email_campanhas', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campanhas'] });
      toast.success('Campanha excluída!');
    },
    onError: () => toast.error('Erro ao excluir campanha'),
  });

  function extractVariables(content: string): string[] {
    const matches = content.match(/\{(\w+)\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  }

  const filteredCampanhas = campanhas.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ElementType<{ className?: string }> }> = {
      rascunho: { variant: 'secondary', label: 'Rascunho', icon: FileText },
      agendado: { variant: 'outline', label: 'Agendado', icon: Clock },
      enviando: { variant: 'default', label: 'Enviando...', icon: AlertCircle },
      enviado: { variant: 'default', label: 'Enviado', icon: CheckCircle2 },
      pausado: { variant: 'destructive', label: 'Pausado', icon: XCircle },
    };
    const { variant, label, icon: Icon } = config[status] || config.rascunho;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const calculateStats = () => {
    return {
      total: campanhas.length,
      enviadas: campanhas.filter(c => c.status === 'enviado').length,
      agendadas: campanhas.filter(c => c.status === 'agendado').length,
      rascunhos: campanhas.filter(c => c.status === 'rascunho').length,
      totalEnviados: campanhas.reduce((acc, c) => acc + (c.sent_count || 0), 0),
      totalAberturas: campanhas.reduce((acc, c) => acc + (c.opened_count || 0), 0),
      taxaAbertura: campanhas.length > 0
        ? Math.round((campanhas.reduce((acc, c) => acc + (c.opened_count || 0), 0) /
          Math.max(campanhas.reduce((acc, c) => acc + (c.sent_count || 0), 0), 1)) * 100)
        : 0,
    };
  };

  const stats = calculateStats();

  const categoriasTemplate = [
    { value: 'boas_vindas', label: 'Boas-vindas', icon: '👋' },
    { value: 'follow_up', label: 'Follow-up', icon: '🔄' },
    { value: 'lembrete', label: 'Lembrete', icon: '🔔' },
    { value: 'promocional', label: 'Promocional', icon: '🎉' },
    { value: 'informativo', label: 'Informativo', icon: '📢' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              Campanhas de Email
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie campanhas de email marketing e comunicação com leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
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
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enviadas}</p>
                  <p className="text-xs text-muted-foreground">Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.agendadas}</p>
                  <p className="text-xs text-muted-foreground">Agendadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEnviados}</p>
                  <p className="text-xs text-muted-foreground">Emails Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.taxaAbertura}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Abertura</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'campanhas' | 'templates' | 'relatorio')}>
          <TabsList>
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="relatorio">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="campanhas" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar campanhas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="enviando">Enviando</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Campanhas */}
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredCampanhas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma campanha encontrada.</p>
                    <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                      Criar primeira campanha
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Destinatários</TableHead>
                        <TableHead>Taxa Abertura</TableHead>
                        <TableHead>Agendamento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampanhas.map((campanha) => (
                        <TableRow key={campanha.id}>
                          <TableCell className="font-medium">{campanha.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{campanha.subject}</TableCell>
                          <TableCell>{getStatusBadge(campanha.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm">{campanha.sent_count || 0}/{campanha.recipient_count}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{
                                    width: `${campanha.sent_count > 0
                                      ? ((campanha.opened_count || 0) / campanha.sent_count) * 100
                                      : 0}%`
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {campanha.sent_count > 0
                                  ? Math.round(((campanha.opened_count || 0) / campanha.sent_count) * 100)
                                  : 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {campanha.scheduled_at
                              ? format(new Date(campanha.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                              : campanha.sent_at
                                ? format(new Date(campanha.sent_at), "dd/MM HH:mm", { locale: ptBR })
                                : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(campanha)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {campanha.status === 'rascunho' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => sendCampaign.mutateAsync(campanha.id)}
                                  disabled={sendCampaign.isPending}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCampaign.mutateAsync(campanha.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Criar novo template */}
              <Card
                className="border-dashed border-2 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => setIsTemplateDialogOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-48">
                  <Plus className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-medium">Novo Template</p>
                  <p className="text-sm text-muted-foreground">Crie um modelo de email</p>
                </CardContent>
              </Card>

              {/* Templates existentes */}
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline" className="mt-2">
                          {categoriasTemplate.find(c => c.value === template.category)?.label || template.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{template.subject}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="relatorio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatório de Campanhas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campanhas.filter(c => c.status === 'enviado').map((campanha) => (
                    <div key={campanha.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{campanha.name}</h4>
                          <p className="text-sm text-muted-foreground">{campanha.subject}</p>
                        </div>
                        <Badge>{format(new Date(campanha.sent_at!), "dd/MM/yyyy", { locale: ptBR })}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{campanha.sent_count}</p>
                          <p className="text-xs text-muted-foreground">Enviados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{campanha.opened_count}</p>
                          <p className="text-xs text-muted-foreground">Abertos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{campanha.clicked_count}</p>
                          <p className="text-xs text-muted-foreground">Cliques</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {campanha.sent_count > 0
                              ? Math.round(((campanha.opened_count || 0) / campanha.sent_count) * 100)
                              : 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">Taxa Abertura</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Criar Campanha */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Campanha de Email</DialogTitle>
              <DialogDescription>
                Crie uma campanha de email para seus leads e pacientes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha *</Label>
                  <Input
                    placeholder="Ex: Boas-vindas Janeiro"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segmento *</Label>
                  <Select
                    value={formData.target_segment}
                    onValueChange={(v) => setFormData({ ...formData, target_segment: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Leads</SelectItem>
                      <SelectItem value="novos">Leads Novos (&lt;7 dias)</SelectItem>
                      <SelectItem value="prospecao">Em Prospecção</SelectItem>
                      <SelectItem value="avaliacao">Aguardando Avaliação</SelectItem>
                      <SelectItem value="inativos">Sem Contato Recente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {leads.length} leads totais • ~{formData.target_segment === 'novos'
                      ? leads.filter(l => (new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7).length
                      : leads.length} destinatários
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assunto do Email *</Label>
                <Input
                  placeholder="Ex: Bem-vindo à nossa clínica!"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Texto de Preview</Label>
                <Input
                  placeholder="Texto curto que aparece na caixa de entrada"
                  value={formData.preview_text}
                  onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo do Email *</Label>
                <Textarea
                  placeholder="Escreva seu email aqui... Use {nome} para personalizar com o nome do lead."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, content: formData.content + '{nome}' })}>
                    {'{nome}'}
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, content: formData.content + '{email}' })}>
                    {'{email}'}
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, content: formData.content + '{telefone}' })}>
                    {'{telefone}'}
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setFormData({ ...formData, content: formData.content + '{data_cadastro}' })}>
                    {'{data_cadastro}'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Agendamento</Label>
                <div className="flex items-center gap-4">
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(v: 'imediato' | 'agendado') => setFormData({ ...formData, schedule_type: v })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imediato">Enviar Agora</SelectItem>
                      <SelectItem value="agendado">Agendar</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.schedule_type === 'agendado' && (
                    <>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createCampaign.mutate(formData)}
                disabled={createCampaign.isPending || !formData.name || !formData.subject || !formData.content}
              >
                {createCampaign.isPending ? 'Salvando...' : 'Criar Campanha'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Template */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Template de Email</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  placeholder="Ex: Boas-vindas Padrão"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assunto Padrão *</Label>
                <Input
                  placeholder="Assunto do email"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.target_segment}
                  onValueChange={(v) => setFormData({ ...formData, target_segment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasTemplate.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conteúdo do Template *</Label>
                <Textarea
                  placeholder="Conteúdo do email..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createTemplate.mutate(formData)}>
                Salvar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
