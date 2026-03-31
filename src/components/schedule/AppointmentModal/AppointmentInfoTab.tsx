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
import { User, Briefcase, MessageSquare, Info } from "lucide-react";

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
 * Label padrão de campo com ícone opcional.
 */
const FieldLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) => (
	<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
		{Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
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
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
			{/* ── Coluna Esquerda (Principal: Paciente e Notas) ── */}
			<div className="lg:col-span-7 space-y-8">
				<section className="bg-slate-50/50 rounded-2xl p-1 border border-transparent">
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
				</section>

				<div className="space-y-2">
					<FieldLabel icon={MessageSquare}>Observações do Atendimento</FieldLabel>
					<Textarea
						{...register("notes")}
						placeholder="Digite aqui anotações importantes para este atendimento..."
						rows={10}
						disabled={isViewMode}
						className="resize-none text-sm border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl bg-white placeholder:text-slate-400 transition-all shadow-sm"
					/>
				</div>
			</div>

			{/* ── Coluna Direita (Detalhes: Data, Profissional, Status, Financeiro) ── */}
			<div className="lg:col-span-5 space-y-8">
				{/* Seção Data e Hora */}
				<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
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

					<div className="pt-4 border-t border-slate-50">
						<FieldLabel icon={Briefcase}>Profissional Responsável</FieldLabel>
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
							<SelectTrigger className="h-11 text-sm border-slate-200 bg-slate-50/30 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
								<SelectValue
									placeholder={
										therapistsLoading ? "Carregando..." : THERAPIST_PLACEHOLDER
									}
								/>
							</SelectTrigger>
							<SelectContent className="rounded-xl border-slate-200 shadow-xl">
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
				</div>

				{/* Seção Status */}
				<div className="space-y-3">
					<FieldLabel icon={Info}>Status do Agendamento</FieldLabel>
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
										"flex items-center gap-2 px-3 h-10 rounded-xl text-xs font-semibold transition-all duration-200 border",
										isActive
											? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20"
											: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm",
										isViewMode && "cursor-default",
									)}
								>
									<span
										className={cn(
											"h-2 w-2 rounded-full shrink-0",
											isActive
												? "bg-white"
												: config.iconColor.replace("text-", "bg-"),
										)}
									/>
									<span className="truncate">{config.label}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Seção Financeiro */}
				<div className="pt-2">
					<AppointmentPaymentTab
						disabled={isViewMode}
						watchPaymentStatus={watchPaymentStatus || "pending"}
						watchPaymentMethod={watchPaymentMethod || ""}
						watchPaymentAmount={watchPaymentAmount || 0}
						patientId={watchedPatientId}
						patientName={selectedPatientName}
					/>
				</div>
			</div>
		</div>
	);
};
