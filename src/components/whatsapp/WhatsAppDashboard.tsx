import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useWhatsAppConnection,
  useWhatsAppMetricsSummary,
  useWhatsAppMessages,
  useWhatsAppTemplates,
  useWhatsAppDailyStats,
  useWhatsAppWebhookLogs,
  useSendTestMessage,
  useUpdateTemplate,
} from '@/hooks/useWhatsAppMetrics';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Send,
  RefreshCw,
  FileText,
  Activity,
  AlertCircle,
  Wifi,
  WifiOff,
  TrendingUp,
  Phone,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    enviado: { label: 'Enviado', variant: 'secondary' },
    entregue: { label: 'Entregue', variant: 'default' },
    lido: { label: 'Lido', variant: 'default' },
    falhou: { label: 'Falhou', variant: 'destructive' },
    pendente: { label: 'Pendente', variant: 'outline' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}

// Metric card component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variants = {
    default: 'bg-card',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card className={variants[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && <p className="text-xs text-emerald-600">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl ${iconVariants[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Test message dialog
function TestMessageDialog() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá! Esta é uma mensagem de teste do Activity Fisioterapia.');
  const sendTest = useSendTestMessage();

  const handleSend = async () => {
    await sendTest.mutateAsync({ phone, message });
    setOpen(false);
    setPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Send className="h-4 w-4" />
          Testar Envio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Número (com código do país)</Label>
            <Input
              placeholder="+5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!phone || sendTest.isPending}>
            {sendTest.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Template edit dialog
interface Template {
  id: string;
  name: string;
  template_key: string;
  content: string;
  status: string;
  variables?: string[];
}

function TemplateEditDialog({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(template.content);
  const updateTemplate = useUpdateTemplate();

  const handleSave = async () => {
    await updateTemplate.mutateAsync({ id: template.id, content });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Template: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {template.variables?.map((v: string) => `{{${v}}}`).join(', ')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Dashboard Component
export function WhatsAppDashboard() {
  const { data: connection, isLoading: loadingConnection, refetch: refetchConnection } = useWhatsAppConnection();
  const { data: metrics, isLoading: loadingMetrics } = useWhatsAppMetricsSummary(30);
  const { data: messages, isLoading: loadingMessages } = useWhatsAppMessages(50);
  const { data: templates, isLoading: loadingTemplates } = useWhatsAppTemplates();
  const { data: dailyStats, isLoading: loadingStats } = useWhatsAppDailyStats(7);
  const { data: webhookLogs } = useWhatsAppWebhookLogs(50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Business</h2>
          <p className="text-muted-foreground">Dashboard de integração e métricas</p>
        </div>
        <div className="flex items-center gap-2">
          <TestMessageDialog />
          <Button variant="outline" onClick={() => refetchConnection()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className={connection?.connected
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200'
        : 'bg-red-50 dark:bg-red-950/30 border-red-200'
      }>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            {loadingConnection ? (
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : connection?.connected ? (
              <Wifi className="h-5 w-5 text-emerald-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">
                {loadingConnection
                  ? 'Verificando conexão...'
                  : connection?.connected
                    ? 'WhatsApp Business API Conectado'
                    : 'Desconectado'
                }
              </p>
              {connection?.error && (
                <p className="text-sm text-red-600">{connection.error}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {loadingMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Enviadas"
            value={metrics?.totalSent || 0}
            subtitle="Últimos 30 dias"
            icon={Send}
          />
          <MetricCard
            title="Taxa de Entrega"
            value={`${metrics?.deliveryRate || 0}%`}
            subtitle={`${metrics?.delivered || 0} entregues`}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Taxa de Leitura"
            value={`${metrics?.readRate || 0}%`}
            subtitle={`${metrics?.read || 0} lidas`}
            icon={Eye}
            variant="success"
          />
          <MetricCard
            title="Falhas"
            value={metrics?.failed || 0}
            subtitle={`${Math.round((metrics?.failed || 0) / Math.max(metrics?.totalSent || 1, 1) * 100)}% do total`}
            icon={XCircle}
            variant={metrics?.failed && metrics.failed > 5 ? 'danger' : 'default'}
          />
        </div>
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Taxa de Resposta"
          value={`${metrics?.responseRate || 0}%`}
          subtitle="Pacientes que responderam"
          icon={MessageSquare}
        />
        <MetricCard
          title="Tempo Médio de Resposta"
          value={`${metrics?.avgResponseTime || 0} min`}
          subtitle="Entre envio e resposta"
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Activity className="h-4 w-4" />
            Webhook Logs
          </TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens por Dia</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-80" />
              ) : dailyStats && dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => format(new Date(v), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sent" name="Enviadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name="Entregues" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="read" name="Lidas" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Falhas" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-muted-foreground">
                  <p>Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Recentes</CardTitle>
              <CardDescription>Últimas 50 mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMessages ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {(messages as any[])?.map((msg: {
                      id: string;
                      created_at: string;
                      phone_number: string;
                      status: string;
                      template_key?: string;
                      patients?: { name: string };
                    }) => (
                      <div key={msg.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            <Phone className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {msg.patients?.name || msg.phone_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {msg.template_key || 'Mensagem personalizada'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={msg.status} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagem</CardTitle>
              <CardDescription>Templates aprovados para envio via WhatsApp Business</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {templates?.map((template: Template) => (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{template.name}</p>
                            <Badge variant="outline">{template.template_key}</Badge>
                            <Badge variant={template.status === 'ativo' ? 'default' : 'secondary'}>
                              {template.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.content}
                          </p>
                          <div className="flex gap-1">
                            {template.variables?.map((v: string) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <TemplateEditDialog template={template} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Logs Tab */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Webhook</CardTitle>
              <CardDescription>Eventos recebidos do WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {webhookLogs?.map((log: {
                    id: string;
                    created_at: string;
                    event_type: string;
                    phone_number?: string;
                    message_content?: string;
                    processed: boolean;
                  }) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${log.processed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          {log.processed ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{log.event_type}</p>
                          {log.phone_number && (
                            <p className="text-sm text-muted-foreground">{log.phone_number}</p>
                          )}
                          {log.message_content && (
                            <p className="text-xs text-muted-foreground truncate max-w-md">
                              {log.message_content}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.processed ? 'default' : 'secondary'}>
                          {log.processed ? 'Processado' : 'Pendente'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WhatsAppDashboard;
