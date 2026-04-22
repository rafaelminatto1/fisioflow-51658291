import { AgendaVisualConfiguration } from "@/components/schedule/settings/AgendaVisualConfiguration";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	Zap,
	Monitor,
	SunMedium,
	Layers,
	Palette,
	Sliders,
	EyeOff,
	Accessibility,
	RotateCcw,
} from "lucide-react";
import { useState } from "react";
import type { CardSize } from "@/types/agenda";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface ViewPreset {
	id: string;
	name: string;
	description: string;
	icon: typeof Zap;
	color: string;
	activeBg: string;
	config: { cardSize: CardSize; heightScale: number; opacity: number };
}

const PRESETS: ViewPreset[] = [
	{
		id: "productive",
		name: "Alta Produtividade",
		description: "Slots compactos",
		icon: Zap,
		color: "text-amber-600 dark:text-amber-400",
		activeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-400",
		config: { cardSize: "extra_small", heightScale: 2, opacity: 100 },
	},
	{
		id: "balanced",
		name: "Equilíbrio",
		description: "Info e espaço",
		icon: Monitor,
		color: "text-blue-600 dark:text-blue-400",
		activeBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-400",
		config: { cardSize: "medium", heightScale: 5, opacity: 100 },
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço",
		icon: SunMedium,
		color: "text-teal-600 dark:text-teal-400",
		activeBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-400",
		config: { cardSize: "large", heightScale: 8, opacity: 100 },
	},
	{
		id: "layered",
		name: "Camadas",
		description: "Transparência suave",
		icon: Layers,
		color: "text-sky-600 dark:text-sky-400",
		activeBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-400",
		config: { cardSize: "medium", heightScale: 6, opacity: 60 },
	},
];

const FONT_SIZES = [
	{ value: "small" as const, label: "Pequeno", display: "Aa", size: "text-xs" },
	{ value: "medium" as const, label: "Normal", display: "Aa", size: "text-sm" },
	{ value: "large" as const, label: "Grande", display: "Aa", size: "text-lg" },
];

