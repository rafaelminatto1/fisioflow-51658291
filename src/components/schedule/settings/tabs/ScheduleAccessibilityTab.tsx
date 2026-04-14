import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EyeOff, Zap, Type, RotateCcw } from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { cn } from "@/lib/utils";

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
			icon: <EyeOff className="h-4 w-4 text-muted-foreground" />,
			label: "Alto Contraste",
			description: "Aumenta contraste das cores na interface",
			checked: highContrast,
			onChange: setHighContrast,
		},
		{
			id: "reduced-motion",
			icon: <Zap className="h-4 w-4 text-muted-foreground" />,
			label: "Movimento Reduzido",
			description: "Minimiza animações e transições",
			checked: reducedMotion,
			onChange: setReducedMotion,
		},
		{
			id: "large-text",
			icon: <Type className="h-4 w-4 text-muted-foreground" />,
			label: "Texto Grande",
			description: "Aumenta o tamanho do texto na agenda",
			checked: fontSize === "large",
			onChange: (v: boolean) => setFontSize(v ? "large" : "medium"),
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-base font-bold">Acessibilidade</h2>
				<p className="text-sm text-muted-foreground">
					Ajuste a interface para suas necessidades visuais e de interação
				</p>
			</div>

			<SettingsSectionCard
				icon={<EyeOff className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
				iconBg="bg-cyan-100 dark:bg-cyan-900/30"
				title="Visual e Interação"
				description="Contraste, animações e tamanho de texto"
			>
				<div className="space-y-2">
					{toggleRows.map((row) => (
						<div
							key={row.id}
							className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
						>
							<div className="flex items-center gap-2.5">
								{row.icon}
								<div>
									<Label
										htmlFor={row.id}
										className="text-sm font-medium cursor-pointer"
									>
										{row.label}
									</Label>
									<p className="text-xs text-muted-foreground">
										{row.description}
									</p>
								</div>
							</div>
							<Switch
								id={row.id}
								checked={row.checked}
								onCheckedChange={row.onChange}
							/>
						</div>
					))}
				</div>
			</SettingsSectionCard>

			<SettingsSectionCard
				icon={<Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
				iconBg="bg-indigo-100 dark:bg-indigo-900/30"
				title="Tamanho do Texto"
				description="Escolha o tamanho ideal para leitura"
			>
				<div className="grid grid-cols-3 gap-2">
					{(["small", "medium", "large"] as const).map((size) => (
						<button
							key={size}
							type="button"
							onClick={() => setFontSize(size)}
							className={cn(
								"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
								fontSize === size
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/40",
							)}
						>
							<span
								className={cn(
									"font-semibold",
									size === "small"
										? "text-xs"
										: size === "large"
											? "text-lg"
											: "text-sm",
								)}
							>
								Aa
							</span>
							<span className="text-[10px] text-muted-foreground">
								{size === "small"
									? "Pequeno"
									: size === "large"
										? "Grande"
										: "Normal"}
							</span>
						</button>
					))}
				</div>
			</SettingsSectionCard>

			<div className="flex justify-end">
				<Button variant="outline" size="sm" onClick={reset}>
					<RotateCcw className="h-4 w-4 mr-1.5" />
					Restaurar padrão
				</Button>
			</div>
		</div>
	);
}
