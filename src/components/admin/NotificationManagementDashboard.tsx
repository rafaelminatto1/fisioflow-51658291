import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Users, 
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react'
import { NotificationType } from '@/types/notifications'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/errors/logger'
import NotificationAnalyticsDashboard from '@/components/notifications/NotificationAnalyticsDashboard'

interface NotificationTemplate {
  id: string
  type: NotificationType
  title_template: string
  body_template: string
  icon_url?: string
  badge_url?: string
  actions: any[]
  default_data: Record<string, any>
  active: boolean
  created_at: string
  updated_at: string
}

interface NotificationCampaign {
  id: string
  name: string
  template_type: NotificationType
  target_users: 'all' | 'segment' | 'specific'
  user_segment?: string
  scheduled_at?: string
  sent_at?: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  total_recipients?: number
  sent_count?: number
  delivered_count?: number
  clicked_count?: number
}

const NotificationTemplateForm: React.FC<{
  template?: NotificationTemplate
  onSave: (template: Partial<NotificationTemplate>) => void
  onCancel: () => void
}> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    type: template?.type || NotificationType.SYSTEM_ALERT,
    title_template: template?.title_template || '',
    body_template: template?.body_template || '',
    icon_url: template?.icon_url || '',
    active: template?.active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Notificação</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as NotificationType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(NotificationType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título (Template)</Label>
        <Input
          id="title"
          value={formData.title_template}
          onChange={(e) => setFormData(prev => ({ ...prev, title_template: e.target.value }))}
          placeholder="Ex: Lembrete de {{type}} - {{date}}"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {{variável}} para campos dinâmicos
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Corpo (Template)</Label>
        <Textarea
          id="body"
          value={formData.body_template}
          onChange={(e) => setFormData(prev => ({ ...prev, body_template: e.target.value }))}
          placeholder="Ex: Você tem {{evento}} agendado para {{data}} às {{hora}}"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">URL do Ícone (opcional)</Label>
        <Input
          id="icon"
          value={formData.icon_url}
          onChange={(e) => setFormData(prev => ({ ...prev, icon_url: e.target.value }))}
          placeholder="/icons/notification-icon.png"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
        />
        <Label htmlFor="active">Template Ativo</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {template ? 'Atualizar' : 'Criar'} Template
        </Button>
      </div>
    </form>
  )
}

const BroadcastNotificationForm: React.FC<{
  onSend: (data: any) => void
  onCancel: () => void
}> = ({ onSend, onCancel }) => {
  const [formData, setFormData] = useState({
    type: NotificationType.SYSTEM_ALERT,
    title: '',
    body: '',
    target: 'all' as 'all' | 'therapists' | 'patients',
    scheduleAt: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="broadcast-type">Tipo</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as NotificationType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(NotificationType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="broadcast-title">Título</Label>
        <Input
          id="broadcast-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Título da notificação"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="broadcast-body">Mensagem</Label>
        <Textarea
          id="broadcast-body"
          value={formData.body}
          onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
          placeholder="Conteúdo da notificação"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">Público Alvo</Label>
        <Select 
          value={formData.target} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, target: value as any }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Usuários</SelectItem>
            <SelectItem value="therapists">Apenas Fisioterapeutas</SelectItem>
            <SelectItem value="patients">Apenas Pacientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule">Agendar Para (opcional)</Label>
        <Input
          id="schedule"
          type="datetime-local"
          value={formData.scheduleAt}
          onChange={(e) => setFormData(prev => ({ ...prev, scheduleAt: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Deixe em branco para enviar imediatamente
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Send className="w-4 h-4 mr-2" />
          {formData.scheduleAt ? 'Agendar' : 'Enviar'} Notificação
        </Button>
      </div>
    </form>
  )
}

export const NotificationManagementDashboard: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (templatesError) throw templatesError
      setTemplates(templatesData || [])

      // Load campaigns (if table exists)
      // const { data: campaignsData } = await supabase
      //   .from('notification_campaigns')
      //   .select('*')
      //   .order('created_at', { ascending: false })
      // setCampaigns(campaignsData || [])

    } catch (error) {
      logger.error('Failed to load notification management data', error, 'NotificationManagementDashboard')
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (templateData: Partial<NotificationTemplate>) => {
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('notification_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        toast.success('Template atualizado com sucesso!')
      } else {
        // Create new template
        const { error } = await supabase
          .from('notification_templates')
          .insert([templateData])

        if (error) throw error
        toast.success('Template criado com sucesso!')
      }

      setShowTemplateDialog(false)
      setEditingTemplate(null)
      loadData()
    } catch (error) {
      logger.error('Failed to save template', error, 'NotificationManagementDashboard')
      toast.error('Erro ao salvar template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return

    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      
      toast.success('Template excluído com sucesso!')
      loadData()
    } catch (error) {
      logger.error('Failed to delete template', error, 'NotificationManagementDashboard')
      toast.error('Erro ao excluir template')
    }
  }

  const handleToggleTemplate = async (templateId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ active })
        .eq('id', templateId)

      if (error) throw error
      
      toast.success(`Template ${active ? 'ativado' : 'desativado'} com sucesso!`)
      loadData()
    } catch (error) {
      logger.error('Failed to toggle template', error, 'NotificationManagementDashboard')
      toast.error('Erro ao alterar status do template')
    }
  }

  const handleBroadcastNotification = async (data: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: data.type,
          title: data.title,
          body: data.body,
          target: data.target,
          scheduleAt: data.scheduleAt || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send broadcast notification')
      }

      toast.success(data.scheduleAt ? 'Notificação agendada com sucesso!' : 'Notificação enviada com sucesso!')
      setShowBroadcastDialog(false)
    } catch (error) {
      logger.error('Failed to send broadcast notification', error, 'NotificationManagementDashboard')
      toast.error('Erro ao enviar notificação')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Notificações</h2>
          <p className="text-muted-foreground">
            Configure templates, envie notificações e monitore performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Enviar Notificação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Notificação</DialogTitle>
                <DialogDescription>
                  Envie uma notificação para usuários específicos ou todos
                </DialogDescription>
              </DialogHeader>
              <BroadcastNotificationForm
                onSend={handleBroadcastNotification}
                onCancel={() => setShowBroadcastDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Templates de Notificação</h3>
            
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTemplate(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Editar' : 'Criar'} Template
                  </DialogTitle>
                  <DialogDescription>
                    Configure um template para notificações automáticas
                  </DialogDescription>
                </DialogHeader>
                <NotificationTemplateForm
                  template={editingTemplate || undefined}
                  onSave={handleSaveTemplate}
                  onCancel={() => {
                    setShowTemplateDialog(false)
                    setEditingTemplate(null)
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {template.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {template.title_template}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.active}
                            onCheckedChange={(checked) => handleToggleTemplate(template.id, checked)}
                          />
                          <span className="text-sm">
                            {template.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template)
                              setShowTemplateDialog(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhum template encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Crie seu primeiro template para começar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <NotificationAnalyticsDashboard />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Notificações Globais</Label>
                    <p className="text-xs text-muted-foreground">
                      Ativar/desativar todas as notificações do sistema
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Modo de Desenvolvimento</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar notificações apenas para admins
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Log Detalhado</Label>
                    <p className="text-xs text-muted-foreground">
                      Registrar todas as interações de notificação
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Limites e Frequência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Limite por Usuário/Hora</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    defaultValue="10"
                    min="1"
                    max="100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Tamanho do Lote</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    defaultValue="100"
                    min="10"
                    max="1000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retry-attempts">Tentativas de Reenvio</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    defaultValue="3"
                    min="0"
                    max="10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationManagementDashboard