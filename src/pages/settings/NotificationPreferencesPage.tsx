import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail, MessageSquare, TrendingUp, Moon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { doc, getDoc, setDoc, updateDoc, db } from '@/integrations/firebase/app';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface NotificationPreferences {
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

const defaultPreferences: NotificationPreferences = {
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

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, unsubscribe, isSubscribed, permission } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const prefsRef = doc(db, 'user_notification_preferences', user.uid);
      const prefsDoc = await getDoc(prefsRef);

      if (prefsDoc.exists()) {
        setPreferences({ ...defaultPreferences, ...prefsDoc.data() } as NotificationPreferences);
      }
    } catch (error) {
      logger.error('Error loading notification preferences', error, 'NotificationPreferencesPage');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const prefsRef = doc(db, 'user_notification_preferences', user.uid);
      const prefsDoc = await getDoc(prefsRef);

      const data = {
        ...preferences,
        updated_at: new Date().toISOString(),
      };

      if (prefsDoc.exists()) {
        await updateDoc(prefsRef, data);
      } else {
        await setDoc(prefsRef, {
          ...data,
          created_at: new Date().toISOString(),
        });
      }

      toast.success('Preferências salvas com sucesso!');
    } catch (error) {
      logger.error('Error saving notification preferences', error, 'NotificationPreferencesPage');
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
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
        {/* Header */}
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
          {/* Push Notifications */}
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

              {permission === 'denied' && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  As notificações estão bloqueadas no seu navegador. Habilite-as nas configurações do navegador para ativar.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </CardTitle>
              <CardDescription>
                Receba atualizações e lembretes por email
              </CardDescription>
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

          {/* SMS Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS
              </CardTitle>
              <CardDescription>
                Receba alertas via WhatsApp/SMS
              </CardDescription>
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

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tipos de Notificação
              </CardTitle>
              <CardDescription>
                Escolha quais eventos você deseja ser notificado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="appointment-reminders">Lembretes de Agendamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Lembretes 24h antes das sessões
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Lembretes diários de exercícios
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Novas metas e conquistas alcançadas
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Mensagens e atualizações do seu fisioterapeuta
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Vencimentos e pagamentos pendentes
                  </p>
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

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Horário de Silêncio
              </CardTitle>
              <CardDescription>
                Configure períodos para não receber notificações
              </CardDescription>
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
                    setPreferences({ ...preferences, quietHours: { ...preferences.quietHours, enabled: checked } })
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

          {/* Weekend */}
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

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={savePreferences} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Preferências'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
