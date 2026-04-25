import { useState, useEffect, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, MessageCircle, Clock, Sparkles, Smartphone } from "lucide-react";
import { useScheduleSettings, type NotificationSettings } from "@/hooks/useScheduleSettings";
import { Badge } from "@/components/ui/badge";
import { SettingsSaveButton } from "@/components/schedule/settings/shared/SettingsSaveButton";
import { SettingsLoadingState } from "@/components/schedule/settings/shared/SettingsLoadingState";

const DEFAULT_SETTINGS: Partial<NotificationSettings> = {
  send_confirmation_email: true,
  send_confirmation_whatsapp: true,
  send_reminder_24h: true,
  send_reminder_2h: true,
  send_cancellation_notice: true,
  custom_confirmation_message: "",
  custom_reminder_message: "",
};

const TEMPLATE_VARIABLES = [
  { key: "{nome}", label: "Nome" },
  { key: "{data}", label: "Data" },
  { key: "{hora}", label: "Hora" },
  { key: "{tipo}", label: "Tipo" },
  { key: "{terapeuta}", label: "Terapeuta" },
];

const PREVIEW_DATA: Record<string, string> = {
  "{nome}": "Maria Santos",
  "{data}": "15/01/2026",
  "{hora}": "14:30",
  "{tipo}": "Fisioterapia",
  "{terapeuta}": "Dr. Silva",
};

const getMessagePreview = (message: string) => {
  let preview = message;
  Object.entries(PREVIEW_DATA).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  });
  return preview;
};

function PhonePreview({ message }: { message: string }) {
  if (!message.trim()) return null;
  const preview = getMessagePreview(message);
  return (
    <div className="flex justify-center">
      <div className="w-64 rounded-2xl border-2 border-muted bg-muted/20 p-2 shadow-sm">
        <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-3 w-3" />
            </div>
            <div>
              <p className="text-[10px] font-bold">FisioFlow</p>
              <p className="text-[8px] opacity-70">online</p>
            </div>
          </div>
          <div className="p-2.5 min-h-[4rem]">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg rounded-tl-none p-2 text-[10px] leading-relaxed text-slate-800 dark:text-slate-200 max-w-[90%]">
              {preview || "..."}
            </div>
            <p className="text-[8px] text-muted-foreground mt-1 text-right">14:30</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationSettingsManager() {
  const {
    notificationSettings,
    upsertNotificationSettings,
    isLoadingNotifications,
    isSavingNotifications,
  } = useScheduleSettings();
  const [settings, setSettings] = useState<Partial<NotificationSettings>>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const confirmRef = useRef<HTMLTextAreaElement>(null);
  const reminderRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const updateSetting = useCallback(
    (field: keyof NotificationSettings, value: boolean | string) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
      setSaved(false);
    },
    [],
  );

  const insertVariable = useCallback(
    (variable: string, target: "confirmation" | "reminder") => {
      const ref = target === "confirmation" ? confirmRef : reminderRef;
      const field =
        target === "confirmation" ? "custom_confirmation_message" : "custom_reminder_message";
      const textarea = ref.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = (settings[field] as string) || "";
        const updated = current.substring(0, start) + variable + current.substring(end);
        updateSetting(field, updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + variable.length;
          textarea.focus();
        }, 0);
      } else {
        const current = (settings[field] as string) || "";
        updateSetting(field, current + variable);
      }
    },
    [settings, updateSetting],
  );

  const handleSave = async () => {
    try {
      await upsertNotificationSettings.mutateAsync(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  if (isLoadingNotifications) {
    return <SettingsLoadingState message="Carregando notificações..." />;
  }

  const activeCount = [
    settings.send_confirmation_email,
    settings.send_confirmation_whatsapp,
    settings.send_reminder_24h,
    settings.send_reminder_2h,
    settings.send_cancellation_notice,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Canais ativos</p>
        <Badge variant="secondary" className="text-xs">
          {activeCount} ativo{activeCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <Send className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Confirmação de agendamento</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">E-mail</Label>
          </div>
          <Switch
            checked={settings.send_confirmation_email ?? true}
            onCheckedChange={(checked) => updateSetting("send_confirmation_email", checked)}
          />
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">WhatsApp</Label>
          </div>
          <Switch
            checked={settings.send_confirmation_whatsapp ?? true}
            onCheckedChange={(checked) => updateSetting("send_confirmation_whatsapp", checked)}
          />
        </div>
      </div>

      <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Lembretes automáticos</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div>
            <Label className="text-sm">24h antes</Label>
            <p className="text-xs text-muted-foreground">WhatsApp um dia antes</p>
          </div>
          <Switch
            checked={settings.send_reminder_24h ?? true}
            onCheckedChange={(checked) => updateSetting("send_reminder_24h", checked)}
          />
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div>
            <Label className="text-sm">2h antes</Label>
            <p className="text-xs text-muted-foreground">WhatsApp duas horas antes</p>
          </div>
          <Switch
            checked={settings.send_reminder_2h ?? true}
            onCheckedChange={(checked) => updateSetting("send_reminder_2h", checked)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Notificar cancelamentos</Label>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            Avisar paciente quando agendamento é cancelado
          </p>
        </div>
        <Switch
          checked={settings.send_cancellation_notice ?? true}
          onCheckedChange={(checked) => updateSetting("send_cancellation_notice", checked)}
        />
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Mensagens personalizadas</span>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Smartphone className="h-3 w-3" />
            {showPreview ? "Ocultar preview" : "Preview celular"}
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Confirmação</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <span key={v.key} className="text-[10px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => insertVariable(v.key, "confirmation")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  title={`Inserir ${v.label} na confirmação`}
                >
                  <code className="font-mono">{v.key}</code>
                </button>
              </span>
            ))}
          </div>
          <Textarea
            ref={confirmRef}
            placeholder="Olá {nome}, seu agendamento para {data} às {hora} foi confirmado."
            value={settings.custom_confirmation_message || ""}
            onChange={(e) => updateSetting("custom_confirmation_message", e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          {showPreview && settings.custom_confirmation_message && (
            <PhonePreview message={settings.custom_confirmation_message} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Lembrete</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <span key={`r-${v.key}`} className="text-[10px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => insertVariable(v.key, "reminder")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  title={`Inserir ${v.label} no lembrete`}
                >
                  <code className="font-mono">{v.key}</code>
                </button>
              </span>
            ))}
          </div>
          <Textarea
            ref={reminderRef}
            placeholder="Olá {nome}, lembrando que sua consulta é amanhã às {hora}."
            value={settings.custom_reminder_message || ""}
            onChange={(e) => updateSetting("custom_reminder_message", e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          {showPreview && settings.custom_reminder_message && (
            <PhonePreview message={settings.custom_reminder_message} />
          )}
        </div>
      </div>

      <SettingsSaveButton
        onSave={handleSave}
        isSaving={isSavingNotifications}
        isSaved={saved}
        label="Salvar notificações"
      />
    </div>
  );
}
