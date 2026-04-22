import { useState } from "react";
import {
	useScheduleCapacity,
	type CapacityGroup,
} from "@/hooks/useScheduleCapacity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Trash2,
	Plus,
	Minus,
	Loader2,
	CheckCircle2,
	Info,
	Copy,
	Pencil,
	X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
	{ value: "monday", label: "Segunda", valueNum: 1 },
	{ value: "tuesday", label: "Terça", valueNum: 2 },
	{ value: "wednesday", label: "Quarta", valueNum: 3 },
	{ value: "thursday", label: "Quinta", valueNum: 4 },
	{ value: "friday", label: "Sexta", valueNum: 5 },
	{ value: "saturday", label: "Sábado", valueNum: 6 },
	{ value: "sunday", label: "Domingo", valueNum: 0 },
];

const DAY_SHORT_LABELS: Record<number, string> = {
	0: "Dom", 1: "SEG", 2: "TER", 3: "QUA", 4: "QUI", 5: "SEX", 6: "SÁB",
};

function formatDaysBadge(days: number[]): string {
	if (days.length === 0) return "";
	const sorted = [...days].sort((a, b) => a - b);
	if (sorted.length === 5 && sorted[0] === 1 && sorted[4] === 5) return "SEG-SEX";
	if (sorted.length === 6 && sorted[0] === 1 && sorted[5] === 6) return "SEG-SÁB";
	return sorted.map((d) => DAY_SHORT_LABELS[d]).join(", ");
}

const TIME_PRESETS = [
	{ label: "Manhã", start: "07:00", end: "12:00" },
	{ label: "Tarde", start: "13:00", end: "18:00" },
	{ label: "Integral", start: "07:00", end: "19:00" },
];

type FormData = {
	selectedDays: string[];
	start_time: string;
	end_time: string;
	max_patients: number;
};

const EMPTY_FORM: FormData = {
	selectedDays: [],
	start_time: "07:00",
	end_time: "13:00",
	max_patients: 3,
};

function CapacityControl({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div className="flex items-center border rounded-lg bg-card overflow-hidden">
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-7 w-7 rounded-none shrink-0"
				onClick={() => onChange(Math.max(1, value - 1))}
				disabled={value <= 1}
			>
				<Minus className="h-3 w-3" />
			</Button>
			<Input
				type="number"
				min={1}
				max={20}
				value={value}
				onChange={(e) => {
					const v = parseInt(e.target.value, 10);
					if (!Number.isNaN(v)) onChange(Math.min(20, Math.max(1, v)));
				}}
				className="w-10 h-7 text-center border-0 rounded-none text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-7 w-7 rounded-none shrink-0"
				onClick={() => onChange(Math.min(20, value + 1))}
				disabled={value >= 20}
			>
				<Plus className="h-3 w-3" />
			</Button>
		</div>
	);
}

