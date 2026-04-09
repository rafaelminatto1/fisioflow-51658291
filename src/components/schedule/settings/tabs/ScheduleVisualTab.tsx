import { useState, useEffect } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { CardSizeManager } from "@/components/schedule/settings/CardSizeManager";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useCardSize } from "@/hooks/useCardSize";
import { cn } from "@/lib/utils";
import {
	Palette,
	Sparkles,
	Frame,
	Eye,
	EyeOff,
	Zap,
	Monitor,
	Type,
	CheckCircle2,
} from "lucide-react";
import type { CardSize } from "@/types/agenda";

interface ViewPreset {
	id: string;
	name: string;
	description: string;
	icon: React.ReactNode;
	config: { cardSize: CardSize; heightScale: number };
}

const PRESETS: ViewPreset[] = [
	{
		id: "productive",
		name: "Alta Produtividade",
		description: "Slots compactos, mais visíveis",
		icon: <Zap className="w-3.5 h-3.5" />,
		config: { cardSize: "extra_small", heightScale: 2 },
	},
	{
		id: "balanced",
		name: "Equilibrado",
		description: "Equilíbrio entre info e espaço",
		icon: <Monitor className="w-3.5 h-3.5" />,
		config: { cardSize: "medium", heightScale: 5 },
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço para leitura",
		icon: <Eye className="w-3.5 h-3.5" />,
		config: { cardSize: "large", heightScale: 8 },
	},
	{
		id: "accessibility",
		name: "Acessibilidade",
		description: "Tamanho máximo de visibilidade",
		icon: <Type className="w-3.5 h-3.5" />,
		config: { cardSize: "large", heightScale: 10 },
	},
];

function PresetsSection() {
	const { cardSize, setCardSize, heightScale, setHeightScale } = useCardSize();
	const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

	const currentPreset = PRESETS.find(
		(p) => p.config.cardSize === cardSize && p.config.heightScale === heightScale,
	);

	const applyPreset = (preset: ViewPreset) => {
		setCardSize(preset.config.cardSize);
		setHeightScale(preset.config.heightScale);
		setAppliedPreset(preset.id);
		setTimeout(() => setAppliedPreset(null), 2000);
		toast({ title: "Preset aplicado", description: preset.name });
	};

	return (
		<div className="grid grid-cols-2 gap-2">
			{PRESETS.map((preset) => {
				const isActive = currentPreset?.id === preset.id;
				const wasApplied = appliedPreset === preset.id;
				return (
					<button
						key={preset.id}
						onClick={() => applyPreset(preset)}
						className={cn(
							"flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm",
							isActive
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/40 hover:bg-muted/30",
						)}
					>
						<div className={cn(
							"flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
							isActive ? "bg-primary text-primary-foreground" : "bg-muted",
						)}>
							{wasApplied ? <CheckCircle2 className="w-3.5 h-3.5" /> : preset.icon}
						</div>
						<div>
							<p className="text-xs font-semibold">{preset.name}</p>
							<p className="text-[10px] text-muted-foreground">{preset.description}</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function AccessibilitySection() {
	const [highContrast, setHighContrast] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);
	const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

	useEffect(() => {
		try {
			const raw = localStorage.getItem("accessibility-settings");
			if (!raw) return;
			const parsed = JSON.parse(raw) as {
				highContrast?: boolean;
				reducedMotion?: boolean;
				fontSize?: "small" | "medium" | "large";
			};
			setHighContrast(!!parsed.highContrast);
			setReducedMotion(!!parsed.reducedMotion);
			if (parsed.fontSize === "small" || parsed.fontSize === "medium" || parsed.fontSize === "large") {
				setFontSize(parsed.fontSize);
			}
		} catch { /* ignore */ }
	}, []);

	useEffect(() => {
		localStorage.setItem("accessibility-settings", JSON.stringify({ highContrast, reducedMotion, fontSize }));
		document.documentElement.classList.toggle("high-contrast", highContrast);
		document.documentElement.classList.toggle("reduced-motion", reducedMotion);
		document.documentElement.classList.remove("text-small", "text-medium", "text-large");
		document.documentElement.classList.add(`text-${fontSize}`);
	}, [highContrast, reducedMotion, fontSize]);

	const rows = [
		{
			id: "high-contrast",
			icon: <EyeOff className="h-4 w-4 text-muted-foreground" />,
			label: "Alto Contraste",
			description: "Aumenta contraste das cores",
			checked: highContrast,
			onChange: (v: boolean) => {
				setHighContrast(v);
				toast({ title: v ? "Alto contraste ativado" : "Alto contraste desativado" });
			},
		},
		{
			id: "reduced-motion",
			icon: <Zap className="h-4 w-4 text-muted-foreground" />,
			label: "Movimento Reduzido",
			description: "Minimiza animações",
			checked: reducedMotion,
			onChange: (v: boolean) => {
				setReducedMotion(v);
				toast({ title: v ? "Movimento reduzido ativado" : "Movimento reduzido desativado" });
			},
		},
		{
			id: "large-text",
			icon: <Type className="h-4 w-4 text-muted-foreground" />,
			label: "Texto Grande",
			description: "Aumenta texto em toda a agenda",
			checked: fontSize === "large",
			onChange: (v: boolean) => {
				setFontSize(v ? "large" : "medium");
				toast({ title: v ? "Texto grande ativado" : "Texto grande desativado" });
			},
		},
	];

	return (
		<div className="space-y-2">
			{rows.map((row) => (
				<div key={row.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
					<div className="flex items-center gap-2.5">
						{row.icon}
						<div>
							<Label htmlFor={row.id} className="text-sm font-medium cursor-pointer">{row.label}</Label>
							<p className="text-xs text-muted-foreground">{row.description}</p>
						</div>
					</div>
					<Switch id={row.id} checked={row.checked} onCheckedChange={row.onChange} />
				</div>
			))}
		</div>
	);
}

/* Reusable section card with accordion */
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
			<Accordion type="multiple" defaultValue={[]}>
				<AccordionItem value={value} className="border-0 px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2.5">
							<div className={`p-1.5 rounded-md ${iconBg}`}>
								{icon}
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">{title}</p>
								<p className="text-xs text-muted-foreground font-normal">{description}</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						{children}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}

export function ScheduleVisualTab() {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<SectionCard
				value="presets"
				iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/30"
				icon={<Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />}
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
				icon={<Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />}
				title="Cores de Status"
				description="Cores dos agendamentos por status"
			>
				<StatusColorManager />
			</SectionCard>

			<SectionCard
				value="accessibility"
				iconBg="bg-cyan-100 dark:bg-cyan-900/30"
				icon={<Eye className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
				title="Acessibilidade"
				description="Contraste, animações e tamanho de texto"
			>
				<AccessibilitySection />
			</SectionCard>
		</div>
	);
}
