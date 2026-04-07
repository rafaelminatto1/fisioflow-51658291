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

import { Button } from "@/components/ui/button";
import { useCardSize } from "@/hooks/useCardSize";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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
	tags: string[];
}

const PRESETS: ViewPreset[] = [
	{
		id: "productive",
		name: "Alta Produtividade",
		description: "Slots compactos, mais agendamentos visíveis",
		icon: <Zap className="w-4 h-4" />,
		config: { cardSize: "extra_small", heightScale: 2 },
		tags: ["Compacto"],
	},
	{
		id: "balanced",
		name: "Equilibrado",
		description: "Bom equilíbrio entre info e espaço",
		icon: <Monitor className="w-4 h-4" />,
		config: { cardSize: "medium", heightScale: 5 },
		tags: ["Padrão"],
	},
	{
		id: "comfortable",
		name: "Confortável",
		description: "Mais espaço para leitura fácil",
		icon: <Eye className="w-4 h-4" />,
		config: { cardSize: "large", heightScale: 8 },
		tags: ["Espaçoso"],
	},
	{
		id: "accessibility",
		name: "Acessibilidade",
		description: "Tamanho máximo para melhor visibilidade",
		icon: <Type className="w-4 h-4" />,
		config: { cardSize: "large", heightScale: 10 },
		tags: ["Alto contraste"],
	},
];

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
		toast({ title: "Preset aplicado", description: preset.name });
	};

	return (
		<div className="grid grid-cols-2 gap-2">
			{PRESETS.map((preset) => {
				const isActive = currentPreset?.id === preset.id;
				const wasApplied = appliedPreset === preset.id;
				return (
					<Button
						key={preset.id}
						variant={isActive ? "default" : "outline"}
						size="sm"
						onClick={() => applyPreset(preset)}
						className="h-auto flex items-center gap-2 py-2.5 px-3 justify-start"
					>
						<div
							className={cn(
								"flex items-center justify-center w-7 h-7 rounded-md shrink-0",
								isActive || wasApplied
									? "bg-primary-foreground/20"
									: "bg-muted",
							)}
						>
							{wasApplied ? (
								<CheckCircle2 className="w-3.5 h-3.5" />
							) : (
								preset.icon
							)}
						</div>
						<div className="text-left">
							<p className="text-xs font-semibold">{preset.name}</p>
							<p className="text-[10px] text-muted-foreground font-normal">
								{preset.description}
							</p>
						</div>
					</Button>
				);
			})}
		</div>
	);
}

function AccessibilitySection() {
	const [highContrast, setHighContrast] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);
	const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
		"medium",
	);

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
			if (
				parsed.fontSize === "small" ||
				parsed.fontSize === "medium" ||
				parsed.fontSize === "large"
			) {
				setFontSize(parsed.fontSize);
			}
		} catch {
			// ignore parsing errors
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(
			"accessibility-settings",
			JSON.stringify({ highContrast, reducedMotion, fontSize }),
		);
		document.documentElement.classList.toggle("high-contrast", highContrast);
		document.documentElement.classList.toggle("reduced-motion", reducedMotion);
		document.documentElement.classList.remove(
			"text-small",
			"text-medium",
			"text-large",
		);
		document.documentElement.classList.add(`text-${fontSize}`);
	}, [highContrast, reducedMotion, fontSize]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between p-3 rounded-lg border">
				<div className="flex items-center gap-3">
					<EyeOff className="h-4 w-4 text-muted-foreground" />
					<div>
						<Label
							htmlFor="high-contrast"
							className="text-sm font-medium cursor-pointer"
						>
							Alto Contraste
						</Label>
						<p className="text-xs text-muted-foreground">
							Aumenta contraste das cores
						</p>
					</div>
				</div>
				<Switch
					id="high-contrast"
					checked={highContrast}
					onCheckedChange={(checked) => {
						setHighContrast(checked);
						toast({
							title: checked
								? "Alto contraste ativado"
								: "Alto contraste desativado",
						});
					}}
				/>
			</div>

			<div className="flex items-center justify-between p-3 rounded-lg border">
				<div className="flex items-center gap-3">
					<Zap className="h-4 w-4 text-muted-foreground" />
					<div>
						<Label
							htmlFor="reduced-motion"
							className="text-sm font-medium cursor-pointer"
						>
							Movimento Reduzido
						</Label>
						<p className="text-xs text-muted-foreground">Minimiza animações</p>
					</div>
				</div>
				<Switch
					id="reduced-motion"
					checked={reducedMotion}
					onCheckedChange={(checked) => {
						setReducedMotion(checked);
						toast({
							title: checked
								? "Movimento reduzido ativado"
								: "Movimento reduzido desativado",
						});
					}}
				/>
			</div>

			<div className="flex items-center justify-between p-3 rounded-lg border">
				<div className="flex items-center gap-3">
					<Type className="h-4 w-4 text-muted-foreground" />
					<div>
						<Label
							htmlFor="large-text"
							className="text-sm font-medium cursor-pointer"
						>
							Texto Grande
						</Label>
						<p className="text-xs text-muted-foreground">
							Aumenta texto em toda a agenda
						</p>
					</div>
				</div>
				<Switch
					id="large-text"
					checked={fontSize === "large"}
					onCheckedChange={(checked) => {
						setFontSize(checked ? "large" : "medium");
						toast({
							title: checked
								? "Texto grande ativado"
								: "Texto grande desativado",
						});
					}}
				/>
			</div>
		</div>
	);
}

export function ScheduleVisualTab() {
	return (
		<div className="space-y-4">
			<Accordion
				type="multiple"
				defaultValue={["presets", "appearance", "colors", "accessibility"]}
				className="space-y-2"
			>
				<AccordionItem value="presets" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-md">
								<Sparkles className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Presets Rápidos</p>
								<p className="text-xs text-muted-foreground font-normal">
									Configurações otimizadas com um clique
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<PresetsSection />
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="appearance" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-md">
								<Frame className="h-4 w-4 text-sky-600 dark:text-sky-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Cards e Layout</p>
								<p className="text-xs text-muted-foreground font-normal">
									Tamanho dos cards e altura dos slots
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<CardSizeManager />
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="colors" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-md">
								<Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Cores de Status</p>
								<p className="text-xs text-muted-foreground font-normal">
									Cores dos agendamentos por status
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<StatusColorManager />
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="accessibility" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
								<Eye className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Acessibilidade</p>
								<p className="text-xs text-muted-foreground font-normal">
									Contraste, animações e tamanho de texto
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<AccessibilitySection />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
