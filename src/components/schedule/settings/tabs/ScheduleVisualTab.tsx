import type React from "react";
import { CardSizeManager } from "@/components/schedule/settings/CardSizeManager";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import {
	CheckCircle2,
	Clock,
	Eye,
	Frame,
	Palette,
	Sparkles,
	Type,
	User,
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
	config: { cardSize: CardSize; heightScale: number };
}

const PRESETS: ViewPreset[] = [
	{
		id: "productive",
		name: "Alta Produtividade",
		description: "Slots compactos",
		icon: Zap,
		config: { cardSize: "extra_small", heightScale: 2 },
	},
	{
		id: "balanced",
		name: "Equilíbrio",
		description: "Info e espaço",
		icon: Monitor,
		config: { cardSize: "medium", heightScale: 5 },
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço",
		icon: Eye,
		config: { cardSize: "large", heightScale: 8 },
	},
	{
		id: "accessibility",
		name: "Acessibilidade",
		description: "Máxima visibilidade",
		icon: Type,
		config: { cardSize: "large", heightScale: 10 },
	},
];

function CardPreviewInline() {
	const { cardSize } = useCardSize();
	const { getStatusConfig } = useStatusConfig();
	const status = getStatusConfig("agendado");

	const sizeClass =
		cardSize === "extra_small"
			? "text-[9px] p-1 gap-0.5"
			: cardSize === "small"
				? "text-[10px] p-1.5 gap-1"
				: cardSize === "large"
					? "text-sm p-3 gap-2"
					: "text-xs p-2 gap-1.5";

	return (
		<div
			className={cn("rounded-lg border-l-4 flex flex-col", sizeClass)}
			style={{
				backgroundColor: status?.bgColor || "#dbeafe",
				borderLeftColor: status?.color || "#3b82f6",
			}}
		>
			<div className="flex items-center gap-1">
				<User className="h-3 w-3 shrink-0 opacity-60" />
				<span className="font-semibold truncate">Maria Santos</span>
			</div>
			<span className="opacity-70 truncate">Fisioterapia</span>
			<div className="flex items-center gap-1 opacity-70">
				<Clock className="h-3 w-3 shrink-0" />
				<span>14:30 - 15:30</span>
			</div>
		</div>
	);
}

function PresetsRow() {
	const { cardSize, setCardSize, heightScale, setHeightScale } = useCardSize();
	const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

	const currentPreset = PRESETS.find(
		(p) =>
			p.config.cardSize === cardSize && p.config.heightScale === heightScale,
	);

	const applyPreset = (preset: ViewPreset) => {
		setCardSize(preset.config.cardSize);
		setHeightScale(preset.config.heightScale);
		setAppliedPreset(preset.id);
		setTimeout(() => setAppliedPreset(null), 2000);
	};

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
			{PRESETS.map((preset) => {
				const Icon = preset.icon;
				const isActive = currentPreset?.id === preset.id;
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
				<h2 className="text-base font-bold">Aparência</h2>
				<p className="text-sm text-muted-foreground">
					Personalize os cards e cores da agenda
				</p>
			</div>

			{/* Presets rápidos */}
			<div className="rounded-xl border bg-muted/10 p-4">
				<SectionHeader
					iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/30"
					icon={
						<Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
					}
					title="Presets Rápidos"
					description="Aplique uma configuração pronta com um clique"
				/>
				<PresetsRow />
			</div>

			{/* Cards e Layout + Preview lado a lado */}
			<div className="rounded-xl border bg-muted/10 p-4">
				<SectionHeader
					iconBg="bg-sky-100 dark:bg-sky-900/30"
					icon={<Frame className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
					title="Cards e Layout"
					description="Tamanho, altura de slots e escala de fonte"
				/>
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
					<CardSizeManager />
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">Preview</p>
						<CardPreviewInline />
					</div>
				</div>
			</div>

			{/* Cores de Status */}
			<div className="rounded-xl border bg-muted/10 p-4">
				<SectionHeader
					iconBg="bg-pink-100 dark:bg-pink-900/30"
					icon={
						<Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />
					}
					title="Cores de Status"
					description="Personalize as cores por tipo de agendamento"
				/>
				<StatusColorManager />
			</div>
		</div>
	);
}
