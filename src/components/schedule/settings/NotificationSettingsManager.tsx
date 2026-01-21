import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { Textarea } from '@/components/shared/ui/textarea';
import { Bell, Save, Loader2, Mail, MessageCircle } from 'lucide-react';
import { useScheduleSettings, NotificationSettings } from '@/hooks/useScheduleSettings';

const DEFAULT_SETTINGS: Partial<NotificationSettings> = {
  send_confirmation_email: true,
  send_confirmation_whatsapp: true,
  send_reminder_24h: true,
  send_reminder_2h: true,
  send_cancellation_notice: true,
  custom_confirmation_message: '',
  custom_reminder_message: '',
};

export function NotificationSettingsManager() {
  const { notificationSettings, upsertNotificationSettings, isLoadingNotifications, isSavingNotifications } = useScheduleSettings();
  const [settings, setSettings] = useState<Partial<NotificationSettings>>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const handleSave = () => {
    upsertNotificationSettings(settings);
  };

  if (isLoadingNotifications) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Automáticas
        </CardTitle>
        <CardDescription>
          Configure como e quando os pacientes são notificados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Canais de Confirmação */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Confirmação de Agendamento
          </h4>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label>Enviar E-mail de Confirmação</Label>
              <Switch
                checked={settings.send_confirmation_email ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, send_confirmation_email: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Enviar WhatsApp de Confirmação</Label>
              <Switch
                checked={settings.send_confirmation_whatsapp ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, send_confirmation_whatsapp: checked })}
              />
            </div>
          </div>
        </div>

        {/* Lembretes */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Lembretes
          </h4>
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Lembrete 24h antes</Label>
                <p className="text-xs text-muted-foreground">WhatsApp enviado 24h antes da consulta</p>
              </div>
              <Switch
                checked={settings.send_reminder_24h ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, send_reminder_24h: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Lembrete 2h antes</Label>
                <p className="text-xs text-muted-foreground">WhatsApp enviado 2h antes da consulta</p>
              </div>
              <Switch
                checked={settings.send_reminder_2h ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, send_reminder_2h: checked })}
              />
            </div>
          </div>
        </div>

        {/* Cancelamento */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificar Cancelamentos</Label>
              <p className="text-xs text-muted-foreground">Avisar paciente quando agendamento é cancelado</p>
            </div>
            <Switch
              checked={settings.send_cancellation_notice ?? true}
              onCheckedChange={(checked) => setSettings({ ...settings, send_cancellation_notice: checked })}
            />
          </div>
        </div>

        {/* Mensagens Personalizadas */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm">Mensagens Personalizadas (opcional)</h4>
          
          <div className="space-y-2">
            <Label>Mensagem de Confirmação</Label>
            <Textarea
              placeholder="Olá {nome}, seu agendamento para {data} às {hora} foi confirmado..."
              value={settings.custom_confirmation_message || ''}
              onChange={(e) => setSettings({ ...settings, custom_confirmation_message: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use: {'{nome}'}, {'{data}'}, {'{hora}'}, {'{tipo}'}, {'{terapeuta}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Lembrete</Label>
            <Textarea
              placeholder="Olá {nome}, lembrando que sua consulta é amanhã às {hora}..."
              value={settings.custom_reminder_message || ''}
              onChange={(e) => setSettings({ ...settings, custom_reminder_message: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSavingNotifications} className="w-full">
          {isSavingNotifications ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}