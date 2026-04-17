import React, { memo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	ArrowLeft,
	Calendar,
	FileText,
	Zap,
	Eye,
	EyeOff,
	Save,
	Clock,
	Keyboard,
	CheckCircle2,
	UserCog,
	MoreVertical,
	Loader2,
	Brain,
	X,
} from "lucide-react";
import { EvolutionVersionToggle } from "./v2/EvolutionVersionToggle";
import type { EvolutionVersion } from "./v2/types";
import { EvolutionVersionHistoryTrigger } from "./EvolutionVersionHistory";
import type { EvolutionVersion as SoapEvolutionVersion } from "@/hooks/evolution/useEvolutionVersionHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type TherapistOption,
	THERAPIST_SELECT_NONE,
	THERAPIST_PLACEHOLDER,
	getTherapistById,
} from "@/hooks/useTherapists";
import { PatientHelpers } from "@/types";
import { parseResponseDate } from "@/utils/dateUtils";
import type { Patient, Appointment } from "@/types";
import { cn } from "@/lib/utils";

const FIRST_EVOLUTION_DISMISS_KEY =
	"fisioflow-first-evolution-header-dismissed";

export interface TabConfig {
	value: string;
	label: string;
	shortLabel: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
}

interface EvolutionHeaderProps {
	patient: Patient;
	appointment: Appointment;
	treatmentDuration: string;
	evolutionStats: {
		totalEvolutions: number;
		completedGoals: number;
		totalGoals: number;
		avgGoalProgress: number;
		activePathologiesCount: number;
		totalMeasurements: number;
		completionRate: number;
	};
	onSave: () => void;
	onComplete: () => void;
	isSaving: boolean;
	isCompleting: boolean;
	autoSaveEnabled: boolean;
	toggleAutoSave: () => void;
	lastSavedAt: Date | null;
	showInsights: boolean;
	toggleInsights: () => void;
	onShowTemplateModal: () => void;
	onShowKeyboardHelp: () => void;
	therapists?: TherapistOption[];
	selectedTherapistId?: string;
	onTherapistChange?: (therapistId: string) => void;
	previousEvolutionsCount?: number;
	// Props das abas
	tabsConfig?: TabConfig[];
	activeTab?: string;
	onTabChange?: (tab: string) => void;
	pendingRequiredMeasurements?: number;
	upcomingGoalsCount?: number;
	// Version toggle (V1 SOAP / V2 Texto Livre)
	evolutionVersion?: EvolutionVersion;
	onVersionChange?: (version: EvolutionVersion) => void;
	// Version history snapshots (Notion/Evernote-inspired)
	soapRecordId?: string;
	onRestoreVersion?: (content: SoapEvolutionVersion["content"]) => void;
}

function getPatientInitials(patient: Patient): string {
	const name = PatientHelpers.getName(patient);
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase() || "?";
}

function getSessionStartDate(appointment?: Appointment | null): Date | null {
	if (!appointment) return null;

	const appointmentDateTime = (
		appointment as Appointment & { appointment_date?: string }
	).appointment_date;

	if (appointmentDateTime) {
		const parsed = parseResponseDate(appointmentDateTime);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	const dateValue = (appointment as Appointment & { date?: string }).date;
	const startTime =
		(
			appointment as Appointment & {
				start_time?: string;
				startTime?: string;
				time?: string;
			}
		).start_time ||
		(
			appointment as Appointment & {
				start_time?: string;
				startTime?: string;
				time?: string;
			}
		).startTime ||
		(appointment as Appointment & { time?: string }).time;

	if (!dateValue) return null;

	const parsedDate = parseResponseDate(dateValue);
	if (Number.isNaN(parsedDate.getTime())) return null;

	if (startTime) {
		const [hours, minutes] = startTime.split(":");
		const parsedHours = Number(hours);
		const parsedMinutes = Number(minutes);

		if (!Number.isNaN(parsedHours) && !Number.isNaN(parsedMinutes)) {
			parsedDate.setHours(parsedHours, parsedMinutes, 0, 0);
		}
	}

	return parsedDate;
}

// Componente compacto para primeira evolução no header
const FirstEvolutionBadge = memo(() => {
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(FIRST_EVOLUTION_DISMISS_KEY);
			setDismissed(stored === "true");
		} catch {
			// ignore
		}
	}, []);

	const handleDismiss = () => {
		try {
			localStorage.setItem(FIRST_EVOLUTION_DISMISS_KEY, "true");
			setDismissed(true);
		} catch {
			// ignore
		}
	};

	if (dismissed) return null;

	return (
		<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
			<Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
			<span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
				Primeira Evolução
			</span>
			<button
				type="button"
				onClick={handleDismiss}
				className="ml-0.5 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200"
				aria-label="Dispensar"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
});

FirstEvolutionBadge.displayName = "FirstEvolutionBadge";

