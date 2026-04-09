import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
	Save,
	Loader2,
	Copy,
	CheckCircle2,
	Briefcase,
	Zap,
	Sun,
	Moon,
} from "lucide-react";
import { useScheduleSettings, BusinessHour } from "@/hooks/useScheduleSettings";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const DEFAULT_HOURS: Partial<BusinessHour>[] = [
	{ day_of_week: 0, is_open: false, open_time: "08:00", close_time: "18:00" },
	{ day_of_week: 1, is_open: true, open_time: "07:00", close_time: "21:00" },
	{ day_of_week: 2, is_open: true, open_time: "07:00", close_time: "21:00" },
	{ day_of_week: 3, is_open: true, open_time: "07:00", close_time: "21:00" },
	{ day_of_week: 4, is_open: true, open_time: "07:00", close_time: "21:00" },
	{ day_of_week: 5, is_open: true, open_time: "07:00", close_time: "21:00" },
	{ day_of_week: 6, is_open: true, open_time: "08:00", close_time: "13:00" },
];

const TIME_PRESETS = [
	{ label: "Comercial", icon: Briefcase, open: "09:00", close: "18:00" },
	{ label: "Estendido", icon: Zap, open: "08:00", close: "20:00" },
	{ label: "Manhã", icon: Sun, open: "07:00", close: "13:00" },
	{ label: "Tarde", icon: Moon, open: "13:00", close: "19:00" },
];

