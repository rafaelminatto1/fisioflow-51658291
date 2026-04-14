import React from "react";
import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MagicTextarea } from "@/components/ai/MagicTextarea";
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
import { Briefcase, MessageSquare, Info, User, ChevronRight } from "lucide-react";

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
 * Reusable Section Header for consistent look
 */
const SectionHeader = ({ 
	icon: Icon, 
	title, 
	subtitle, 
	colorClass = "blue" 
}: { 
	icon: any; 
	title: string; 
	subtitle: string;
	colorClass?: "blue" | "slate" | "emerald" | "amber";
}) => {
	const colors = {
		blue: { bg: "bg-blue-50", icon: "text-blue-600", hover: "group-hover:bg-blue-100" },
		slate: { bg: "bg-slate-50", icon: "text-slate-600", hover: "group-hover:bg-slate-100" },
		emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", hover: "group-hover:bg-emerald-100" },
		amber: { bg: "bg-amber-50", icon: "text-amber-600", hover: "group-hover:bg-amber-100" },
	};

	const style = colors[colorClass] || colors.blue;

	return (
		<div className="flex items-center gap-3 mb-1">
			<div className={cn("p-2 rounded-xl transition-colors duration-300", style.bg, style.hover)}>
				<Icon className={cn("h-4 w-4", style.icon)} />
			</div>
			<div className="flex flex-col">
				<h3 className="text-[13px] font-bold text-slate-800 leading-none">{title}</h3>
				<p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold opacity-80">{subtitle}</p>
			</div>
		</div>
	);
};

/**
 * Label padrão de campo com ícone opcional.
 */
const FieldLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) => (
	<span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1.5 mb-2.5">
		{Icon && <Icon className="h-3.5 w-3.5 text-slate-400/80" />}
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
	const { setValue, watch } = methods;

	const watchedPatientId = watch("patient_id");
	const watchedDateStr = watch("appointment_date");
	const watchedTime = watch("appointment_time");
	const watchedDuration = watch("duration");
	const watchedStatus = watch("status") || "agendado";

	const watchPaymentStatus = watch("payment_status");
	const watchPaymentMethod = watch("payment_method");
	const watchPaymentAmount = watch("payment_amount");

	const isViewMode = currentMode === "view";

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1
			}
		}
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
	};

	return (
		<motion.div 
			className="grid grid-cols-1 lg:grid-cols-12 gap-8"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			{/* ── Coluna Esquerda (Identidade e Observações) ── */}
			<div className="lg:col-span-7 space-y-6">
				{/* Seção de Paciente */}
				<motion.section 
					variants={itemVariants}
					className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 group"
				>
					<SectionHeader 
						icon={User} 
						title="Paciente" 
						subtitle="Identificação do Atendimento" 
						colorClass="blue" 
					/>

					<AppointmentPatientSelectionSection
						patients={patients}
						isLoading={patientsLoading}
						disabled={isViewMode || currentMode === "edit" || !!defaultPatientId}
						onCreateNew={onQuickPatientCreate}
						inline={true}
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
				</motion.section>

				{/* Observações */}
				<motion.div 
					variants={itemVariants}
					className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-200 group"
				>
					<SectionHeader 
						icon={MessageSquare} 
						title="Observações" 
						subtitle="Notas e Evolução" 
						colorClass="slate" 
					/>

					<div className="relative group/textarea">
						<MagicTextarea
							value={watch("notes") || ""}
							onValueChange={(val) => setValue("notes", val)}
							placeholder="Descreva detalhes importantes, queixas ou condutas..."
							rows={10}
							disabled={isViewMode}
							className="resize-none text-sm border-slate-100 focus-visible:ring-4 focus-visible:ring-blue-500/5 focus-visible:border-blue-500/50 rounded-2xl bg-slate-50/30 placeholder:text-slate-400 transition-all leading-relaxed"
						/>
						<div className="absolute bottom-4 right-4 opacity-0 group-hover/textarea:opacity-100 transition-all duration-300 transform translate-y-1 group-hover/textarea:translate-y-0 pointer-events-none">
							<span className="text-[10px] font-bold text-slate-500 bg-white shadow-sm px-2.5 py-1.5 rounded-lg border border-slate-100">
								{watch("notes")?.length || 0} caracteres
							</span>
						</div>
					</div>
				</motion.div>
			</div>

			{/* ── Coluna Direita (Agendamento, Profissional, Status e Financeiro) ── */}
			<div className="lg:col-span-5 space-y-6">
				{/* Card Principal de Agendamento */}
				<motion.div 
					variants={itemVariants}
					className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-200"
				>
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

					<div className="pt-6 border-t border-slate-100 space-y-6">
						<div className="space-y-3">
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
								<SelectTrigger className="h-11 text-sm border-slate-100 bg-slate-50/40 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all">
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

						{/* Status */}
						<div className="space-y-3">
							<FieldLabel icon={Info}>Status do Agendamento</FieldLabel>
							<Select
								value={watchedStatus}
								onValueChange={(value) =>
									setValue("status", value as AppointmentFormData["status"])
								}
								disabled={isViewMode}
							>
								<SelectTrigger className={cn(
									"h-11 text-sm border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all",
									"bg-slate-50/40"
								)}>
									<SelectValue placeholder="Selecione o status" />
								</SelectTrigger>
								<SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-[300px]">
									{Object.entries(APPOINTMENT_STATUS_CONFIG).map(([key, config]) => (
										<SelectItem key={key} value={key} className="text-sm py-2.5">
											<div className="flex items-center gap-3">
												<div className={cn(
													"h-2.5 w-2.5 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-125",
													config.iconColor.replace("text-", "bg-")
												)} />
												<span className="font-semibold text-slate-700">{config.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</motion.div>

				{/* Seção Financeiro */}
				<motion.div 
					variants={itemVariants}
					className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-100 group"
				>
					<SectionHeader 
						icon={Info} 
						title="Financeiro" 
						subtitle="Controle de Pagamento" 
						colorClass="emerald" 
					/>
					
					<AppointmentPaymentTab
						disabled={isViewMode}
						watchPaymentStatus={watchPaymentStatus || "pending"}
						watchPaymentMethod={watchPaymentMethod || ""}
						watchPaymentAmount={watchPaymentAmount || 0}
						patientId={watchedPatientId}
						patientName={selectedPatientName}
					/>
				</motion.div>
			</div>
		</motion.div>
	);
};
