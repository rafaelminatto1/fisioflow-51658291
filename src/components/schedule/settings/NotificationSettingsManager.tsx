import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Save,
	Loader2,
	CheckCircle2,
	Mail,
	MessageCircle,
	Send,
	Clock,
	Copy,
	Eye,
	Sparkles,
} from "lucide-react";
import {
	useScheduleSettings,
	NotificationSettings,
} from "@/hooks/useScheduleSettings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
	{ key: "{nome}", label: "Nome do paciente" },
	{ key: "{data}", label: "Data" },
	{ key: "{hora}", label: "Horário" },
	{ key: "{tipo}", label: "Tipo de consulta" },
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
		preview = preview.replace(new RegExp(key, "g"), value);
	});
	return preview;
};

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
			// erro tratado no hook
		}
	};

	if (isLoadingNotifications) {
		return (
			<div className="py-8 flex justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
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
			{/* Header resumo */}
			<div className="flex items-center justify-between">
				<p className="text-xs text-muted-foreground">Canais ativos de notificação</p>
				<Badge variant="secondary" className="text-xs">
					{activeCount} ativo{activeCount !== 1 ? "s" : ""}
				</Badge>
			</div>

			{/* Confirmação */}
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

			{/* Lembretes */}
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

			{/* Cancelamento */}
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

			{/* Mensagens personalizadas */}
			<div className="space-y-3 pt-1">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">Mensagens personalizadas</span>
						<span className="text-xs text-muted-foreground">(opcional)</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowPreview(!showPreview)}
						className="h-7 text-xs"
					>
						<Eye className="h-3 w-3 mr-1" />
						{showPreview ? "Ocultar" : "Preview"}
					</Button>
				</div>

				{/* Variáveis disponíveis — compacto */}
				<div className="flex flex-wrap gap-1.5">
					{TEMPLATE_VARIABLES.map((v) => (
						<button
							key={v.key}
							onClick={() => {
								navigator.clipboard.writeText(v.key);
								toast({ title: "Copiado!", description: v.key });
							}}
							className="flex items-center gap-1 px-2 py-0.5 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
							title={v.label}
						>
							<code className="text-xs font-mono">{v.key}</code>
							<Copy className="h-2.5 w-2.5 text-muted-foreground" />
						</button>
					))}
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs font-medium">Mensagem de confirmação</Label>
					<Textarea
						placeholder="Olá {nome}, seu agendamento para {data} às {hora} foi confirmado."
						value={settings.custom_confirmation_message || ""}
						onChange={(e) => updateSetting("custom_confirmation_message", e.target.value)}
						rows={2}
						className="resize-none text-sm"
					/>
					{showPreview && settings.custom_confirmation_message && (
						<div className="p-2 rounded-lg bg-muted/50 border text-xs">
							<span className="font-medium text-muted-foreground">Preview: </span>
							{getMessagePreview(settings.custom_confirmation_message)}
						</div>
					)}
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs font-medium">Mensagem de lembrete</Label>
					<Textarea
						placeholder="Olá {nome}, lembrando que sua consulta é amanhã às {hora}."
						value={settings.custom_reminder_message || ""}
						onChange={(e) => updateSetting("custom_reminder_message", e.target.value)}
						rows={2}
						className="resize-none text-sm"
					/>
					{showPreview && settings.custom_reminder_message && (
						<div className="p-2 rounded-lg bg-muted/50 border text-xs">
							<span className="font-medium text-muted-foreground">Preview: </span>
							{getMessagePreview(settings.custom_reminder_message)}
						</div>
					)}
				</div>
			</div>

			{/* Save */}
			<div className="flex justify-end pt-2 border-t">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isSavingNotifications || saved}
					className={cn(saved && "bg-green-600 hover:bg-green-700")}
				>
					{saved ? (
						<><CheckCircle2 className="h-4 w-4 mr-1.5" />Salvo</>
					) : isSavingNotifications ? (
						<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Salvando...</>
					) : (
						<><Save className="h-4 w-4 mr-1.5" />Salvar notificações</>
					)}
				</Button>
			</div>
		</div>
	);
}
