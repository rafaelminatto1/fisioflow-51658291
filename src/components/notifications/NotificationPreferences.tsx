import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Switch } from '@/components/shared/ui/switch';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Separator } from '@/components/shared/ui/separator';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useWebPush } from '@/hooks/useWebPush';
import { Loader2, CheckCircle2, AlertCircle, Bell, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationPreferences() {
  const { preferences, isLoading, error, updatePreferences, isUpdating } = useNotificationPreferences();
  const { permission: pushPermission, supported: pushSupported, subscribed: pushSubscribed, requestPermission: requestPushPermission, subscribe: subscribeToPush, unsubscribe: unsubscribeFromPush } = useWebPush();
  const [localPrefs, setLocalPrefs] = React.useState({
    appointment_reminders: true,
    exercise_reminders: true,
    progress_updates: true,
    system_alerts: true,
    therapist_messages: true,
    payment_reminders: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    weekend_notifications: false,
    preferred_channel: '' as 'email' | 'whatsapp' | 'push' | '',
  });

  React.useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        appointment_reminders: preferences.appointment_reminders,
        exercise_reminders: preferences.exercise_reminders,
        progress_updates: preferences.progress_updates,
        system_alerts: preferences.system_alerts,
        therapist_messages: preferences.therapist_messages,
        payment_reminders: preferences.payment_reminders,
        quiet_hours_start: preferences.quiet_hours_start,
        quiet_hours_end: preferences.quiet_hours_end,
        weekend_notifications: preferences.weekend_notifications,
        preferred_channel: (preferences as any).preferred_channel || '',
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(localPrefs);
      toast.success('Preferências salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar preferências');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar preferências. Tente recarregar a página.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Notificação</CardTitle>
        <CardDescription>
          Configure como e quando você deseja receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipos de Notificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Tipos de Notificação</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="appointment_reminders">Lembretes de Consultas</Label>
              <p className="text-xs text-muted-foreground">
                Receba lembretes sobre suas consultas agendadas
              </p>
            </div>
            <Switch
              id="appointment_reminders"
              checked={localPrefs.appointment_reminders}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, appointment_reminders: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="exercise_reminders">Lembretes de Exercícios</Label>
              <p className="text-xs text-muted-foreground">
                Receba lembretes para fazer seus exercícios prescritos
              </p>
            </div>
            <Switch
              id="exercise_reminders"
              checked={localPrefs.exercise_reminders}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, exercise_reminders: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="progress_updates">Atualizações de Progresso</Label>
              <p className="text-xs text-muted-foreground">
                Receba atualizações sobre seu progresso no tratamento
              </p>
            </div>
            <Switch
              id="progress_updates"
              checked={localPrefs.progress_updates}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, progress_updates: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="therapist_messages">Mensagens do Terapeuta</Label>
              <p className="text-xs text-muted-foreground">
                Receba mensagens diretas do seu fisioterapeuta
              </p>
            </div>
            <Switch
              id="therapist_messages"
              checked={localPrefs.therapist_messages}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, therapist_messages: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="payment_reminders">Lembretes de Pagamento</Label>
              <p className="text-xs text-muted-foreground">
                Receba lembretes sobre pacotes expirando e pagamentos
              </p>
            </div>
            <Switch
              id="payment_reminders"
              checked={localPrefs.payment_reminders}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, payment_reminders: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="system_alerts">Alertas do Sistema</Label>
              <p className="text-xs text-muted-foreground">
                Receba alertas importantes do sistema
              </p>
            </div>
            <Switch
              id="system_alerts"
              checked={localPrefs.system_alerts}
              onCheckedChange={(checked) =>
                setLocalPrefs(prev => ({ ...prev, system_alerts: checked }))
              }
            />
          </div>
        </div>

        <Separator />

        {/* Horários Silenciosos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Horários Silenciosos</h3>
          <p className="text-xs text-muted-foreground">
            Configure um período onde você não deseja receber notificações
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_hours_start">Início</Label>
              <Input
                id="quiet_hours_start"
                type="time"
                value={localPrefs.quiet_hours_start}
                onChange={(e) =>
                  setLocalPrefs(prev => ({ ...prev, quiet_hours_start: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet_hours_end">Fim</Label>
              <Input
                id="quiet_hours_end"
                type="time"
                value={localPrefs.quiet_hours_end}
                onChange={(e) =>
                  setLocalPrefs(prev => ({ ...prev, quiet_hours_end: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notificações de Fim de Semana */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="weekend_notifications">Notificações de Fim de Semana</Label>
            <p className="text-xs text-muted-foreground">
              Receba notificações também aos sábados e domingos
            </p>
          </div>
          <Switch
            id="weekend_notifications"
            checked={localPrefs.weekend_notifications}
            onCheckedChange={(checked) =>
              setLocalPrefs(prev => ({ ...prev, weekend_notifications: checked }))
            }
          />
        </div>

        <Separator />

        {/* Canal Preferido */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Canal Preferido</h3>
          <p className="text-xs text-muted-foreground">
            Escolha como você prefere receber notificações
          </p>

          <Select
            value={localPrefs.preferred_channel}
            onValueChange={(value) =>
              setLocalPrefs(prev => ({ ...prev, preferred_channel: value as 'email' | 'whatsapp' | 'push' }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o canal preferido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
              </SelectItem>
              <SelectItem value="whatsapp">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </div>
              </SelectItem>
              <SelectItem value="push">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Push (Navegador/App)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Push Notifications */}
        {pushSupported && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label>Notificações Push</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receba notificações instantâneas no seu navegador
                </p>
              </div>
              <Switch
                checked={pushSubscribed}
                disabled={pushPermission === 'denied'}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    if (pushPermission === 'granted') {
                      await subscribeToPush();
                    } else {
                      const perm = await requestPushPermission();
                      if (perm === 'granted') {
                        await subscribeToPush();
                      }
                    }
                  } else {
                    await unsubscribeFromPush();
                  }
                }}
              />
            </div>

            {pushPermission === 'denied' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Notificações push foram bloqueadas. Habilite nas configurações do navegador.
                </AlertDescription>
              </Alert>
            )}

            {pushSubscribed && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Push ativo - você receberá notificações instantâneas</span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Salvar Preferências
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
