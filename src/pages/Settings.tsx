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
  Mail,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { logger } from '@/lib/errors/logger';

// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

type TabValue = 'profile' | 'notifications' | 'security' | 'schedule';

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

interface ShowPasswordState {
  new: boolean;
  confirm: boolean;
}

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointments: boolean;
  reminders: boolean;
}

interface WorkingHours {
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
}

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

// ============================================================================================
// CONSTANTS
// ============================================================================================

const VALID_TABS: TabValue[] = ['profile', 'notifications', 'security', 'schedule'];

const PASSWORD_REQUIREMENTS = {
  minLength: 6,
} as const;

const DEFAULT_WORKING_HOURS: WorkingHours = {
  start: '08:00',
  end: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
} as const;

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email: true,
  sms: false,
  push: true,
  appointments: true,
  reminders: true,
} as const;

// ============================================================================================
// SUB-COMPONENTS
// ============================================================================================

/**
 * Reusable notification toggle item
 */
const NotificationToggle: React.FC<NotificationToggleProps> = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="space-y-0.5 min-w-0">
      <Label htmlFor={id} className="text-xs sm:text-sm font-medium truncate">
        {label}
      </Label>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        {description}
      </p>
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  </div>
);

/**
 * Quick action card for admin section
 */
const QuickAction: React.FC<QuickActionProps> = memo(({
  title,
  description,
  icon,
  buttonText,
  onClick,
  variant = 'default',
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
    <div className="space-y-0.5">
      <h3 className="font-medium text-xs sm:text-sm">{title}</h3>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        {description}
      </p>
    </div>
    <Button
      onClick={onClick}
      variant={variant}
      size="sm"
      className="touch-target self-start sm:self-auto"
    >
      {icon}
      <span className="text-xs sm:text-sm ml-1.5 sm:ml-2">{buttonText}</span>
    </Button>
  </div>
));

QuickAction.displayName = 'QuickAction';

/**
 * Password input with visibility toggle
 */
const PasswordInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  placeholder?: string;
  disabled?: boolean;
}> = memo(({
  id,
  label,
  value,
  onChange,
  showPassword,
  onTogglePassword,
  placeholder,
  disabled,
}) => (
  <div className="space-y-1.5 sm:space-y-2">
    <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        className="text-sm pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
));

PasswordInput.displayName = 'PasswordInput';

/**
 * Working hours input section
 */
const WorkingHoursSection: React.FC<{
  workingHours: WorkingHours;
  onChange: (hours: WorkingHours) => void;
  onSave: () => void;
}> = memo(({ workingHours, onChange, onSave }) => (
  <Card className="bg-gradient-card border-border shadow-card">
    <CardHeader className="border-b border-border p-3 sm:p-4">
      <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        Horário de Funcionamento
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <TimeInput
          id="start"
          label="Início"
          value={workingHours.start}
          onChange={(v) => onChange({ ...workingHours, start: v })}
        />
        <TimeInput
          id="end"
          label="Fim"
          value={workingHours.end}
          onChange={(v) => onChange({ ...workingHours, end: v })}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <TimeInput
          id="lunchStart"
          label="Início do almoço"
          value={workingHours.lunchStart}
          onChange={(v) => onChange({ ...workingHours, lunchStart: v })}
        />
        <TimeInput
          id="lunchEnd"
          label="Fim do almoço"
          value={workingHours.lunchEnd}
          onChange={(v) => onChange({ ...workingHours, lunchEnd: v })}
        />
      </div>

      <Button
        className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target"
        onClick={onSave}
      >
        Salvar Horários
      </Button>
    </CardContent>
  </Card>
));

WorkingHoursSection.displayName = 'WorkingHoursSection';

/**
 * Simple time input component
 */
const TimeInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = memo(({ id, label, value, onChange }) => (
  <div className="space-y-1.5 sm:space-y-2">
    <Label htmlFor={id} className="text-xs sm:text-sm">{label}</Label>
    <Input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm"
    />
  </div>
));

TimeInput.displayName = 'TimeInput';

/**
 * Notifications section component
 */
