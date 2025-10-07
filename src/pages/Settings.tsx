import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Clock,
  History,
  UserPlus,
  Users,
  FileText,
  Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { usePermissions } from '@/hooks/usePermissions';

const Settings = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    appointments: true,
    reminders: true
  });

  const [workingHours, setWorkingHours] = useState({
    start: '08:00',
    end: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00'
  });

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'notifications', 'security', 'schedule'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header responsivo */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie as configurações do sistema e da sua conta
            </p>
          </div>
        </div>

        {/* Tabs for different settings sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Horários</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Perfil do usuário */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="w-5 h-5" />
                Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" defaultValue="Dr. João Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" defaultValue="joao@fisioflow.com.br" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" defaultValue="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crefito">CREFITO</Label>
                <Input id="crefito" defaultValue="12345/F" />
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">E-mail</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">SMS</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações por SMS
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, sms: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Push</Label>
                    <p className="text-xs text-muted-foreground">
                      Notificações push no navegador
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Agendamentos</Label>
                    <p className="text-xs text-muted-foreground">
                      Notificar sobre novos agendamentos
                    </p>
                  </div>
                  <Switch
                    checked={notifications.appointments}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, appointments: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Lembretes</Label>
                    <p className="text-xs text-muted-foreground">
                      Lembretes automáticos de consultas
                    </p>
                  </div>
                  <Switch
                    checked={notifications.reminders}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, reminders: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horário de funcionamento */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Início</Label>
                  <Input
                    id="start"
                    type="time"
                    value={workingHours.start}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, start: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Fim</Label>
                  <Input
                    id="end"
                    type="time"
                    value={workingHours.end}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lunchStart">Início do almoço</Label>
                  <Input
                    id="lunchStart"
                    type="time"
                    value={workingHours.lunchStart}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, lunchStart: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lunchEnd">Fim do almoço</Label>
                  <Input
                    id="lunchEnd"
                    type="time"
                    value={workingHours.lunchEnd}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, lunchEnd: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                Salvar Horários
              </Button>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input id="confirmPassword" type="password" />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Autenticação de dois fatores</Label>
                    <p className="text-xs text-muted-foreground">
                      Adicione uma camada extra de segurança
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <NotificationPreferences />
              <NotificationHistory />
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Gerenciamento de Usuários - Apenas Admins */}
            {isAdmin && (
              <Card className="bg-gradient-card border-border shadow-card">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gerenciamento de Usuários
                  </CardTitle>
                  <CardDescription>
                    Convide novos membros para a equipe e gerencie permissões
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Convidar Usuário</h3>
                        <p className="text-sm text-muted-foreground">
                          Envie convites para novos fisioterapeutas, estagiários ou administradores
                        </p>
                      </div>
                      <Button onClick={() => setInviteModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Criar Convite
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Gerenciar Usuários</h3>
                        <p className="text-sm text-muted-foreground">
                          Visualize e gerencie todos os usuários e suas funções
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        Ver Usuários
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Logs de Auditoria</h3>
                        <p className="text-sm text-muted-foreground">
                          Visualize todos os eventos de segurança do sistema
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/audit-logs')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Logs
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Gerenciar Convites</h3>
                        <p className="text-sm text-muted-foreground">
                          Visualize, revogue e copie links de convites pendentes
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/invitations')}>
                        <Mail className="mr-2 h-4 w-4" />
                        Ver Convites
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Monitoramento de Segurança</h3>
                        <p className="text-sm text-muted-foreground">
                          Acompanhe tentativas de login e atividades suspeitas
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/security')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Ver Monitoramento
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Segurança:</strong> Todos os convites expiram em 7 dias e são rastreados
                      no log de auditoria do sistema.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Segurança da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input id="confirmPassword" type="password" />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Autenticação de dois fatores</Label>
                      <p className="text-xs text-muted-foreground">
                        Adicione uma camada extra de segurança
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Início</Label>
                    <Input
                      id="start"
                      type="time"
                      value={workingHours.start}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, start: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Fim</Label>
                    <Input
                      id="end"
                      type="time"
                      value={workingHours.end}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, end: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lunchStart">Início do almoço</Label>
                    <Input
                      id="lunchStart"
                      type="time"
                      value={workingHours.lunchStart}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, lunchStart: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lunchEnd">Fim do almoço</Label>
                    <Input
                      id="lunchEnd"
                      type="time"
                      value={workingHours.lunchEnd}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, lunchEnd: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                  Salvar Horários
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </MainLayout>
  );
};

export default Settings;