export const EvolutionHeader = memo(
	({
		patient,
		appointment,
		treatmentDuration,
		evolutionStats,
		onSave,
		onComplete,
		isSaving,
		isCompleting,
		autoSaveEnabled,
		toggleAutoSave,
		lastSavedAt,
		showInsights,
		toggleInsights,
		onShowTemplateModal,
		onShowKeyboardHelp,
		therapists = [],
		selectedTherapistId = "",
		onTherapistChange,
		previousEvolutionsCount = 0,
		tabsConfig = [],
		activeTab = "",
		onTabChange,
		pendingRequiredMeasurements = 0,
		upcomingGoalsCount = 0,
		evolutionVersion = "v1-soap",
		onVersionChange,
		soapRecordId,
		onRestoreVersion,
	}: EvolutionHeaderProps) => {
		const showFirstEvolution = previousEvolutionsCount === 0;
		const navigate = useNavigate();
		const selectedTherapist = selectedTherapistId
			? getTherapistById(therapists, selectedTherapistId)
			: null;
		const showTherapistFallback = Boolean(
			selectedTherapistId && !selectedTherapist,
		);
		const sessionStartDate = getSessionStartDate(appointment);

		const appointmentDateLabel = sessionStartDate
			? format(sessionStartDate, "dd/MM HH:mm", { locale: ptBR })
			: "";
		const sessionStartLabel = sessionStartDate
			? format(sessionStartDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
			: "";

		const sessionNumber = evolutionStats.totalEvolutions + 1;
		const patientAvatar = (patient as Patient & { avatar_url?: string })
			?.avatar_url;

		return (
			<div
				className="sticky top-0 z-30 rounded-xl border border-primary/10 bg-white/80 shadow-sm backdrop-blur-md p-4 transition-all duration-300"
				role="banner"
				aria-label="Cabeçalho da evolução"
			>
				{/* Linha 1: Voltar | Identidade do paciente | Ações primárias */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3 min-w-0 flex-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => navigate("/agenda")}
							className="shrink-0 h-10 w-10 hover:bg-primary/5 text-slate-400 hover:text-primary transition-colors"
							aria-label="Voltar para agenda"
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<div
							className="flex items-center gap-3 min-w-0 flex-1"
						>
							<Avatar className="h-12 w-12 shrink-0 border-2 border-white shadow-sm ring-1 ring-primary/10">
								{patientAvatar ? (
									<AvatarImage
										src={patientAvatar}
										alt={PatientHelpers.getName(patient)}
									/>
								) : null}
								<AvatarFallback className="bg-slate-50 text-primary font-bold text-sm">
									{getPatientInitials(patient)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h1 className="text-xl font-extrabold tracking-tight text-slate-800">
										{PatientHelpers.getName(patient)}
									</h1>
									<Badge
										className="text-[10px] px-2 py-0.5 shrink-0 bg-primary/5 border-primary/10 text-primary font-black uppercase tracking-wider"
									>
										Sessão #{sessionNumber}
									</Badge>
								</div>
								<div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium flex-wrap">
									{appointment?.appointment_date && (
										<span className="flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 text-primary/60" />
											{format(
												parseResponseDate(appointment.appointment_date),
												"dd/MM HH:mm",
												{ locale: ptBR },
											)}
										</span>
									)}
									<span className="flex items-center gap-1.5">
										<FileText className="h-3.5 w-3.5 text-primary/60" />
										{treatmentDuration}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Ações primárias */}
					<div className="flex items-center gap-3 shrink-0">
						{showFirstEvolution && <FirstEvolutionBadge />}
						<Button
							onClick={onSave}
							size="sm"
							variant="outline"
							disabled={isSaving}
							className="h-10 px-4 shadow-none hover:bg-slate-50 border-slate-200 text-slate-600 text-xs font-bold transition-all"
						>
							{isSaving ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Save className="h-3.5 w-3.5" />
							)}
							<span className="ml-2 uppercase tracking-wide">
								{isSaving ? "Salvando" : "Salvar"}
							</span>
						</Button>
						<Button
							onClick={onComplete}
							size="sm"
							disabled={isSaving || isCompleting}
							className="h-10 px-6 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 font-bold text-xs uppercase tracking-widest transition-all"
						>
							{isCompleting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<CheckCircle2 className="h-3.5 w-3.5" />
							)}
							<span className="ml-2">Concluir</span>
						</Button>
					</div>
				</div>

				{/* Linha 2: Cronômetro | Abas | Fisioterapeuta | Menu */}
				<div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
					{tabsConfig.length > 0 && onTabChange && (
						<nav
							className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-50/80 p-1 gap-1"
							role="tablist"
						>
							{tabsConfig.map((tab) => {
								const isActive = activeTab === tab.value;
								const badgeCount =
									tab.value === "avaliacao"
										? pendingRequiredMeasurements
										: tab.value === "tratamento"
											? upcomingGoalsCount
											: 0;

								return (
									<button
										key={tab.value}
										type="button"
										role="tab"
										aria-selected={isActive}
										onClick={() => onTabChange(tab.value)}
										className={cn(
											"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-bold transition-all",
											isActive
												? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
												: "text-slate-500 hover:text-slate-800",
										)}
									>
										<tab.icon className="h-3.5 w-3.5 shrink-0" />
										<span className="hidden sm:inline uppercase tracking-tighter">{tab.label}</span>
										<span className="sm:hidden">{tab.shortLabel}</span>
										{badgeCount > 0 && (
											<Badge
												className={cn(
													"ml-1 h-4 min-w-4 px-1 text-[9px] font-black border-none",
													tab.value === "avaliacao" ? "bg-orange-500 text-white" : "bg-primary text-white"
												)}
											>
												{badgeCount}
											</Badge>
										)}
									</button>
								);
							})}
						</nav>
					)}

					<div className="h-6 w-px bg-slate-100 shrink-0 hidden sm:block" />

					{/* Fisioterapeuta */}
					{onTherapistChange && (
						<div className="flex items-center gap-2 shrink-0">
							<Select
								value={selectedTherapistId || THERAPIST_SELECT_NONE}
								onValueChange={(v) =>
									onTherapistChange(v === THERAPIST_SELECT_NONE ? "" : v)
								}
							>
								<SelectTrigger className="h-9 w-[180px] text-xs font-bold bg-white/50 border-slate-200 shadow-none hover:border-primary/30 transition-all text-slate-600">
									<div className="flex items-center gap-2 truncate">
										<UserCog className="h-3.5 w-3.5 text-primary/60 shrink-0" />
										<SelectValue placeholder={THERAPIST_PLACEHOLDER} />
									</div>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={THERAPIST_SELECT_NONE}>
										{THERAPIST_PLACEHOLDER}
									</SelectItem>
									{therapists.map((t) => (
										<SelectItem key={t.id} value={t.id} className="text-xs font-medium">
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="flex-1 min-w-4" />
					<div className="flex items-center gap-1 shrink-0">
						{onRestoreVersion && (
							<EvolutionVersionHistoryTrigger
								soapRecordId={soapRecordId}
								onRestore={onRestoreVersion}
							/>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 shrink-0"
									aria-label="Mais opções"
									title="Mais opções"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuItem onClick={onShowTemplateModal}>
									<Zap className="h-4 w-4 mr-2" />
									Aplicar template
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => navigate(`/patients/${patient.id}`)}
								>
									<Eye className="h-4 w-4 mr-2" />
									Ver perfil do paciente
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onShowKeyboardHelp}>
									<Keyboard className="h-4 w-4 mr-2" />
									Atalhos de teclado
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuCheckboxItem
									checked={showInsights}
									onCheckedChange={() => toggleInsights()}
								>
									{showInsights ? (
										<EyeOff className="h-4 w-4 mr-2" />
									) : (
										<Eye className="h-4 w-4 mr-2" />
									)}
									Mostrar resumo na página
								</DropdownMenuCheckboxItem>
								<DropdownMenuCheckboxItem
									checked={autoSaveEnabled}
									onCheckedChange={() => toggleAutoSave()}
								>
									<Save className="h-4 w-4 mr-2" />
									Auto-salvar
								</DropdownMenuCheckboxItem>
								{lastSavedAt && autoSaveEnabled && (
									<>
										<DropdownMenuSeparator />
										<div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
											<Clock className="h-3.5 w-3.5" />
											Último salvamento: {format(lastSavedAt, "HH:mm")}
										</div>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// OTIMIZAÇÃO: Comparação personalizada para evitar re-renders desnecessários
		// Retorna true se as props relevantes não mudaram (não precisa re-renderizar)
		return (
			prevProps.patient === nextProps.patient &&
			prevProps.appointment === nextProps.appointment &&
			prevProps.treatmentDuration === nextProps.treatmentDuration &&
			prevProps.isSaving === nextProps.isSaving &&
			prevProps.isCompleting === nextProps.isCompleting &&
			prevProps.autoSaveEnabled === nextProps.autoSaveEnabled &&
			prevProps.lastSavedAt === nextProps.lastSavedAt &&
			prevProps.showInsights === nextProps.showInsights &&
			prevProps.activeTab === nextProps.activeTab &&
			prevProps.previousEvolutionsCount === nextProps.previousEvolutionsCount &&
			prevProps.pendingRequiredMeasurements ===
				nextProps.pendingRequiredMeasurements &&
			prevProps.upcomingGoalsCount === nextProps.upcomingGoalsCount &&
			// Comparação rasa de evolutionStats (objeto muda pouco durante sessão)
			prevProps.evolutionStats.totalEvolutions ===
				nextProps.evolutionStats.totalEvolutions &&
			prevProps.evolutionStats.completedGoals ===
				nextProps.evolutionStats.completedGoals &&
			prevProps.evolutionStats.totalGoals ===
				nextProps.evolutionStats.totalGoals &&
			prevProps.evolutionVersion === nextProps.evolutionVersion &&
			prevProps.soapRecordId === nextProps.soapRecordId
		);
	},
);

EvolutionHeader.displayName = "EvolutionHeader";