const timeToMinutes = (time: string): number => {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

export function BusinessHoursManager() {
	const {
		businessHours,
		daysOfWeek,
		upsertBusinessHours,
		isLoadingHours,
		isSavingHours,
	} = useScheduleSettings();
	const [hours, setHours] = useState<Partial<BusinessHour>[]>(DEFAULT_HOURS);
	const [saved, setSaved] = useState(false);
	const [copiedDay, setCopiedDay] = useState<number | null>(null);

	useEffect(() => {
		if (businessHours.length > 0) {
			const merged = DEFAULT_HOURS.map((def) => {
				const existing = businessHours.find(
					(h) => h.day_of_week === def.day_of_week,
				);
				return existing || def;
			});
			setHours(merged);
		}
	}, [businessHours]);

	const updateHour = (
		dayOfWeek: number,
		field: keyof BusinessHour,
		value: string | boolean,
	) => {
		setHours((prev) =>
			prev.map((h) =>
				h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h,
			),
		);
		setSaved(false);
	};

	const copyToAllDays = (sourceDay: number) => {
		const source = hours.find((h) => h.day_of_week === sourceDay);
		if (!source) return;
		const updated = hours.map((h) =>
			h.day_of_week === sourceDay
				? h
				: { ...h, is_open: source.is_open, open_time: source.open_time, close_time: source.close_time },
		);
		setHours(updated);
		setSaved(false);
		setCopiedDay(sourceDay);
		setTimeout(() => setCopiedDay(null), 1500);
	};

	const applyPresetToAll = (preset: (typeof TIME_PRESETS)[0]) => {
		setHours((prev) =>
			prev.map((h) => ({ ...h, is_open: true, open_time: preset.open, close_time: preset.close })),
		);
		setSaved(false);
	};

	const invalidOpenDays = hours.filter((h) => {
		if (!h.is_open) return false;
		return timeToMinutes(h.open_time || "07:00") >= timeToMinutes(h.close_time || "21:00");
	});

	const handleSave = async () => {
		if (invalidOpenDays.length > 0) {
			const labels = invalidOpenDays
				.map((h) => daysOfWeek.find((d) => d.value === h.day_of_week)?.label)
				.filter(Boolean)
				.join(", ");
			toast({
				title: "Horário inválido",
				description: `Abertura deve ser antes do fechamento em: ${labels}.`,
				variant: "destructive",
			});
			return;
		}
		try {
			await upsertBusinessHours.mutateAsync(hours);
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch {
			// erro tratado no hook
		}
	};

	if (isLoadingHours) {
		return (
			<div className="py-8 flex justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Presets compactos */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs text-muted-foreground">Preset:</span>
				{TIME_PRESETS.map((preset) => {
					const Icon = preset.icon;
					return (
						<Button
							key={preset.label}
							size="sm"
							variant="outline"
							onClick={() => applyPresetToAll(preset)}
							className="h-7 text-xs gap-1.5"
						>
							<Icon className="h-3 w-3" />
							{preset.label}
						</Button>
					);
				})}
			</div>

			{invalidOpenDays.length > 0 && (
				<div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
					Abertura deve ser anterior ao fechamento nos dias destacados.
				</div>
			)}

			{/* Header da tabela */}
			<div className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_3rem_2rem] items-center gap-2 px-1 pb-1 border-b">
				<span />
				<span className="text-xs font-medium text-muted-foreground">Dia</span>
				<span className="text-xs font-medium text-muted-foreground text-center">Abertura</span>
				<span className="text-xs font-medium text-muted-foreground text-center">Fechamento</span>
				<span className="text-xs font-medium text-muted-foreground text-center">Total</span>
				<span />
			</div>

			{/* Linhas por dia */}
			<div className="space-y-0.5">
				{daysOfWeek.map((day) => {
					const hour = hours.find((h) => h.day_of_week === day.value) || DEFAULT_HOURS[day.value];
					const isOpen = !!hour?.is_open;
					const hasError =
						isOpen &&
						timeToMinutes(hour?.open_time || "07:00") >= timeToMinutes(hour?.close_time || "21:00");

					const totalHours = isOpen
						? (
								(timeToMinutes(hour?.close_time || "21:00") -
									timeToMinutes(hour?.open_time || "07:00")) /
								60
						  ).toFixed(1)
						: null;

					return (
						<div
							key={day.value}
							className={cn(
								"grid grid-cols-[2rem_1fr_5.5rem_5.5rem_3rem_2rem] items-center gap-2 py-1.5 px-1 rounded-lg transition-colors",
								isOpen ? "hover:bg-muted/30" : "opacity-60",
								hasError && "bg-red-50/50 dark:bg-red-950/10",
							)}
						>
							<Switch
								checked={isOpen}
								onCheckedChange={(checked) => updateHour(day.value, "is_open", checked)}
								className="scale-75 origin-left"
							/>

							<span
								className={cn(
									"text-sm font-medium truncate",
									!isOpen && "text-muted-foreground",
								)}
							>
								{day.label}
							</span>

							{isOpen ? (
								<>
									<Input
										type="time"
										value={hour?.open_time || "07:00"}
										onChange={(e) => updateHour(day.value, "open_time", e.target.value)}
										className={cn(
											"h-8 text-xs text-center px-1",
											hasError && "border-red-400 focus-visible:ring-red-400",
										)}
									/>
									<Input
										type="time"
										value={hour?.close_time || "21:00"}
										onChange={(e) => updateHour(day.value, "close_time", e.target.value)}
										className={cn(
											"h-8 text-xs text-center px-1",
											hasError && "border-red-400 focus-visible:ring-red-400",
										)}
									/>
									<span className="text-xs text-muted-foreground text-center tabular-nums">
										{totalHours}h
									</span>
								</>
							) : (
								<span className="col-span-3 text-xs text-muted-foreground">Fechado</span>
							)}

							{isOpen ? (
								<Button
									size="icon"
									variant="ghost"
									onClick={() => copyToAllDays(day.value)}
									className={cn(
										"h-7 w-7",
										copiedDay === day.value && "text-primary",
									)}
									title="Copiar para todos os dias"
								>
									{copiedDay === day.value ? (
										<CheckCircle2 className="h-3.5 w-3.5" />
									) : (
										<Copy className="h-3.5 w-3.5" />
									)}
								</Button>
							) : (
								<span />
							)}
						</div>
					);
				})}
			</div>

			{/* Save */}
			<div className="flex justify-end pt-2 border-t">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isSavingHours || saved || invalidOpenDays.length > 0}
					className={cn(saved && "bg-green-600 hover:bg-green-700")}
				>
					{saved ? (
						<><CheckCircle2 className="h-4 w-4 mr-1.5" />Salvo</>
					) : isSavingHours ? (
						<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Salvando...</>
					) : (
						<><Save className="h-4 w-4 mr-1.5" />Salvar horários</>
					)}
				</Button>
			</div>
		</div>
	);
}
