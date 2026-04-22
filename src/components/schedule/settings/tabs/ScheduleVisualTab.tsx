import type React from "react";
import { AgendaVisualConfiguration } from "@/components/schedule/settings/AgendaVisualConfiguration";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	Zap,
	Monitor,
	SunMedium,
	Layers,
	Palette,
	Sliders,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { CardSize } from "@/types/agenda";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

interface ViewPreset {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
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
								<CheckCircle2 className="w-4 w-4 text-emerald-600 dark:text-emerald-400" />
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

export function ScheduleVisualTab() {
	return (
		<div className="space-y-5">
			{/* Presets rápidos */}
			<SettingsSectionCard
				icon={<Sliders className="h-4 w-4" />}
				iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
				title="Layouts Rápidos"
				description="Aplique configurações visuais otimizadas com um clique"
			>
				<PresetsGrid />
			</SettingsSectionCard>

			{/* Controles premium de layout */}
			<SettingsSectionCard
				icon={<Monitor className="h-4 w-4" />}
				iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
				title="Aparência da Agenda"
				description="Ajuste densidade, legibilidade e transparência dos cards"
				variant="highlight"
			>
				<AgendaVisualConfiguration />
			</SettingsSectionCard>

			{/* Cores de Status */}
			<SettingsSectionCard
				icon={<Palette className="h-4 w-4" />}
				iconBg="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
				title="Cores de Status"
				description="Personalize as cores por tipo de agendamento"
			>
				<StatusColorManager />
			</SettingsSectionCard>
		</div>
	);
}
