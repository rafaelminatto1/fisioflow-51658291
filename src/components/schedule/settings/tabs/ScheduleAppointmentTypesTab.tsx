import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { AppointmentTypeCard } from "@/components/schedule/settings/AppointmentTypeCard";
import { Button } from "@/components/ui/button";
import { Plus, Stethoscope } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { RECOMMENDED_DURATIONS } from "@/types/appointment-types";
import { useMemo } from "react";

function RecommendedDurationsCard() {
	return (
		<div className="bg-card rounded-xl shadow-sm border p-6">
			<h3 className="text-lg font-semibold mb-4">Duração Recomendada por Tipo</h3>
			<div className="rounded-lg border divide-y">
				{RECOMMENDED_DURATIONS.map((rec) => (
					<div
						key={rec.type}
						className="flex justify-between items-center p-3"
					>
						<span className="text-sm text-muted-foreground">{rec.type}</span>
						<span className="font-mono text-sm font-medium">{rec.range}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function ImpactVisualization() {
	const { types } = useAppointmentTypes();

	const activeTypes = useMemo(
		() => types.filter((t) => t.isActive),
		[types],
	);

	return (
		<div className="bg-card rounded-xl shadow-sm border p-6">
			<h3 className="text-lg font-semibold mb-2">Visualização do Impacto</h3>
			<p className="text-sm text-muted-foreground mb-4">
				Simulação de preenchimento diário baseado nas durações configuradas.
			</p>
			<div className="mb-2 flex justify-between items-end">
				<span className="text-xs text-muted-foreground uppercase">
					Ocupação Média
				</span>
				<span className="text-sm font-medium text-violet-600 dark:text-violet-400">
					{activeTypes.length} tipos ativos
				</span>
			</div>
			<div className="w-full h-8 bg-muted rounded-full overflow-hidden flex mb-2">
				{activeTypes.map((t) => (
					<div
						key={t.id}
						className="h-full transition-all"
						style={{
							backgroundColor: t.color,
							width: `${Math.max(100 / activeTypes.length, 8)}%`,
						}}
						title={`${t.name} (${t.durationMinutes}min)`}
					/>
				))}
			</div>
			<div className="flex justify-between font-mono text-[10px] text-muted-foreground">
				<span>08:00</span>
				<span>12:00</span>
				<span>18:00</span>
			</div>
		</div>
	);
}

export function ScheduleAppointmentTypesTab() {
	const {
		types,
		expandedId,
		addType,
		updateType,
		removeType,
		toggleActive,
		duplicateType,
		toggleExpand,
	} = useAppointmentTypes();

	return (
		<div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
			<div className="xl:col-span-2">
				<SettingsSectionCard
					icon={<Stethoscope className="h-4 w-4" />}
					iconBg="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
					title="Tipos de Atendimento"
					description="Configure duração, buffer e cor para cada tipo de consulta"
					variant="highlight"
				>
					<div className="flex flex-col gap-3">
						{types.map((apt) => (
							<AppointmentTypeCard
								key={apt.id}
								type={apt}
								isExpanded={expandedId === apt.id}
								onToggleExpand={() => toggleExpand(apt.id)}
								onUpdate={(data) => updateType(apt.id, data)}
								onRemove={() => removeType(apt.id)}
								onDuplicate={() => duplicateType(apt.id)}
								onToggleActive={() => toggleActive(apt.id)}
							/>
						))}

						<Button
							type="button"
							variant="outline"
							onClick={addType}
							className="w-full border-2 border-dashed h-11 gap-2"
						>
							<Plus className="h-4 w-4" />
							Adicionar Tipo
						</Button>
					</div>
				</SettingsSectionCard>
			</div>

			<div className="flex flex-col gap-5">
				<RecommendedDurationsCard />
				<ImpactVisualization />
			</div>
		</div>
	);
}
