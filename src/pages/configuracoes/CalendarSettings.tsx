import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarConnection {
  isConnected: boolean;
  email?: string;
  lastSyncedAt?: string;
}

export default function CalendarSettings() {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // In a real implementation, this would come from the database
  const [connection, setConnection] = useState<CalendarConnection>({
    isConnected: false,
    email: undefined,
    lastSyncedAt: undefined,
  });

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/configuracoes/calendario`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao conectar Google Calendar:', error);
      toast.error('Erro ao conectar com Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    
    try {
      // In a real implementation, you would:
      // 1. Revoke the Google OAuth token
      // 2. Remove the connection from the database
      // 3. Clear any cached calendar data
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      
      setConnection({
        isConnected: false,
        email: undefined,
        lastSyncedAt: undefined,
      });
      
      toast.success('Google Calendar desconectado com sucesso');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      // In a real implementation, this would trigger a sync with Google Calendar
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      
      setConnection(prev => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      toast.success('Calendário sincronizado com sucesso');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar calendário');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do Calendário</h1>
            <p className="text-muted-foreground">
              Conecte seu Google Calendar para sincronizar agendamentos automaticamente
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Card */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Visualize o status atual da integração com Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${connection.isConnected ? 'bg-success/20' : 'bg-muted'}`}>
                    {connection.isConnected ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.isConnected ? 'Conectado' : 'Não conectado'}
                    </p>
                  </div>
                </div>
                <Badge variant={connection.isConnected ? 'default' : 'secondary'}>
                  {connection.isConnected ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {connection.isConnected && (
                <>
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{connection.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Última sincronização:</span>
                      <span className="font-medium">
                        {connection.lastSyncedAt 
                          ? format(new Date(connection.lastSyncedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'Nunca'
                        }
                      </span>
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
                <Link2 className="h-5 w-5" />
                Ações
              </CardTitle>
              <CardDescription>
                Gerencie a conexão com seu Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!connection.isConnected ? (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Conecte seu Google Calendar para sincronizar automaticamente suas consultas 
                      e receber lembretes diretamente no seu calendário.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={handleConnectGoogle} 
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
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Conectar Google Calendar
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={handleSync} 
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
                    onClick={handleDisconnect} 
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

        {/* Instructions Card */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Como funciona a integração?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Conecte sua conta</h4>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Conectar Google Calendar" e autorize o acesso à sua conta Google.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Sincronização automática</h4>
                  <p className="text-sm text-muted-foreground">
                    Suas consultas serão sincronizadas automaticamente com seu calendário.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Receba lembretes</h4>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações de lembretes diretamente no Google Calendar.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
