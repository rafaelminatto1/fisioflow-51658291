import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { CardSizeManager } from "@/components/schedule/settings/CardSizeManager";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import {
	Palette,
	Sparkles,
	Frame,
	Zap,
	Monitor,
	Eye,
	Type,
	CheckCircle2,
	User,
	Clock,
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
		description: "Slots compactos, mais visíveis",
		icon: Zap,
		config: { cardSize: "extra_small", heightScale: 2 },
	},
	{
		id: "balanced",
		name: "Equilíbrio",
		description: "Equilíbrio entre info e espaço",
		icon: Monitor,
		config: { cardSize: "medium", heightScale: 5 },
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço para leitura",
		icon: Eye,
		config: { cardSize: "large", heightScale: 8 },
	},
	{
		id: "accessibility",
		name: "Acessibilidade",
		description: "Tamanho máximo de visibilidade",
		icon: Type,
		config: { cardSize: "large", heightScale: 10 },
	},
];

function CardPreview() {
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
		<div className="rounded-xl border bg-muted/30 p-4 space-y-2">
			<p className="text-xs font-medium text-muted-foreground">
				Preview do card
			</p>
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
				<span className="text-muted-foreground truncate">Fisioterapia</span>
				<div className="flex items-center gap-1 text-muted-foreground">
					<Clock className="h-3 w-3 shrink-0 opacity-60" />
					<span>14:30 - 15:30</span>
				</div>
			</div>
			<p className="text-[10px] text-muted-foreground">
				Tamanho: <span className="font-medium">{cardSize}</span>
			</p>
		</div>
	);
}

function PresetsSection() {
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
		<div className="grid grid-cols-2 gap-2">
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
							"flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm",
							isActive
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/40 hover:bg-muted/30",
						)}
					>
						<div
							className={cn(
								"flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
								isActive ? "bg-primary text-primary-foreground" : "bg-muted",
							)}
						>
							{wasApplied ? (
								<CheckCircle2 className="w-3.5 h-3.5" />
							) : (
								<Icon className="w-3.5 h-3.5" />
							)}
						</div>
						<div>
							<p className="text-xs font-semibold">{preset.name}</p>
							<p className="text-[10px] text-muted-foreground">
								{preset.description}
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function SectionCard({
	value,
	iconBg,
	icon,
	title,
	description,
	children,
}: {
	value: string;
	iconBg: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border bg-muted/10">
			<Accordion type="multiple" defaultValue={[value]}>
				<AccordionItem value={value} className="border-0 px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2.5">
							<div className={`p-1.5 rounded-md ${iconBg}`}>{icon}</div>
							<div className="text-left">
								<p className="text-sm font-semibold">{title}</p>
								<p className="text-xs text-muted-foreground font-normal">
									{description}
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">{children}</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}

export function ScheduleVisualTab() {
	return (
		<div className="space-y-4">
			<CardPreview />
			<div className="grid gap-3 sm:grid-cols-2">
				<SectionCard
					value="presets"
					iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/30"
					icon={
						<Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
					}
					title="Presets Rápidos"
					description="Configuração otimizada com um clique"
				>
					<PresetsSection />
				</SectionCard>

				<SectionCard
					value="appearance"
					iconBg="bg-sky-100 dark:bg-sky-900/30"
					icon={<Frame className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
					title="Cards e Layout"
					description="Tamanho dos cards e altura dos slots"
				>
					<CardSizeManager />
				</SectionCard>

				<SectionCard
					value="colors"
					iconBg="bg-pink-100 dark:bg-pink-900/30"
					icon={
						<Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />
					}
					title="Cores de Status"
					description="Cores dos agendamentos por status"
				>
					<StatusColorManager />
				</SectionCard>
			</div>
		</div>
	);
}