function PresetsGrid() {
	const { cardSize, setCardSize, heightScale, setHeightScale, setOpacity } =
		useCardSize();
	const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

	const applyPreset = (preset: ViewPreset) => {
		setCardSize(preset.config.cardSize);
		setHeightScale(preset.config.heightScale);
		setOpacity(preset.config.opacity);
		setAppliedPreset(preset.id);
		setTimeout(() => setAppliedPreset(null), 2000);
	};

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{PRESETS.map((preset) => {
				const Icon = preset.icon;
				const isActive =
					cardSize === preset.config.cardSize &&
					heightScale === preset.config.heightScale;
				const wasApplied = appliedPreset === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={() => applyPreset(preset)}
						className={cn(
							"flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all duration-200",
							"hover:shadow-sm hover:-translate-y-0.5",
							isActive
								? preset.activeBg
								: "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
						)}
					>
						<div
							className={cn(
								"flex items-center justify-center w-10 h-10 rounded-xl transition-all",
								isActive ? `${preset.color.replace("text-", "bg-").replace("-600", "-100").replace("-400", "-900/40")} ${preset.color}` : "bg-muted text-muted-foreground",
							)}
						>
							{wasApplied ? (
								<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							) : (
								<Icon className="w-4 h-4" />
							)}
						</div>
						<div>
							<p
								className={cn(
									"text-xs font-semibold leading-none",
									isActive ? preset.color : "",
								)}
							>
								{preset.name}
							</p>
							<p className="text-[10px] text-muted-foreground mt-1">
								{preset.description}
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function AccessibilitySection() {
	const {
		highContrast,
		reducedMotion,
		fontSize,
		setHighContrast,
		setReducedMotion,
		setFontSize,
		reset,
	} = useAccessibilitySettings();

	return (
		<SettingsSectionCard
			icon={<Accessibility className="h-4 w-4" />}
			iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
			title="Acessibilidade"
			description="Contraste, animações e tamanho do texto"
		>
			<div className="space-y-2">
				<div
					className={cn(
						"flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
						"bg-muted/20 hover:bg-muted/30 border-border/40 hover:border-border/60",
						highContrast && "bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-fuchsia-200/60 dark:border-fuchsia-800/40",
					)}
				>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
								highContrast
									? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
									: "bg-muted text-muted-foreground",
							)}
						>
							<EyeOff className="h-4 w-4" />
						</div>
						<div>
							<Label
								htmlFor="high-contrast"
								className={cn(
									"text-sm font-medium cursor-pointer",
									highContrast && "text-fuchsia-800 dark:text-fuchsia-300",
								)}
							>
								Alto Contraste
							</Label>
							<p className="text-xs text-muted-foreground mt-0.5">
								Aumenta o contraste das cores na interface da agenda
							</p>
						</div>
					</div>
					<Switch
						id="high-contrast"
						checked={highContrast}
						onCheckedChange={setHighContrast}
						className="shrink-0"
					/>
				</div>

				<div
					className={cn(
						"flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
						"bg-muted/20 hover:bg-muted/30 border-border/40 hover:border-border/60",
						reducedMotion && "bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-fuchsia-200/60 dark:border-fuchsia-800/40",
					)}
				>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
								reducedMotion
									? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
									: "bg-muted text-muted-foreground",
							)}
						>
							<Zap className="h-4 w-4" />
						</div>
						<div>
							<Label
								htmlFor="reduced-motion"
								className={cn(
									"text-sm font-medium cursor-pointer",
									reducedMotion && "text-fuchsia-800 dark:text-fuchsia-300",
								)}
							>
								Movimento Reduzido
							</Label>
							<p className="text-xs text-muted-foreground mt-0.5">
								Minimiza animações e transições de elementos
							</p>
						</div>
					</div>
					<Switch
						id="reduced-motion"
						checked={reducedMotion}
						onCheckedChange={setReducedMotion}
						className="shrink-0"
					/>
				</div>
			</div>

			<div className="mt-4 pt-4 border-t">
				<Label className="text-sm font-medium mb-3 block">
					Tamanho do Texto
				</Label>
				<div className="grid grid-cols-3 gap-3">
					{FONT_SIZES.map(({ value, label, display, size }) => {
						const isActive = fontSize === value;
						return (
							<button
								key={value}
								type="button"
								onClick={() => setFontSize(value)}
								className={cn(
									"flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150",
									"hover:shadow-sm hover:-translate-y-0.5",
									isActive
										? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40 dark:border-fuchsia-600"
										: "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
								)}
							>
								<span
									className={cn(
										"font-bold transition-all",
										size,
										isActive
											? "text-fuchsia-700 dark:text-fuchsia-300"
											: "text-foreground",
									)}
								>
									{display}
								</span>
								<span
									className={cn(
										"text-xs font-medium",
										isActive
											? "text-fuchsia-600 dark:text-fuchsia-400"
											: "text-muted-foreground",
									)}
								>
									{label}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={reset}
					className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
				>
					<RotateCcw className="h-3.5 w-3.5" />
					Restaurar padrão
				</Button>
			</div>
		</SettingsSectionCard>
	);
}

export function ScheduleVisualTab() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
			<div className="lg:col-span-8 flex flex-col gap-5">
				<SettingsSectionCard
					icon={<Sliders className="h-4 w-4" />}
					iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
					title="Layouts Rápidos"
					description="Aplique configurações visuais otimizadas com um clique"
				>
					<PresetsGrid />
				</SettingsSectionCard>

				<SettingsSectionCard
					icon={<Monitor className="h-4 w-4" />}
					iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
					title="Aparência da Agenda"
					description="Ajuste densidade, legibilidade e transparência dos cards"
					variant="highlight"
				>
					<AgendaVisualConfiguration />
				</SettingsSectionCard>

				<AccessibilitySection />
			</div>

			<div className="lg:col-span-4">
				<div className="lg:sticky lg:top-24">
					<SettingsSectionCard
						icon={<Palette className="h-4 w-4" />}
						iconBg="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
						title="Cores de Status"
						description="Personalize as cores por tipo de agendamento"
					>
						<StatusColorManager />
					</SettingsSectionCard>
				</div>
			</div>
		</div>
	);
}
