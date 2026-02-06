import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Save, Loader2, CheckCircle2, Mail, MessageCircle, Send, Clock, Info, Copy, Eye, Sparkles } from 'lucide-react';
import { useScheduleSettings, NotificationSettings } from '@/hooks/useScheduleSettings';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const DEFAULT_SETTINGS: Partial<NotificationSettings> = {
  send_confirmation_email: true,
  send_confirmation_whatsapp: true,
  send_reminder_24h: true,
  send_reminder_2h: true,
  send_cancellation_notice: true,
  custom_confirmation_message: '',
  custom_reminder_message: '',
};

const TEMPLATE_VARIABLES = [
  { key: '{nome}', label: 'Nome do paciente', example: 'Maria Santos' },
  { key: '{data}', label: 'Data da consulta', example: '15/01/2026' },
  { key: '{hora}', label: 'Horário', example: '14:30' },
  { key: '{tipo}', label: 'Tipo de consulta', example: 'Fisioterapia' },
  { key: '{terapeuta}', label: 'Nome do terapeuta', example: 'Dr. Silva' },
];

// Sample data for preview
const PREVIEW_DATA = {
  '{nome}': 'Maria Santos',
  '{data}': '15/01/2026',
  '{hora}': '14:30',
  '{tipo}': 'Fisioterapia',
  '{terapeuta}': 'Dr. Silva',
};

const getMessagePreview = (message: string) => {
  let preview = message;
  Object.entries(PREVIEW_DATA).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(key, 'g'), value);
  });
  return preview;
};

export function NotificationSettingsManager() {
  const { notificationSettings, upsertNotificationSettings, isLoadingNotifications, isSavingNotifications } = useScheduleSettings();
  const [settings, setSettings] = useState<Partial<NotificationSettings>>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const updateSetting = (field: keyof NotificationSettings, value: boolean | string) => {
    setSettings({ ...settings, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await upsertNotificationSettings.mutateAsync(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Erro já tratado no hook via toast
    }
  };

  if (isLoadingNotifications) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  // Count active notifications
  const activeCount = [
    settings.send_confirmation_email,
    settings.send_confirmation_whatsapp,
    settings.send_reminder_24h,
    settings.send_reminder_2h,
    settings.send_cancellation_notice,
  ].filter(Boolean).length;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-violet-500 rounded-lg">
            <Bell className="h-5 w-5 text-white" />
          </div>
          Notificações Automáticas
        </CardTitle>
        <CardDescription>
          Configure como e quando os pacientes são notificados
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Info Banner */}
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Personalização</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Mensagens personalizadas melhoram o comparecimento.
            As opções desta aba são persistidas para fluxos automáticos de comunicação.
          </AlertDescription>
        </Alert>

        {/* Confirmação de Agendamento */}
        <div className="space-y-4 p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Confirmação de Agendamento
          </h3>
          <p className="text-sm text-muted-foreground">
            Enviado automaticamente após criar um agendamento
          </p>

          <div className="space-y-3 ml-8">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-blue-500" />
                <div>
                  <Label className="font-medium">E-mail de Confirmação</Label>
                  <p className="text-xs text-muted-foreground">Envio automático por email</p>
                </div>
              </div>
              <Switch
                checked={settings.send_confirmation_email ?? true}
                onCheckedChange={(checked) => updateSetting('send_confirmation_email', checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <div>
                  <Label className="font-medium">WhatsApp de Confirmação</Label>
                  <p className="text-xs text-muted-foreground">Envio automático via WhatsApp</p>
                </div>
              </div>
              <Switch
                checked={settings.send_confirmation_whatsapp ?? true}
                onCheckedChange={(checked) => updateSetting('send_confirmation_whatsapp', checked)}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </div>

        {/* Lembretes */}
        <div className="space-y-4 p-4 rounded-xl border bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Lembretes Automáticos
          </h3>
          <p className="text-sm text-muted-foreground">
            Reduza o número de faltas com lembretes automáticos
          </p>

          <div className="space-y-3 ml-8">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <Label className="font-medium">Lembrete 24h antes</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">WhatsApp enviado 24h antes da consulta</p>
              </div>
              <Switch
                checked={settings.send_reminder_24h ?? true}
                onCheckedChange={(checked) => updateSetting('send_reminder_24h', checked)}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <Label className="font-medium">Lembrete 2h antes</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">WhatsApp enviado 2h antes da consulta</p>
              </div>
              <Switch
                checked={settings.send_reminder_2h ?? true}
                onCheckedChange={(checked) => updateSetting('send_reminder_2h', checked)}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </div>
        </div>

        {/* Cancelamento */}
        <div className="space-y-3 p-4 rounded-xl border bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-red-500" />
                <Label className="font-medium">Notificar Cancelamentos</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Avisar paciente quando agendamento é cancelado
              </p>
            </div>
            <Switch
              checked={settings.send_cancellation_notice ?? true}
              onCheckedChange={(checked) => updateSetting('send_cancellation_notice', checked)}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        {/* Mensagens Personalizadas */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Mensagens Personalizadas (opcional)
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              {showPreview ? 'Ocultar' : 'Ver'} Preview
            </Button>
          </div>

          {/* Enhanced template variables */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Variáveis Disponíveis</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex flex-col">
                    <Badge variant="outline" className="w-fit text-xs font-mono mb-1">
                      {v.key}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{v.label}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      navigator.clipboard.writeText(v.key);
                      toast({
                        title: 'Copiado!',
                        description: `${v.key} foi copiado para a área de transferência.`,
                      });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Mensagem de Confirmação */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Mensagem de Confirmação</Label>
              {settings.custom_confirmation_message && (
                <span className="text-xs text-muted-foreground">
                  {settings.custom_confirmation_message.length} caracteres
                </span>
              )}
            </div>
            <Textarea
              placeholder="Olá {nome}, seu agendamento para {data} às {hora} foi confirmado. Compareça 10 minutos antes."
              value={settings.custom_confirmation_message || ''}
              onChange={(e) => updateSetting('custom_confirmation_message', e.target.value)}
              rows={3}
              className="resize-none"
            />
            {showPreview && settings.custom_confirmation_message && (
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Preview:</p>
                <p className="text-sm text-violet-900 dark:text-violet-100 whitespace-pre-wrap">
                  {getMessagePreview(settings.custom_confirmation_message)}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar a mensagem padrão
            </p>
          </div>

          {/* Mensagem de Lembrete */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Mensagem de Lembrete</Label>
              {settings.custom_reminder_message && (
                <span className="text-xs text-muted-foreground">
                  {settings.custom_reminder_message.length} caracteres
                </span>
              )}
            </div>
            <Textarea
              placeholder="Olá {nome}, lembrando que sua consulta é amanhã às {hora}. Te esperamos!"
              value={settings.custom_reminder_message || ''}
              onChange={(e) => updateSetting('custom_reminder_message', e.target.value)}
              rows={3}
              className="resize-none"
            />
            {showPreview && settings.custom_reminder_message && (
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Preview:</p>
                <p className="text-sm text-violet-900 dark:text-violet-100 whitespace-pre-wrap">
                  {getMessagePreview(settings.custom_reminder_message)}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar a mensagem padrão
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="sticky bottom-0 pt-4 bg-background/95 backdrop-blur border-t">
          <Button
            onClick={handleSave}
            disabled={isSavingNotifications || saved}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all",
              saved && "bg-green-600 hover:bg-green-700"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Salvo com sucesso!
              </>
            ) : isSavingNotifications ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
