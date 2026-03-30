import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPOINTMENT_STATUS_CONFIG } from "../shared/appointment-status";
import { cn } from "@/lib/utils";
import {
	formatTherapistLabel,
	THERAPIST_SELECT_NONE,
	THERAPIST_PLACEHOLDER,
} from "@/hooks/useTherapists";
import { type Patient } from "@/types";
import { type AppointmentFormData } from "@/types/appointment";
import { AppointmentDateTimeSection } from "../AppointmentDateTimeSection";
import { AppointmentPatientSelectionSection } from "../AppointmentPatientSelectionSection";
import { AppointmentPaymentTab } from "../AppointmentPaymentTab";

interface AppointmentInfoTabProps {
	methods: UseFormReturn<AppointmentFormData>;
	currentMode: "create" | "edit" | "view";
	patients: Patient[];
	patientsLoading: boolean;
	defaultPatientId?: string;
	onQuickPatientCreate: (searchTerm: string) => void;
	lastCreatedPatient: { id: string; name: string } | null;
	normalizedAppointmentPatientName: string;
	selectedPatientName: string;
	timeSlots: string[];
	isCalendarOpen: boolean;
	setIsCalendarOpen: (open: boolean) => void;
	getMinCapacityForInterval: (
		day: number,
		time: string,
		duration: number,
	) => number;
	conflictCount: number;
	onAutoSchedule: () => void;
	therapists: any[];
	therapistsLoading: boolean;
	isNotesExpanded: boolean;
	setIsNotesExpanded: (expanded: boolean) => void;
}

/**
 * Label padrão de campo.
 * Cor: on_surface_variant (#434655) do design system FisioFlow Clinical
 */
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
	<span className="text-xs font-medium text-slate-500 block mb-1.5">
		{children}
	</span>
);

export const AppointmentInfoTab: React.FC<AppointmentInfoTabProps> = ({
	methods,
	currentMode,
	patients,
	patientsLoading,
	defaultPatientId,
	onQuickPatientCreate,
	lastCreatedPatient,
	normalizedAppointmentPatientName,
	selectedPatientName,
	timeSlots,
	isCalendarOpen,
	setIsCalendarOpen,
	getMinCapacityForInterval,
	conflictCount,
	onAutoSchedule,
	therapists,
	therapistsLoading,
	// Mantidos na interface por compatibilidade, mas o campo agora é sempre expandido
	isNotesExpanded: _isNotesExpanded,
	setIsNotesExpanded: _setIsNotesExpanded,
}) => {
	const { register, setValue, watch } = methods;

	const watchedPatientId = watch("patient_id");
	const watchedDateStr = watch("appointment_date");
	const watchedTime = watch("appointment_time");
	const watchedDuration = watch("duration");
	const watchedStatus = watch("status") || "agendado";

	const watchPaymentStatus = watch("payment_status");
	const watchPaymentMethod = watch("payment_method");
	const watchPaymentAmount = watch("payment_amount");

	const isViewMode = currentMode === "view";

	return (
		<div className="space-y-6">
			{/* ── Paciente ── */}
			<div>
				<AppointmentPatientSelectionSection
					patients={patients}
					isLoading={patientsLoading}
					disabled={isViewMode || currentMode === "edit" || !!defaultPatientId}
					onCreateNew={onQuickPatientCreate}
					fallbackPatientName={
						lastCreatedPatient?.id === watchedPatientId
							? lastCreatedPatient.name
							: normalizedAppointmentPatientName?.trim()
								? normalizedAppointmentPatientName
								: selectedPatientName || undefined
					}
					fallbackDescription={
						lastCreatedPatient?.id === watchedPatientId
							? "Recém-cadastrado"
							: undefined
					}
				/>
			</div>

			{/* ── Data e Hora ── */}
			<div>
				<AppointmentDateTimeSection
					disabled={isViewMode}
					timeSlots={timeSlots}
					isCalendarOpen={isCalendarOpen}
					setIsCalendarOpen={setIsCalendarOpen}
					getMinCapacityForInterval={getMinCapacityForInterval}
					conflictCount={conflictCount}
					watchedDateStr={watchedDateStr}
					watchedTime={watchedTime}
					watchedDuration={watchedDuration}
					onAutoSchedule={onAutoSchedule}
				/>
			</div>

			{/* ── Profissional ── */}
			<div className="space-y-1.5">
				<FieldLabel>Profissional</FieldLabel>
				<Select
					value={watch("therapist_id") || THERAPIST_SELECT_NONE}
					onValueChange={(value) =>
						setValue(
							"therapist_id",
							value === THERAPIST_SELECT_NONE ? "" : value,
						)
					}
					disabled={isViewMode || therapistsLoading}
				>
					<SelectTrigger className="h-10 text-sm border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
						<SelectValue
							placeholder={
								therapistsLoading ? "Carregando..." : THERAPIST_PLACEHOLDER
							}
						/>
					</SelectTrigger>
					<SelectContent className="rounded-lg border-slate-200">
						<SelectItem value={THERAPIST_SELECT_NONE} className="text-sm">
							{THERAPIST_PLACEHOLDER}
						</SelectItem>
						{therapists.map((t) => (
							<SelectItem key={t.id} value={t.id} className="text-sm">
								{formatTherapistLabel(t)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* ── Status — pill buttons inline (padrão Stitch FisioFlow Clinical) ── */}
			<div className="space-y-1.5">
				<FieldLabel>Status</FieldLabel>
				<div className="flex flex-wrap gap-1.5">
					{Object.entries(APPOINTMENT_STATUS_CONFIG).map(([key, config]) => {
						const isActive = watchedStatus === key;
						return (
							<button
								key={key}
								type="button"
								disabled={isViewMode}
								onClick={() =>
									setValue("status", key as AppointmentFormData["status"])
								}
								className={cn(
									"inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-all duration-150 select-none",
									isActive
										? "bg-blue-600 text-white shadow-sm"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200",
									isViewMode && "cursor-default",
								)}
							>
								<span
									className={cn(
										"h-1.5 w-1.5 rounded-full shrink-0",
										isActive
											? "bg-white/80"
											: config.iconColor.replace("text-", "bg-"),
									)}
								/>
								{config.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Financeiro ── */}
			<div>
				<AppointmentPaymentTab
					disabled={isViewMode}
					watchPaymentStatus={watchPaymentStatus || "pending"}
					watchPaymentMethod={watchPaymentMethod || ""}
					watchPaymentAmount={watchPaymentAmount || 0}
					patientId={watchedPatientId}
					patientName={selectedPatientName}
				/>
			</div>

			{/* ── Observações — sempre visível ── */}
			<div className="space-y-1.5">
				<FieldLabel>Observações</FieldLabel>
				<Textarea
					{...register("notes")}
					placeholder="Anotações sobre o atendimento..."
					rows={3}
					disabled={isViewMode}
					className="resize-none text-sm border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-lg bg-white placeholder:text-slate-400 transition-colors"
				/>
			</div>
		</div>
	);
};