const NotificationsSection: React.FC<{
  notifications: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}> = memo(({ notifications, onChange }) => (
  <Card className="bg-gradient-card border-border shadow-card">
    <CardHeader className="border-b border-border p-3 sm:p-4">
      <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        Notificações
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="space-y-2 sm:space-y-3">
        <NotificationToggle
          id="email"
          label="E-mail"
          description="Receber notificações por e-mail"
          checked={notifications.email}
          onCheckedChange={(checked) => onChange({ ...notifications, email: checked })}
        />
        <NotificationToggle
          id="sms"
          label="SMS"
          description="Receber notificações por SMS"
          checked={notifications.sms}
          onCheckedChange={(checked) => onChange({ ...notifications, sms: checked })}
        />
        <NotificationToggle
          id="push"
          label="Push"
          description="Notificações push no navegador"
          checked={notifications.push}
          onCheckedChange={(checked) => onChange({ ...notifications, push: checked })}
        />

        <Separator />

        <NotificationToggle
          id="appointments"
          label="Agendamentos"
          description="Notificar sobre novos agendamentos"
          checked={notifications.appointments}
          onCheckedChange={(checked) => onChange({ ...notifications, appointments: checked })}
        />
        <NotificationToggle
          id="reminders"
          label="Lembretes"
          description="Lembretes automáticos de consultas"
          checked={notifications.reminders}
          onCheckedChange={(checked) => onChange({ ...notifications, reminders: checked })}
        />
      </div>
    </CardContent>
  </Card>
));

NotificationsSection.displayName = 'NotificationsSection';

// ============================================================================================
// CUSTOM HOOKS
// ============================================================================================

/**
 * Hook for managing password change form
 */
