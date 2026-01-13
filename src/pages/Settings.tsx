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
  User,
  Bell,
  Shield,
  Clock,
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
  const { isAdmin } = usePermissions();
  
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
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerencie as configurações do sistema e da sua conta
            </p>
          </div>
        </div>

        {/* Tabs for different settings sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10 gap-0.5">
            <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Notif</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Horários</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {/* Perfil do usuário */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border p-3 sm:p-4">
              <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Nome completo</Label>
                <Input id="name" defaultValue="Dr. João Silva" className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">E-mail</Label>
                <Input id="email" type="email" defaultValue="joao@fisioflow.com.br" className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">Telefone</Label>
                <Input id="phone" defaultValue="(11) 99999-9999" className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="crefito" className="text-xs sm:text-sm">CREFITO</Label>
                <Input id="crefito" defaultValue="12345/F" className="text-sm" />
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border p-3 sm:p-4">
              <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium truncate">E-mail</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
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

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium truncate">SMS</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
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

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium truncate">Push</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
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

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium truncate">Agendamentos</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
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

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium truncate">Lembretes</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
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
            <CardHeader className="border-b border-border p-3 sm:p-4">
              <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="start" className="text-xs sm:text-sm">Início</Label>
                  <Input
                    id="start"
                    type="time"
                    value={workingHours.start}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, start: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="end" className="text-xs sm:text-sm">Fim</Label>
                  <Input
                    id="end"
                    type="time"
                    value={workingHours.end}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, end: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lunchStart" className="text-xs sm:text-sm">Início do almoço</Label>
                  <Input
                    id="lunchStart"
                    type="time"
                    value={workingHours.lunchStart}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, lunchStart: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lunchEnd" className="text-xs sm:text-sm">Fim do almoço</Label>
                  <Input
                    id="lunchEnd"
                    type="time"
                    value={workingHours.lunchEnd}
                    onChange={(e) =>
                      setWorkingHours(prev => ({ ...prev, lunchEnd: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
                Salvar Horários
              </Button>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border p-3 sm:p-4">
              <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Senha atual</Label>
                <Input id="currentPassword" type="password" className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="newPassword" className="text-xs sm:text-sm">Nova senha</Label>
                <Input id="newPassword" type="password" className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirmar nova senha</Label>
                <Input id="confirmPassword" type="password" className="text-sm" />
              </div>

              <Separator />

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium">Autenticação de dois fatores</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Adicione uma camada extra de segurança
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <NotificationPreferences />
              <NotificationHistory />
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Gerenciamento de Usuários - Apenas Admins */}
            {isAdmin && (
              <Card className="bg-gradient-card border-border shadow-card">
                <CardHeader className="border-b border-border p-3 sm:p-4">
                  <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    Gerenciamento de Usuários
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Convide novos membros para a equipe e gerencie permissões
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="font-medium text-xs sm:text-sm">Convidar Usuário</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Envie convites para novos fisioterapeutas, estagiários ou administradores
                        </p>
                      </div>
                      <Button onClick={() => setInviteModalOpen(true)} size="sm" className="touch-target self-start sm:self-auto">
                        <UserPlus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Criar Convite</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="font-medium text-xs sm:text-sm">Gerenciar Usuários</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Visualize e gerencie todos os usuários e suas funções
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/users')} size="sm" className="touch-target self-start sm:self-auto">
                        <Users className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Ver Usuários</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="font-medium text-xs sm:text-sm">Logs de Auditoria</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Visualize todos os eventos de segurança do sistema
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/audit-logs')} size="sm" className="touch-target self-start sm:self-auto">
                        <FileText className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Ver Logs</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="font-medium text-xs sm:text-sm">Gerenciar Convites</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Visualize, revogue e copie links de convites pendentes
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/invitations')} size="sm" className="touch-target self-start sm:self-auto">
                        <Mail className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Ver Convites</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <h3 className="font-medium text-xs sm:text-sm">Monitoramento de Segurança</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Acompanhe tentativas de login e atividades suspeitas
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/admin/security')} size="sm" className="touch-target self-start sm:self-auto">
                        <Shield className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Ver Monitoramento</span>
                      </Button>
                    </div>
                  </div>

                  <Alert className="text-[10px] sm:text-xs">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <AlertDescription className="text-[10px] sm:text-xs">
                      <strong>Segurança:</strong> Todos os convites expiram em 7 dias e são rastreados
                      no log de auditoria do sistema.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border p-3 sm:p-4">
                <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  Segurança da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Senha atual</Label>
                  <Input id="currentPassword" type="password" className="text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="newPassword" className="text-xs sm:text-sm">Nova senha</Label>
                  <Input id="newPassword" type="password" className="text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirmar nova senha</Label>
                  <Input id="confirmPassword" type="password" className="text-sm" />
                </div>

                <Separator />

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Autenticação de dois fatores</Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Adicione uma camada extra de segurança
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border p-3 sm:p-4">
                <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="start" className="text-xs sm:text-sm">Início</Label>
                    <Input
                      id="start"
                      type="time"
                      value={workingHours.start}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, start: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="end" className="text-xs sm:text-sm">Fim</Label>
                    <Input
                      id="end"
                      type="time"
                      value={workingHours.end}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, end: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="lunchStart" className="text-xs sm:text-sm">Início do almoço</Label>
                    <Input
                      id="lunchStart"
                      type="time"
                      value={workingHours.lunchStart}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, lunchStart: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="lunchEnd" className="text-xs sm:text-sm">Fim do almoço</Label>
                    <Input
                      id="lunchEnd"
                      type="time"
                      value={workingHours.lunchEnd}
                      onChange={(e) =>
                        setWorkingHours(prev => ({ ...prev, lunchEnd: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                </div>

                <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target">
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