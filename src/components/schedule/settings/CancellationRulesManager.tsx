import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
	Save,
	Loader2,
	CheckCircle2,
	Shield,
	Clock,
	DollarSign,
} from "lucide-react";
import {
	useScheduleSettings,
	CancellationRule,
} from "@/hooks/useScheduleSettings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEFAULT_RULES: Partial<CancellationRule> = {
	min_hours_before: 24,
	allow_patient_cancellation: true,
	max_cancellations_month: 3,
	charge_late_cancellation: false,
	late_cancellation_fee: 0,
};

const CANCELLATION_PRESETS = [
	{ label: "Flexível", description: "2h de antecedência", icon: "🧘", min_hours_before: 2, max_cancellations_month: 5 },
	{ label: "Padrão", description: "24h de antecedência", icon: "⏱️", min_hours_before: 24, max_cancellations_month: 3 },
	{ label: "Rigoroso", description: "48h de antecedência", icon: "📋", min_hours_before: 48, max_cancellations_month: 2 },
];

const FEE_PRESETS = [
	{ label: "R$ 50", value: 50 },
	{ label: "R$ 100", value: 100 },
	{ label: "R$ 150", value: 150 },
];

export function CancellationRulesManager() {
	const {
		cancellationRules,
		upsertCancellationRules,
		isLoadingRules,
		isSavingRules,
	} = useScheduleSettings();
	const [rules, setRules] = useState<Partial<CancellationRule>>(DEFAULT_RULES);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (cancellationRules) {
			setRules(cancellationRules);
		}
	}, [cancellationRules]);

	const updateRule = (field: keyof CancellationRule, value: number | boolean) => {
		setRules({ ...rules, [field]: value });
		setSaved(false);
	};

	const handleSave = async () => {
		try {
			await upsertCancellationRules.mutateAsync(rules);
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch {
			// erro tratado no hook
		}
	};

	const applyPreset = (preset: (typeof CANCELLATION_PRESETS)[0]) => {
		setRules({ ...rules, min_hours_before: preset.min_hours_before, max_cancellations_month: preset.max_cancellations_month });
		setSaved(false);
	};

	if (isLoadingRules) {
		return (
			<div className="py-8 flex justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const hoursBefore = rules.min_hours_before || 24;
	const maxCancellations = rules.max_cancellations_month || 3;
	const lateFee = rules.late_cancellation_fee || 0;

	return (
		<div className="space-y-4">
			{/* Presets */}
			<div className="space-y-2">
				<Label className="text-xs font-medium text-muted-foreground">Presets de política</Label>
				<div className="grid grid-cols-3 gap-2">
					{CANCELLATION_PRESETS.map((preset) => {
						const isActive =
							rules.min_hours_before === preset.min_hours_before &&
							rules.max_cancellations_month === preset.max_cancellations_month;
						return (
							<button
								key={preset.label}
								onClick={() => applyPreset(preset)}
								className={cn(
									"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:shadow-sm text-center",
									isActive
										? "border-primary bg-primary/5 shadow-sm"
										: "border-border bg-muted/30 hover:bg-muted/50",
								)}
							>
								<span className="text-2xl">{preset.icon}</span>
								<p className="font-semibold text-xs">{preset.label}</p>
								<p className="text-[10px] text-muted-foreground">{preset.description}</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* Antecedência Mínima */}
			<div className="space-y-3 p-3 rounded-xl border bg-muted/30">
				<div className="flex items-center justify-between">
					<Label className="text-sm font-semibold flex items-center gap-2">
						<Clock className="h-4 w-4 text-blue-600" />
						Antecedência Mínima
					</Label>
					<Badge variant="outline" className="font-bold">
						{hoursBefore}h
					</Badge>
				</div>
				<Slider
					value={[hoursBefore]}
					onValueChange={([value]) => updateRule("min_hours_before", value)}
					min={1}
					max={72}
					step={1}
					className="cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-muted-foreground px-1">
					<span>1h</span>
					<span>24h</span>
					<span>48h</span>
					<span>72h</span>
				</div>
			</div>

			{/* Limite Mensal */}
			<div className="space-y-3 p-3 rounded-xl border bg-muted/30">
				<div className="flex items-center justify-between">
					<Label className="text-sm font-semibold flex items-center gap-2">
						<Shield className="h-4 w-4 text-primary" />
						Limite Mensal
					</Label>
					<Badge variant="outline" className="font-bold">
						{maxCancellations === 0 ? "Ilimitado" : `${maxCancellations}/mês`}
					</Badge>
				</div>
				<Slider
					value={[maxCancellations]}
					onValueChange={([value]) => updateRule("max_cancellations_month", value)}
					min={0}
					max={10}
					step={1}
					className="cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-muted-foreground px-1">
					<span>Ilimitado</span>
					<span>5</span>
					<span>10</span>
				</div>
			</div>

			{/* Permissões */}
			<div className="space-y-2">
				<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
					<div>
						<Label className="text-sm font-medium">Permitir auto-cancelamento</Label>
						<p className="text-xs text-muted-foreground mt-0.5">
							Pacientes cancelam via WhatsApp/portal
						</p>
					</div>
					<Switch
						checked={rules.allow_patient_cancellation ?? true}
						onCheckedChange={(checked) => updateRule("allow_patient_cancellation", checked)}
					/>
				</div>

				<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
					<div>
						<Label className="text-sm font-medium">Cobrar cancelamento tardio</Label>
						<p className="text-xs text-muted-foreground mt-0.5">
							Aplicar taxa fora do prazo
						</p>
					</div>
					<Switch
						checked={rules.charge_late_cancellation ?? false}
						onCheckedChange={(checked) => updateRule("charge_late_cancellation", checked)}
					/>
				</div>

				{rules.charge_late_cancellation && (
					<div className="p-3 rounded-lg border bg-muted/30 ml-2 animate-in slide-in-from-top-2 duration-200">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="h-4 w-4 text-muted-foreground" />
							<Label className="text-sm font-medium">Taxa de cancelamento tardio</Label>
						</div>
						<div className="flex items-center gap-3 mb-2">
							<span className="text-lg font-bold">R$</span>
							<Slider
								value={[lateFee]}
								onValueChange={([value]) => updateRule("late_cancellation_fee", value)}
								min={0}
								max={200}
								step={5}
								className="flex-1 cursor-pointer"
							/>
							<span className="text-lg font-bold min-w-[4rem] text-right">
								{lateFee.toFixed(0)}
							</span>
						</div>
						<div className="flex gap-2">
							{FEE_PRESETS.map((preset) => (
								<Button
									key={preset.label}
									size="sm"
									variant={lateFee === preset.value ? "default" : "outline"}
									onClick={() => updateRule("late_cancellation_fee", preset.value)}
									className="h-7 text-xs"
								>
									{preset.label}
								</Button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Save */}
			<div className="flex justify-end pt-2 border-t">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isSavingRules || saved}
					className={cn(saved && "bg-green-600 hover:bg-green-700")}
				>
					{saved ? (
						<><CheckCircle2 className="h-4 w-4 mr-1.5" />Salvo</>
					) : isSavingRules ? (
						<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Salvando...</>
					) : (
						<><Save className="h-4 w-4 mr-1.5" />Salvar regras</>
					)}
				</Button>
			</div>
		</div>
	);
}
