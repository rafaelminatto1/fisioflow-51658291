import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Link2,
  Unlink,
  RefreshCw,
  Clock,
  Mail,
  Settings,
  AlertTriangle,
  Loader2,
  ExternalLink,
  History,
  Info,
  CheckCircle2,
  XCircle as XCircleIcon,
  Zap,
  Send,
  CalendarDays,
  Key,
  Copy
} from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CalendarSettings() {
  const {
    integration,
    syncLogs,
    syncStats,
    isLoading,
    isLoadingLogs,
    isConnected,
    connectGoogle,
    disconnectGoogle,
    syncCalendar,
    updateSettings,
    isConnecting,
    isDisconnecting,
    isSyncing,
    isUpdating,
  } = useCalendarIntegration();

  const [activeTab, setActiveTab] = useState('status');

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'sync':
        return 'Sincronização';
      case 'create':
        return 'Evento criado';
      case 'update':
        return 'Evento atualizado';
      case 'delete':
        return 'Evento removido';
      case 'disconnect':
        return 'Desconectado';
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Integração Google Calendar</h1>
            <p className="text-muted-foreground">
              Sincronize seus agendamentos automaticamente com o Google Calendar
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Configuração OAuth</span>
            </TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Card */}
              <Card className="bg-gradient-card border-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Status da Conexão
                  </CardTitle>
                  <CardDescription>
                    Visualize o status atual da integração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isConnected ? 'bg-success/20' : 'bg-muted'}`}>
                        {isConnected ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Google Calendar</p>
                        <p className="text-sm text-muted-foreground">
                          {isConnected ? 'Conectado' : 'Não conectado'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isConnected ? 'default' : 'secondary'}>
                      {isConnected ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {isConnected && integration && (
                    <>
                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{integration.calendar_email || 'N/A'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Última sincronização:</span>
                          <span className="font-medium">
                            {integration.last_synced_at
                              ? format(new Date(integration.last_synced_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                              : 'Nunca'
                            }
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Eventos sincronizados:</span>
                          <span className="font-medium">{integration.events_synced_count}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card className="bg-gradient-card border-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Ações
                  </CardTitle>
                  <CardDescription>
                    Gerencie a conexão com seu Google Calendar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isConnected ? (
                    <>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Conecte seu Google Calendar para sincronizar automaticamente suas consultas.
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={() => connectGoogle()}
                        disabled={isConnecting}
                        className="w-full"
                        size="lg"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Conectar Google Calendar
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        onClick={() => syncCalendar()}
                        disabled={isSyncing}
                        variant="outline"
                        className="w-full"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sincronizar Agora
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => disconnectGoogle()}
                        disabled={isDisconnecting}
                        variant="destructive"
                        className="w-full"
                      >
                        {isDisconnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Desconectando...
                          </>
                        ) : (
                          <>
                            <Unlink className="mr-2 h-4 w-4" />
                            Desconectar Google Calendar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats Cards */}
            {isConnected && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{integration?.events_synced_count || 0}</p>
                        <p className="text-sm text-muted-foreground">Eventos sincronizados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-success/10 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{syncStats.success}</p>
                        <p className="text-sm text-muted-foreground">Sincronizações com sucesso</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-destructive/10 rounded-lg">
                        <XCircleIcon className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{syncStats.error}</p>
                        <p className="text-sm text-muted-foreground">Erros</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6 mt-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferências de Sincronização
                </CardTitle>
                <CardDescription>
                  Configure como os eventos são sincronizados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Sincronização Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Sincronizar automaticamente quando um agendamento for criado ou alterado
                    </p>
                  </div>
                  <Switch
                    checked={integration?.auto_sync_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings({ autoSyncEnabled: checked })}
                    disabled={isUpdating || !isConnected}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enviar Eventos Automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Criar eventos no Google Calendar automaticamente ao agendar consultas
                    </p>
                  </div>
                  <Switch
                    checked={integration?.auto_send_events ?? true}
                    onCheckedChange={(checked) => updateSettings({ autoSendEvents: checked })}
                    disabled={isUpdating || !isConnected}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base">Calendário Padrão</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Selecione qual calendário será usado para sincronização
                  </p>
                  <Select
                    value={integration?.default_calendar_id || 'primary'}
                    onValueChange={(value) => updateSettings({ defaultCalendarId: value })}
                    disabled={isUpdating || !isConnected}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o calendário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Calendário Principal</SelectItem>
                      <SelectItem value="fisioflow">FisioFlow - Agendamentos</SelectItem>
                      <SelectItem value="work">Trabalho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!isConnected && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Conecte seu Google Calendar para ativar estas configurações.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Funcionalidades */}
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Funcionalidades Incluídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-medium">Sincronizar Agendamentos</h4>
                      <p className="text-sm text-muted-foreground">
                        Todos os agendamentos são enviados para o Google Calendar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-medium">Atualização Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Alterações são refletidas automaticamente no calendário
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-medium">Remoção de Cancelados</h4>
                      <p className="text-sm text-muted-foreground">
                        Agendamentos cancelados são removidos do calendário
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 opacity-60">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium">Importar do Google</h4>
                      <p className="text-sm text-muted-foreground">
                        Em breve: importar eventos do Google para o FisioFlow
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6 mt-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Sincronização
                </CardTitle>
                <CardDescription>
                  Acompanhe as últimas ações de sincronização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !syncLogs || syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma sincronização realizada ainda</p>
                    <p className="text-sm mt-1">Conecte seu Google Calendar para começar</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {syncLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                        >
                          {getStatusIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{getActionLabel(log.action)}</span>
                              <Badge
                                variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : 'Pendente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {log.message || 'Sem detalhes'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* OAuth Setup Tab */}
          <TabsContent value="setup" className="space-y-6 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Configuração para Administradores</AlertTitle>
              <AlertDescription>
                Esta seção é destinada à configuração inicial do sistema. A integração já está pré-configurada para uso.
              </AlertDescription>
            </Alert>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Passo a Passo: Configurar OAuth2 do Google
                </CardTitle>
                <CardDescription>
                  Siga estas instruções para obter as credenciais necessárias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      1
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Acesse o Google Cloud Console</h4>
                      <p className="text-sm text-muted-foreground">
                        Vá para o Google Cloud Console e crie um novo projeto ou selecione um existente.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir Google Cloud Console
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      2
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Habilite a API do Google Calendar</h4>
                      <p className="text-sm text-muted-foreground">
                        No menu "APIs & Services" → "Library", busque por "Google Calendar API" e habilite.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      3
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Configure a tela de consentimento OAuth</h4>
                      <p className="text-sm text-muted-foreground">
                        Vá em "APIs & Services" → "OAuth consent screen" e configure o tipo de usuário como "Externo".
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      4
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Crie as credenciais OAuth2</h4>
                      <p className="text-sm text-muted-foreground">
                        Em "APIs & Services" → "Credentials", clique em "Create Credentials" → "OAuth client ID".
                        Selecione "Web application" e adicione as URLs autorizadas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      5
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Configure no Firebase</h4>
                      <p className="text-sm text-muted-foreground">
                        Copie o CLIENT_ID e CLIENT_SECRET e configure no painel do Firebase Console em Authentication → Sign-in method → Google.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir Firebase Console
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">URLs de Redirecionamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Adicione estas URLs nas "Authorized redirect URIs" no Google Cloud Console:
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 font-mono text-sm">
                      <span className="flex-1 truncate">{import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Escopos Necessários</h4>
                  <p className="text-sm text-muted-foreground">
                    Adicione estes escopos na configuração do OAuth:
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 font-mono text-xs">
                      <span>https://www.googleapis.com/auth/calendar</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyToClipboard('https://www.googleapis.com/auth/calendar')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 font-mono text-xs">
                      <span>https://www.googleapis.com/auth/calendar.events</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyToClipboard('https://www.googleapis.com/auth/calendar.events')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Precisa de ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1" asChild>
                <a
                  href="https://support.google.com/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Central de Ajuda do Google Calendar
                </a>
              </Button>
              <Button variant="outline" className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                Contatar Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