function CapacityForm({
	title,
	form,
	onChange,
	onSave,
	onCancel,
	isSaving,
	groupKey,
}: {
	title: string;
	form: FormData;
	onChange: (f: FormData) => void;
	onSave: () => void;
	onCancel: () => void;
	isSaving: boolean;
	groupKey?: string;
}) {
	const prefix = groupKey ?? "new";
	return (
		<div className="rounded-xl border bg-muted/40 p-4 space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold">{title}</p>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Preset de horário</Label>
				<div className="flex gap-2">
					{TIME_PRESETS.map((p) => (
						<Button
							key={p.label}
							size="sm"
							variant={
								form.start_time === p.start && form.end_time === p.end
									? "default"
									: "outline"
							}
							onClick={() =>
								onChange({ ...form, start_time: p.start, end_time: p.end })
							}
							className="h-8 text-xs"
						>
							{p.label}
						</Button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Início</Label>
					<Input
						type="time"
						value={form.start_time}
						onChange={(e) =>
							onChange({ ...form, start_time: e.target.value })
						}
						className="h-8 text-sm font-mono"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">Fim</Label>
					<Input
						type="time"
						value={form.end_time}
						onChange={(e) =>
							onChange({ ...form, end_time: e.target.value })
						}
						className="h-8 text-sm font-mono"
					/>
				</div>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Dias da semana</Label>
				<div className="grid grid-cols-4 gap-x-3 gap-y-2">
					{DAYS_OF_WEEK.map((day) => (
						<div key={day.value} className="flex items-center gap-1.5">
							<Checkbox
								id={`${prefix}-${day.value}`}
								checked={form.selectedDays.includes(day.value)}
								onCheckedChange={(checked) =>
									onChange({
										...form,
										selectedDays: checked
											? [...form.selectedDays, day.value]
											: form.selectedDays.filter((x) => x !== day.value),
									})
								}
							/>
							<Label
								htmlFor={`${prefix}-${day.value}`}
								className="text-xs font-normal cursor-pointer"
							>
								{day.label}
							</Label>
						</div>
					))}
				</div>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Pacientes por horário</Label>
				<div className="flex items-center gap-3">
					<CapacityControl
						value={form.max_patients}
						onChange={(v) => onChange({ ...form, max_patients: v })}
					/>
				<span className="text-xs text-muted-foreground">
					vaga{form.max_patients !== 1 ? "s" : ""}/hora
				</span>
				</div>
			</div>

			<div className="flex gap-2 pt-1">
				<Button variant="outline" size="sm" onClick={onCancel} className="flex-none">
					Cancelar
				</Button>
				<Button
					size="sm"
					onClick={onSave}
					disabled={isSaving || form.selectedDays.length === 0}
					className="flex-1"
				>
					{isSaving ? (
						<>
							<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
							Salvando...
						</>
					) : (
						<>
							<CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
							Salvar
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

const DAY_KEY_TO_NUM: Record<string, number> = {
	sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
	thursday: 4, friday: 5, saturday: 6,
};

export function CapacityRulesList() {
	const {
		capacities,
		capacityGroups,
		isLoading,
		createMultipleCapacities,
		updateCapacityGroup,
		replaceCapacityGroup,
		deleteCapacityGroup,
		organizationId,
		isCreating,
		isReplacing,
		checkConflicts,
		authError,
	} = useScheduleCapacity();
	const { toast } = useToast();
	const [isAdding, setIsAdding] = useState(false);
	const [editingGroup, setEditingGroup] = useState<CapacityGroup | null>(null);
	const [editData, setEditData] = useState<FormData>(EMPTY_FORM);
	const [editingCapacityValue, setEditingCapacityValue] = useState<Record<string, number>>({});
	const [newCapacity, setNewCapacity] = useState<FormData>(EMPTY_FORM);

	const handleAdd = async () => {
		if (!organizationId) {
			toast({ title: "Erro", description: "Organização não carregada.", variant: "destructive" });
			return;
		}
		if (newCapacity.selectedDays.length === 0) {
			toast({ title: "Erro", description: "Selecione pelo menos um dia.", variant: "destructive" });
			return;
		}
		const [sh, sm] = newCapacity.start_time.split(":").map(Number);
		const [eh, em] = newCapacity.end_time.split(":").map(Number);
		if (sh * 60 + sm >= eh * 60 + em) {
			toast({ title: "Erro", description: "Início deve ser anterior ao fim.", variant: "destructive" });
			return;
		}
		const daysNums = newCapacity.selectedDays.map((d) => DAY_KEY_TO_NUM[d]);
		const conflict = checkConflicts(daysNums, newCapacity.start_time, newCapacity.end_time);
		if (conflict.hasConflict) {
			toast({
				title: "Conflito detectado",
				description: `Sobreposição: ${conflict.conflicts.map((c) => `${c.dayLabel} (${c.start}–${c.end})`).join(", ")}`,
				variant: "destructive",
			});
			return;
		}
		try {
			await createMultipleCapacities.mutateAsync(
				daysNums.map((day) => ({
					day_of_week: day,
					start_time: newCapacity.start_time,
					end_time: newCapacity.end_time,
					max_patients: newCapacity.max_patients,
				})),
			);
			setIsAdding(false);
			setNewCapacity(EMPTY_FORM);
		} catch { /* toast no hook */ }
	};

	const handleEditStart = (group: CapacityGroup) => {
		const DAY_NUM_TO_KEY: Record<number, string> = {
			0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
			4: "thursday", 5: "friday", 6: "saturday",
		};
		setEditData({
			selectedDays: group.days.map((d) => DAY_NUM_TO_KEY[d]),
			start_time: group.start_time.slice(0, 5),
			end_time: group.end_time.slice(0, 5),
			max_patients: group.max_patients,
		});
		setEditingGroup(group);
		setIsAdding(false);
	};

	const handleEditSave = async () => {
		if (!editingGroup) return;
		if (editData.selectedDays.length === 0) {
			toast({ title: "Erro", description: "Selecione pelo menos um dia.", variant: "destructive" });
			return;
		}
		const [sh, sm] = editData.start_time.split(":").map(Number);
		const [eh, em] = editData.end_time.split(":").map(Number);
		if (sh * 60 + sm >= eh * 60 + em) {
			toast({ title: "Erro", description: "Início deve ser anterior ao fim.", variant: "destructive" });
			return;
		}
		const daysNums = editData.selectedDays.map((d) => DAY_KEY_TO_NUM[d]);
		const conflict = checkConflicts(daysNums, editData.start_time, editData.end_time, editingGroup.ids);
		if (conflict.hasConflict) {
			toast({
				title: "Conflito detectado",
				description: `Sobreposição: ${conflict.conflicts.map((c) => `${c.dayLabel} (${c.start}–${c.end})`).join(", ")}`,
				variant: "destructive",
			});
			return;
		}
		try {
			await replaceCapacityGroup.mutateAsync({
				ids: editingGroup.ids,
				formDataArray: daysNums.map((day) => ({
					day_of_week: day,
					start_time: editData.start_time,
					end_time: editData.end_time,
					max_patients: editData.max_patients,
				})),
			});
			setEditingGroup(null);
		} catch { /* toast no hook */ }
	};

	const handleDuplicate = (group: CapacityGroup) => {
		setNewCapacity({
			selectedDays: [],
			start_time: group.start_time.slice(0, 5),
			end_time: group.end_time.slice(0, 5),
			max_patients: group.max_patients,
		});
		setEditingGroup(null);
		setIsAdding(true);
	};

	if (isLoading) {
		return (
			<div className="py-8 flex justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
			<div className="px-5 py-4 border-b flex justify-between items-center">
				<h3 className="text-sm font-medium text-foreground">Regras Ativas</h3>
				<Badge variant="secondary" className="text-xs">
					{capacities.length} configuração{capacities.length !== 1 ? "ões" : ""}
				</Badge>
			</div>

			{authError && (
				<div className="px-5 py-3">
					<Alert variant="destructive">
						<Info className="h-4 w-4" />
						<AlertTitle>Erro de Autenticação</AlertTitle>
						<AlertDescription>{authError}</AlertDescription>
					</Alert>
				</div>
			)}

			<div className="divide-y divide-border">
				{capacityGroups.map((group) => {
					const groupKey = group.ids.join(",");
					const displayValue = editingCapacityValue[groupKey] ?? group.max_patients;
					const isThisEditing = editingGroup?.ids.join(",") === groupKey;

					return (
						<div key={groupKey}>
							<div
								className={cn(
							"group flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors",
							isThisEditing && "bg-blue-50/50 dark:bg-blue-950/20",
								)}
							>
								<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center">
									<span className="font-mono text-[10px] font-bold text-foreground">
											{formatDaysBadge(group.days)}
										</span>
									</div>
									<div>
										<p className="text-sm font-medium text-foreground">
											{group.max_patients <= 2
												? "Atendimento Padrão"
												: group.max_patients <= 4
													? "Alta Demanda"
													: "Capacidade Máxima"}
										</p>
										<div className="flex items-center gap-2 mt-1">
											<span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
												{group.start_time.slice(0, 5)} – {group.end_time.slice(0, 5)}
											</span>
											<span className="w-1 h-1 rounded-full bg-border" />
											<span className="text-xs text-muted-foreground">
												Até {group.max_patients} pacientes/hora
											</span>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<CapacityControl
										value={displayValue}
										onChange={(v) => {
											setEditingCapacityValue((prev) => ({ ...prev, [groupKey]: v }));
											updateCapacityGroup({ ids: group.ids, max_patients: v });
										}}
									/>
									<span className="text-xs text-muted-foreground w-16 shrink-0">
										vaga{displayValue !== 1 ? "s" : ""}/hora
									</span>
									<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
										<Button
											size="icon"
											variant="ghost"
											className="h-7 w-7 hover:text-blue-600"
											onClick={() => handleDuplicate(group)}
										>
											<Copy className="h-3.5 w-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className={cn("h-7 w-7", isThisEditing ? "text-blue-600" : "hover:text-amber-600")}
											onClick={() => (isThisEditing ? setEditingGroup(null) : handleEditStart(group))}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="h-7 w-7 hover:text-red-500"
											onClick={() => deleteCapacityGroup(group.ids)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							</div>

							{isThisEditing && (
								<div className="px-5 pb-4">
									<CapacityForm
										title={`Editar regra`}
										form={editData}
										onChange={setEditData}
										onSave={handleEditSave}
										onCancel={() => setEditingGroup(null)}
										isSaving={isReplacing}
										groupKey={groupKey}
									/>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<div className="p-4 border-t">
				{isAdding ? (
					<CapacityForm
						title="Nova Regra"
						form={newCapacity}
						onChange={setNewCapacity}
						onSave={handleAdd}
						onCancel={() => {
							setIsAdding(false);
							setNewCapacity(EMPTY_FORM);
						}}
						isSaving={isCreating}
					/>
				) : (
					<Button
						size="sm"
						variant="outline"
						onClick={() => setIsAdding(true)}
						className="w-full border-dashed"
					>
						<Plus className="h-4 w-4 mr-1.5" />
						Adicionar Regra
					</Button>
				)}
			</div>
		</div>
	);
}
