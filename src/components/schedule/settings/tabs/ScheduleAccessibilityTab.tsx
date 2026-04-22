import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EyeOff, Zap, Type, RotateCcw, Eye } from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { cn } from "@/lib/utils";

const FONT_SIZES = [
	{ value: "small" as const, label: "Pequeno", display: "Aa", size: "text-xs" },
	{ value: "medium" as const, label: "Normal", display: "Aa", size: "text-sm" },
	{ value: "large" as const, label: "Grande", display: "Aa", size: "text-lg" },
];

export function ScheduleAccessibilityTab() {
	const {
		highContrast,
		reducedMotion,
		fontSize,
		setHighContrast,
		setReducedMotion,
		setFontSize,
		reset,
	} = useAccessibilitySettings();

	const toggleRows = [
		{
			id: "high-contrast",
			icon: <EyeOff className="h-4 w-4" />,
			label: "Alto Contraste",
			description: "Aumenta o contraste das cores na interface da agenda",
			checked: highContrast,
			onChange: setHighContrast,
			accentColor: "text-cyan-600 dark:text-cyan-400",
			previewClass: "filter contrast-200",
		},
		{
			id: "reduced-motion",
			icon: <Zap className="h-4 w-4" />,
			label: "Movimento Reduzido",
			description: "Minimiza animações e transições de elementos",
			checked: reducedMotion,
			onChange: setReducedMotion,
			accentColor: "text-cyan-600 dark:text-cyan-400",
			previewClass: "",
		},
	];

	return (
		<div className="space-y-5">
			{/* Toggles de visual e interação */}
			<SettingsSectionCard
				icon={<Eye className="h-4 w-4" />}
				iconBg="bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400"
				title="Visual e Interação"
				description="Ajuste contraste e animações para maior conforto visual"
				variant="highlight"
			>
				<div className="space-y-2">
					{toggleRows.map((row) => (
						<div
							key={row.id}
							className={cn(
								"flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
								"bg-muted/20 hover:bg-muted/30 border-border/40 hover:border-border/60",
								row.checked && "bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200/60 dark:border-cyan-800/40",
							)}
						>
							<div className="flex items-center gap-3">
								<div
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
										row.checked
											? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400"
											: "bg-muted text-muted-foreground",
									)}
								>
									{row.icon}
								</div>
								<div>
									<Label
										htmlFor={row.id}
										className={cn(
											"text-sm font-medium cursor-pointer",
											row.checked && "text-cyan-800 dark:text-cyan-300",
										)}
									>
										{row.label}
									</Label>
									<p className="text-xs text-muted-foreground mt-0.5">
										{row.description}
									</p>
								</div>
							</div>
							<Switch
								id={row.id}
								checked={row.checked}
								onCheckedChange={row.onChange}
								className="shrink-0"
							/>
						</div>
					))}
				</div>
			</SettingsSectionCard>

			{/* Tamanho do texto */}
			<SettingsSectionCard
				icon={<Type className="h-4 w-4" />}
				iconBg="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
				title="Tamanho do Texto"
				description="Escolha o tamanho ideal para leitura dos cards da agenda"
			>
				<div className="grid grid-cols-3 gap-3">
					{FONT_SIZES.map(({ value, label, display, size }) => {
						const isActive = fontSize === value;
						return (
							<button
								key={value}
								type="button"
								onClick={() => setFontSize(value)}
								className={cn(
									"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150",
									"hover:shadow-sm hover:-translate-y-0.5",
									isActive
										? "border-sky-400 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-600"
										: "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
								)}
							>
								<span
									className={cn(
										"font-bold transition-all",
										size,
										isActive
											? "text-sky-700 dark:text-sky-300"
											: "text-foreground",
									)}
								>
									{display}
								</span>
								<span
									className={cn(
										"text-xs font-medium",
										isActive
											? "text-sky-600 dark:text-sky-400"
											: "text-muted-foreground",
									)}
								>
									{label}
								</span>
							</button>
						);
					})}
				</div>
			</SettingsSectionCard>

			{/* Reset */}
			<div className="flex justify-end">
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
		</div>
	);
}
