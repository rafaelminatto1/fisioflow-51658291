import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail, MessageSquare, TrendingUp, Moon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

interface NotificationPreferencesForm {
  appointmentReminders: boolean;
  exerciseReminders: boolean;
  progressUpdates: boolean;
  systemAlerts: boolean;
  therapistMessages: boolean;
  paymentReminders: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  weekendNotifications: boolean;
}

const LOCAL_STORAGE_KEY = 'fisioflow.notification_preferences.local';

const defaultPreferences: NotificationPreferencesForm = {
  appointmentReminders: true,
  exerciseReminders: true,
  progressUpdates: true,
  systemAlerts: true,
  therapistMessages: true,
  paymentReminders: true,
  emailNotifications: true,
  smsNotifications: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  weekendNotifications: true,
};

function readLocalPrefs() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<NotificationPreferencesForm>) : {};
  } catch {
    return {};
  }
}

function writeLocalPrefs(prefs: NotificationPreferencesForm) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      emailNotifications: prefs.emailNotifications,
      smsNotifications: prefs.smsNotifications,
      quietHours: prefs.quietHours,
    }),
  );
}

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { subscribe, unsubscribe, isSubscribed, permission } = usePushNotifications();
  const {
    preferences: workerPreferences,
    isLoading,
    updatePreferences,
    isUpdating,
  } = useNotificationPreferences();
  const [preferences, setPreferences] = useState<NotificationPreferencesForm>(defaultPreferences);

  const mappedWorkerPrefs = useMemo<NotificationPreferencesForm>(() => {
    const localPrefs = readLocalPrefs();
    return {
      appointmentReminders: workerPreferences?.appointment_reminders ?? defaultPreferences.appointmentReminders,
      exerciseReminders: workerPreferences?.exercise_reminders ?? defaultPreferences.exerciseReminders,
      progressUpdates: workerPreferences?.progress_updates ?? defaultPreferences.progressUpdates,
      systemAlerts: workerPreferences?.system_alerts ?? defaultPreferences.systemAlerts,
      therapistMessages: workerPreferences?.therapist_messages ?? defaultPreferences.therapistMessages,
      paymentReminders: workerPreferences?.payment_reminders ?? defaultPreferences.paymentReminders,
      weekendNotifications: workerPreferences?.weekend_notifications ?? defaultPreferences.weekendNotifications,
      emailNotifications:
        localPrefs.emailNotifications ?? defaultPreferences.emailNotifications,
      smsNotifications: localPrefs.smsNotifications ?? defaultPreferences.smsNotifications,
      quietHours: {
        enabled: localPrefs.quietHours?.enabled ?? false,
        start: workerPreferences?.quiet_hours_start ?? defaultPreferences.quietHours.start,
        end: workerPreferences?.quiet_hours_end ?? defaultPreferences.quietHours.end,
      },
    };
  }, [workerPreferences]);

  useEffect(() => {
    setPreferences(mappedWorkerPrefs);
  }, [mappedWorkerPrefs]);

  const savePreferences = async () => {
    try {
      await updatePreferences({
        appointment_reminders: preferences.appointmentReminders,
        exercise_reminders: preferences.exerciseReminders,
        progress_updates: preferences.progressUpdates,
        system_alerts: preferences.systemAlerts,
        therapist_messages: preferences.therapistMessages,
        payment_reminders: preferences.paymentReminders,
        quiet_hours_start: preferences.quietHours.start,
        quiet_hours_end: preferences.quietHours.end,
        weekend_notifications: preferences.weekendNotifications,
      });
      writeLocalPrefs(preferences);
      toast.success('Preferências salvas com sucesso!');
    } catch (_error) {
      toast.error('Erro ao salvar preferências');
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && !isSubscribed) {
      subscribe();
    } else if (!enabled && isSubscribed) {
      unsubscribe();
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background/50 pb-20">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-3">
          <div className="flex items-center gap-4 max-w-3xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Notificações</h1>
              <p className="text-xs text-muted-foreground">Configure suas preferências de alerta</p>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl mx-auto pt-6 px-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Receba alertas diretamente no seu navegador, mesmo quando o app estiver fechado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled">Ativar notificações push</Label>
                  <p className="text-sm text-muted-foreground">
                    {permission === 'granted'
                      ? 'Notificações ativadas no navegador'
                      : permission === 'denied'
                        ? 'Notificações bloqueadas no navegador'
                        : 'Ative para receber alertas no navegador'}
                  </p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={permission === 'denied' || permission === 'unsupported'}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </CardTitle>
              <CardDescription>Receba atualizações e lembretes por email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-enabled">Ativar notificações por email</Label>
                <Switch
                  id="email-enabled"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, emailNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS
              </CardTitle>
              <CardDescription>Receba alertas via WhatsApp/SMS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-enabled">Ativar notificações SMS</Label>
                <Switch
                  id="sms-enabled"
                  checked={preferences.smsNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, smsNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tipos de Notificação
              </CardTitle>
              <CardDescription>Escolha quais eventos você deseja ser notificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="appointment-reminders">Lembretes de Agendamento</Label>
                  <p className="text-sm text-muted-foreground">Lembretes 24h antes das sessões</p>
                </div>
                <Switch
                  id="appointment-reminders"
                  checked={preferences.appointmentReminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, appointmentReminders: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exercise-reminders">Lembretes de Exercícios</Label>
                  <p className="text-sm text-muted-foreground">Lembretes diários de exercícios</p>
                </div>
                <Switch
                  id="exercise-reminders"
                  checked={preferences.exerciseReminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, exerciseReminders: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="progress-updates">Atualizações de Progresso</Label>
                  <p className="text-sm text-muted-foreground">Novas metas e conquistas alcançadas</p>
                </div>
                <Switch
                  id="progress-updates"
                  checked={preferences.progressUpdates}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, progressUpdates: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="therapist-messages">Mensagens do Terapeuta</Label>
                  <p className="text-sm text-muted-foreground">Mensagens e atualizações do seu fisioterapeuta</p>
                </div>
                <Switch
                  id="therapist-messages"
                  checked={preferences.therapistMessages}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, therapistMessages: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-reminders">Lembretes de Pagamento</Label>
                  <p className="text-sm text-muted-foreground">Vencimentos e pagamentos pendentes</p>
                </div>
                <Switch
                  id="payment-reminders"
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, paymentReminders: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Horário de Silêncio
              </CardTitle>
              <CardDescription>Configure períodos para não receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quiet-hours-enabled">Ativar horário de silêncio</Label>
                  <p className="text-sm text-muted-foreground">
                    Não receber notificações durante o período definido
                  </p>
                </div>
                <Switch
                  id="quiet-hours-enabled"
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      quietHours: { ...preferences.quietHours, enabled: checked },
                    })
                  }
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Início</Label>
                    <input
                      id="quiet-start"
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          quietHours: { ...preferences.quietHours, start: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">Fim</Label>
                    <input
                      id="quiet-end"
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          quietHours: { ...preferences.quietHours, end: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fim de Semana</CardTitle>
              <CardDescription>
                Configure se deseja receber notificações aos finais de semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekend-notifications">Receber notificações no fim de semana</Label>
                <Switch
                  id="weekend-notifications"
                  checked={preferences.weekendNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, weekendNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={savePreferences} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Preferências'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
