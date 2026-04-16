import type React from "react";
import { AgendaVisualConfiguration } from "@/components/schedule/settings/AgendaVisualConfiguration";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	Eye,
	Palette,
	Sparkles,
	Zap,
	Monitor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { CardSize } from "@/types/agenda";

interface ViewPreset {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	config: { cardSize: CardSize; heightScale: number; opacity: number };
}

const PRESETS: ViewPreset[] = [
	{
		id: "productive",
		name: "Alta Produtividade",
		description: "Slots compactos",
		icon: Zap,
		config: { cardSize: "extra_small", heightScale: 2, opacity: 100 },
	},
	{
		id: "balanced",
		name: "Equilíbrio",
		description: "Info e espaço",
		icon: Monitor,
		config: { cardSize: "medium", heightScale: 5, opacity: 100 },
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço",
		icon: Eye,
		config: { cardSize: "large", heightScale: 8, opacity: 100 },
	},
	{
		id: "glass",
		name: "Glassmorphism",
		description: "Design moderno",
		icon: Sparkles,
		config: { cardSize: "medium", heightScale: 6, opacity: 60 },
	},
];

function PresetsRow() {
	const { cardSize, setCardSize, heightScale, setHeightScale, setOpacity } = useCardSize();
	const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

	const applyPreset = (preset: ViewPreset) => {
		setCardSize(preset.config.cardSize);
		setHeightScale(preset.config.heightScale);
		setOpacity(preset.config.opacity);
		setAppliedPreset(preset.id);
		setTimeout(() => setAppliedPreset(null), 2000);
	};

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
			{PRESETS.map((preset) => {
				const Icon = preset.icon;
				const isActive = cardSize === preset.config.cardSize && heightScale === preset.config.heightScale;
				const wasApplied = appliedPreset === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={() => applyPreset(preset)}
						className={cn(
							"flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:shadow-sm",
							isActive
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/40 hover:bg-muted/30",
						)}
					>
						<div
							className={cn(
								"flex items-center justify-center w-8 h-8 rounded-lg",
								isActive
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							)}
						>
							{wasApplied ? (
								<CheckCircle2 className="w-4 h-4" />
							) : (
								<Icon className="w-4 h-4" />
							)}
						</div>
						<div>
							<p className="text-xs font-semibold leading-none">{preset.name}</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								{preset.description}
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function SectionHeader({
	iconBg,
	icon,
	title,
	description,
	action,
}: {
	iconBg: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-2 mb-4">
			<div className="flex items-center gap-2.5">
				<div className={cn("p-1.5 rounded-md shrink-0", iconBg)}>{icon}</div>
				<div>
					<p className="text-sm font-semibold leading-none">{title}</p>
					<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
				</div>
			</div>
			{action}
		</div>
	);
}

export function ScheduleVisualTab() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-base font-bold text-slate-900">Configuração Visual Pro Max</h2>
				<p className="text-sm text-slate-500">
					Personalize cada detalhe da experiência visual da sua agenda
				</p>
			</div>

			{/* Presets rápidos */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<SectionHeader
					iconBg="bg-fuchsia-50"
					icon={
						<Sparkles className="h-4 w-4 text-fuchsia-600" />
					}
					title="Configurações Rápidas"
					description="Aplique layouts otimizados instantaneamente"
				/>
				<PresetsRow />
			</div>

			{/* Premium Layout Controls */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<AgendaVisualConfiguration />
			</div>

			{/* Cores de Status */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<SectionHeader
					iconBg="bg-pink-50"
					icon={
						<Palette className="h-4 w-4 text-pink-600" />
					}
					title="Cores de Status"
					description="Personalize as cores por tipo de agendamento"
				/>
				<StatusColorManager />
			</div>
		</div>
	);
}
