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
import { Briefcase, MessageSquare, Info } from "lucide-react";

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
					<div className="relative group">
						<Textarea
							{...register("notes")}
							placeholder="Digite aqui anotações importantes para este atendimento..."
							rows={14}
							disabled={isViewMode}
							className="resize-none text-sm border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl bg-white placeholder:text-slate-400 transition-all shadow-sm"
						/>
						<div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							<span className="text-[10px] text-slate-400 bg-white/80 px-2 py-1 rounded-md border border-slate-100">
								{watch("notes")?.length || 0} caracteres
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* ── Coluna Direita (Detalhes: Data, Profissional, Status, Financeiro) ── */}
			<div className="lg:col-span-5 space-y-6">
				{/* Card de Configuração de Tempo e Profissional */}
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

					<div className="pt-5 border-t border-slate-50 space-y-6">
						<div>
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

						{/* NOVO: Status como Dropdown conforme solicitado */}
						<div>
							<FieldLabel icon={Info}>Status do Agendamento</FieldLabel>
							<Select
								value={watchedStatus}
								onValueChange={(value) =>
									setValue("status", value as AppointmentFormData["status"])
								}
								disabled={isViewMode}
							>
								<SelectTrigger className={cn(
									"h-11 text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
									"bg-slate-50/30"
								)}>
									<div className="flex items-center gap-2">
										<div className={cn(
											"h-2 w-2 rounded-full shrink-0",
											APPOINTMENT_STATUS_CONFIG[watchedStatus as keyof typeof APPOINTMENT_STATUS_CONFIG]?.iconColor.replace("text-", "bg-") || "bg-slate-300"
										)} />
										<SelectValue placeholder="Selecione o status" />
									</div>
								</SelectTrigger>
								<SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-[300px]">
									{Object.entries(APPOINTMENT_STATUS_CONFIG).map(([key, config]) => (
										<SelectItem key={key} value={key} className="text-sm py-2.5">
											<div className="flex items-center gap-3">
												<div className={cn(
													"h-2.5 w-2.5 rounded-full shrink-0",
													config.iconColor.replace("text-", "bg-")
												)} />
												<span className="font-medium">{config.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Seção Financeiro */}
				<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
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