const usePasswordForm = () => {
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState<ShowPasswordState>({
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const validatePassword = useCallback((): string | null => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      return 'Preencha todos os campos de senha.';
    }
    if (passwordForm.newPassword.length < PASSWORD_REQUIREMENTS.minLength) {
      return `A senha deve ter pelo menos ${PASSWORD_REQUIREMENTS.minLength} caracteres.`;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'A nova senha e a confirmação devem ser iguais.';
    }
    return null;
  }, [passwordForm]);

  const handleChangePassword = useCallback(async () => {
    const error = validatePassword();
    if (error) {
      toast({
        title: 'Erro de validação',
        description: error,
        variant: 'destructive'
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await updatePassword(passwordForm.newPassword);

      if (result.error) {
        toast({
          title: 'Erro ao alterar senha',
          description: result.error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Senha alterada com sucesso!',
          description: 'Sua nova senha já está ativa.',
        });
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch {
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao alterar a senha. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordForm, updatePassword, toast, validatePassword]);

  const passwordsMatch = useMemo(
    () => passwordForm.newPassword && passwordForm.confirmPassword &&
      passwordForm.newPassword === passwordForm.confirmPassword,
    [passwordForm]
  );

  return {
    passwordForm,
    setPasswordForm,
    showPassword,
    setShowPassword,
    isChangingPassword,
    handleChangePassword,
    passwordsMatch
  };
};

// ============================================================================================
// MAIN COMPONENT
// ============================================================================================

const Settings = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('profile');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { isAdmin } = usePermissions();
  const { user } = useAuth();

  // Custom hook for password management
  const {
    passwordForm,
    setPasswordForm,
    showPassword,
    setShowPassword,
    isChangingPassword,
    handleChangePassword,
    passwordsMatch
  } = usePasswordForm();

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') as TabValue;
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Sync tab changes with URL
  const handleTabChange = useCallback((value: string) => {
    const tabValue = value as TabValue;
    setActiveTab(tabValue);
    navigate(`/settings?tab=${tabValue}`, { replace: true });
  }, [navigate]);

  const { toast } = useToast();

  // Load saved working hours from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('workingHours');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorkingHours;
        setWorkingHours(parsed);
      } catch (e) {
        logger.warn('Failed to parse saved working hours', e, 'Settings');
      }
    }
  }, []);

  // Save working hours to localStorage
  const handleSaveWorkingHours = useCallback(() => {
    try {
      localStorage.setItem('workingHours', JSON.stringify(workingHours));
      toast({
        title: 'Horários salvos!',
        description: 'Seu horário de funcionamento foi atualizado.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar seus horários. Tente novamente.',
        variant: 'destructive'
      });
    }
  }, [workingHours, toast]);

  // Enable 2FA (placeholder - requires backend integration)
  const handleEnable2FA = useCallback(async (enabled: boolean) => {
    if (enabled) {
      toast({
        title: 'Autenticação de dois fatores',
        description: 'Em desenvolvimento: Integração com Firebase Auth 2FA será implementada em breve.',
        variant: 'default'
      });
    }
  }, [toast]);

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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

              <NotificationsSection
                notifications={notifications}
                onChange={setNotifications}
              />

              <WorkingHoursSection
                workingHours={workingHours}
                onChange={setWorkingHours}
                onSave={handleSaveWorkingHours}
              />
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
                    <QuickAction
                      title="Convidar Usuário"
                      description="Envie convites para novos fisioterapeutas, estagiários ou administradores"
                      icon={<UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      buttonText="Criar Convite"
                      onClick={() => setInviteModalOpen(true)}
                    />

                    <QuickAction
                      title="Gerenciar Usuários"
                      description="Visualize e gerencie todos os usuários e suas funções"
                      icon={<Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      buttonText="Ver Usuários"
                      onClick={() => navigate('/admin/users')}
                      variant="outline"
                    />

                    <QuickAction
                      title="Logs de Auditoria"
                      description="Visualize todos os eventos de segurança do sistema"
                      icon={<FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      buttonText="Ver Logs"
                      onClick={() => navigate('/admin/audit-logs')}
                      variant="outline"
                    />

                    <QuickAction
                      title="Gerenciar Convites"
                      description="Visualize, revogue e copie links de convites pendentes"
                      icon={<Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      buttonText="Ver Convites"
                      onClick={() => navigate('/admin/invitations')}
                      variant="outline"
                    />

                    <QuickAction
                      title="Monitoramento de Segurança"
                      description="Acompanhe tentativas de login e atividades suspeitas"
                      icon={<Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      buttonText="Ver Monitoramento"
                      onClick={() => navigate('/admin/security')}
                      variant="outline"
                    />
                  </div>

                  <Alert className="text-[10px] sm:text-xs">
                    <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                  Alterar Senha
                </CardTitle>
                {user?.email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Logado como: <span className="font-medium">{user.email}</span>
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <PasswordInput
                  id="newPasswordSec"
                  label="Nova senha"
                  value={passwordForm.newPassword}
                  onChange={(v) => setPasswordForm(prev => ({ ...prev, newPassword: v }))}
                  showPassword={showPassword.new}
                  onTogglePassword={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                  placeholder={`Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres`}
                  disabled={isChangingPassword}
                />

                <PasswordInput
                  id="confirmPasswordSec"
                  label="Confirmar nova senha"
                  value={passwordForm.confirmPassword}
                  onChange={(v) => setPasswordForm(prev => ({ ...prev, confirmPassword: v }))}
                  showPassword={showPassword.confirm}
                  onTogglePassword={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                  placeholder="Digite a senha novamente"
                  disabled={isChangingPassword}
                />

                {passwordForm.newPassword && passwordForm.confirmPassword && (
                  <div className={cn(
                    "text-xs flex items-center gap-1 transition-colors",
                    passwordsMatch ? "text-green-600" : "text-red-500"
                  )}>
                    {passwordsMatch ? (
                      <>
                        <Check className="h-3 w-3" />
                        Senhas conferem
                      </>
                    ) : (
                      'As senhas não são iguais'
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-2 sm:space-y-3">
                  <NotificationToggle
                    id="2fa"
                    label="Autenticação de dois fatores"
                    description="Adicione uma camada extra de segurança"
                    checked={false}
                    onCheckedChange={handleEnable2FA}
                  />
                </div>

                <Button
                  className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
              </CardContent>
            </Card>

            <BackupSettings />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <WorkingHoursSection
              workingHours={workingHours}
              onChange={setWorkingHours}
              onSave={handleSaveWorkingHours}
            />
          </TabsContent>
        </Tabs>
      </div>

      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </MainLayout>
  );
};

export default Settings;
