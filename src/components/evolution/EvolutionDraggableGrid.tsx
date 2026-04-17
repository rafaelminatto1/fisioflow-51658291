import React, { useState, useCallback, useMemo } from "react";
import { SmartTextarea } from "@/components/ui/SmartTextarea";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
	User,
	Eye,
	Brain,
	ClipboardList,
	Sparkles,
	Copy,
	Activity,
	TrendingDown,
	TrendingUp,
	ChevronUp,
	ChevronDown,
	ImageIcon,
	Dumbbell,
	House,
	History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PainScaleWidget } from "@/components/evolution/PainScaleWidget";
import {
	calculatePainTrend,
	type PainHistory,
	type PainScaleData,
} from "@/lib/evolution/painScale";
import { MeasurementForm } from "@/components/evolution/MeasurementForm";
import { ExerciseBlockWidget } from "@/components/evolution/ExerciseBlockWidget";
import { HomeCareWidget } from "@/components/evolution/HomeCareWidget";
import { SessionExercise } from "@/components/evolution/SessionExercisesPanel";
import { SessionImageUpload } from "@/components/evolution/SessionImageUpload";
import { formatClinicalSummary, tryParseJSON } from "@/lib/evolution/formatters";

// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

export interface SOAPData {
	subjective: string;
	objective: string;
	assessment: string;
	plan: string;
}

export interface PreviousEvolution {
	id: string;
	created_at?: string;
	record_date?: string;
	pain_level?: number;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
}

export interface RequiredMeasurement {
	id: string;
	pathology_name: string;
	measurement_name: string;
	measurement_unit?: string;
	alert_level: "high" | "medium" | "low";
	instructions?: string;
}

interface SOAPSection {
	key: keyof SOAPData;
	label: string;
	shortLabel: string;
	icon: React.ComponentType<{ className?: string }>;
	placeholder: string;
	color: string;
	bgColor: string;
	borderColor: string;
}

const SOAP_SECTIONS: Readonly<SOAPSection[]> = [
	{
		key: "subjective",
		label: "Subjetivo",
		shortLabel: "S",
		icon: User,
		placeholder: "Relato do paciente, sintomas, dor, sono, estresse...",
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-500/5",
		borderColor: "border-blue-500/20",
	},
	{
		key: "objective",
		label: "Objetivo",
		shortLabel: "O",
		icon: Eye,
		placeholder: "Exame físico, ADM, força, testes especiais...",
		color: "text-emerald-600 dark:text-emerald-400",
		bgColor: "bg-emerald-500/5",
		borderColor: "border-emerald-500/20",
	},
	{
		key: "assessment",
		label: "Avaliação",
		shortLabel: "A",
		icon: Brain,
		placeholder: "Análise do progresso, resposta ao tratamento...",
		color: "text-purple-600 dark:text-purple-400",
		bgColor: "bg-purple-500/5",
		borderColor: "border-purple-500/20",
	},
	{
		key: "plan",
		label: "Plano",
		shortLabel: "P",
		icon: ClipboardList,
		placeholder: "Conduta, exercícios, plano para próxima visita...",
		color: "text-amber-600 dark:text-amber-400",
		bgColor: "bg-amber-500/5",
		borderColor: "border-amber-500/20",
	},
];

// ============================================================================================
// BENTO WIDGET COMPONENT (Replaces GridWidget for "No-Line" design)
// ============================================================================================
interface BentoWidgetProps {
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	headerClassName?: string;
	extraHeaderContent?: React.ReactNode;
	variant?: "default" | "subtle" | "accent";
}

const BentoWidget = ({
	title,
	icon,
	children,
	className,
	headerClassName,
	extraHeaderContent,
	variant = "default",
}: BentoWidgetProps) => (
	<Card
		className={cn(
			"rounded-[2.5rem] border-none shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col transition-all duration-300",
			variant === "default" && "bg-white dark:bg-slate-900",
			variant === "subtle" && "bg-slate-50/50 dark:bg-slate-950/30",
			variant === "accent" && "bg-primary/5 dark:bg-primary/10",
			className
		)}
	>
		<div className={cn("px-6 pt-4 pb-2.5 flex items-center justify-between", headerClassName)}>
			<div className="flex items-center gap-3">
				{icon && <div className="p-2 rounded-2xl bg-white/50 dark:bg-slate-800/50 shadow-sm">{icon}</div>}
				<h4 className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
					{title}
				</h4>
			</div>
			{extraHeaderContent}
		</div>
		<CardContent className="flex-1 p-0 flex flex-col">{children}</CardContent>
	</Card>
);

// ============================================================================================
// SOAP SECTION WIDGET
// ============================================================================================
interface SOAPSectionWidgetProps {
	section: SOAPSection;
	value: string;
	onChange: (key: keyof SOAPData, value: string) => void;
	disabled: boolean;
	onAISuggest?: (section: keyof SOAPData) => void;
	onCopyLast?: (section: keyof SOAPData) => void;
}

const SOAPSectionWidget = React.memo(
	({ section, value, onChange, disabled, onAISuggest, onCopyLast }: SOAPSectionWidgetProps) => {
		const wordCount = useMemo(() => value.split(/\s+/).filter((w) => w.length > 0).length, [value]);

		return (
			<BentoWidget
				title={section.label}
				icon={<section.icon className={cn("h-4 w-4", section.color)} />}
				className="h-full"
				extraHeaderContent={
					<div className="flex gap-1.5">
						{onAISuggest && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors"
										onClick={() => onAISuggest(section.key)}
										disabled={disabled}
									>
										<Sparkles className="h-3.5 w-3.5 text-primary" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom">Sugestão de IA</TooltipContent>
							</Tooltip>
						)}
						{onCopyLast && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-xl hover:bg-slate-100 transition-colors"
										onClick={() => onCopyLast(section.key)}
										disabled={disabled}
									>
										<Copy className="h-3.5 w-3.5 text-slate-400" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom">Copiar da última sessão</TooltipContent>
							</Tooltip>
						)}
					</div>
				}
			>
				<div className="flex-1 flex flex-col px-4">
					<SmartTextarea
						value={value}
						onChange={(e) => onChange(section.key, e.target.value)}
						placeholder={section.placeholder}
						disabled={disabled}
						variant="ghost"
						className="flex-1 px-5 py-2 text-base font-medium bg-transparent border-none focus-visible:ring-0"
						showStats={false}
						compact={true}
					/>
					<div className="px-5 py-2.5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 dark:border-slate-800/50">
						<span className="flex items-center gap-2">
							<span className={cn("w-1 h-1 rounded-full", section.color.replace("text-", "bg-"))} />
							{wordCount} palavras
						</span>
						<span className="opacity-40">{section.shortLabel}</span>
					</div>
				</div>
			</BentoWidget>
		);
	}
);

// ============================================================================================
// CLINICAL HISTORY HELPERS
// ============================================================================================
const ClinicalHistorySummary = ({ text }: { text?: string }) => {
	const summary = formatClinicalSummary(text);

	if (Array.isArray(summary)) {
		return (
			<div className="flex flex-col gap-1.5">
				{summary.map((item) => (
					<div key={item.label} className="flex items-start gap-2">
						<span className="text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[70px] mt-0.5">
							{item.label}:
						</span>
						<span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
							{item.value}
						</span>
					</div>
				))}
			</div>
		);
	}

	return (
		<p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic">
			{summary || "Sem resumo disponível."}
		</p>
	);
};

// ============================================================================================
// MAIN EVOLUTION GRID
// ============================================================================================
interface EvolutionDraggableGridProps {
	soapData: SOAPData;
	onSoapChange: (data: SOAPData) => void;
	painScaleData: PainScaleData;
	onPainScaleChange: (data: PainScaleData) => void;
	painHistory?: PainHistory[];
	showPainTrend?: boolean;
	onAISuggest?: (section: keyof SOAPData) => void;
	onCopyLast?: (section: keyof SOAPData) => void;
	disabled?: boolean;
	className?: string;
	patientId?: string;
	soapRecordId?: string;
	requiredMeasurements?: RequiredMeasurement[];
	exercises?: SessionExercise[];
	onExercisesChange?: (exercises: SessionExercise[]) => void;
	onSuggestExercises?: () => void;
	onRepeatLastSession?: () => void;
	lastSessionExercises?: SessionExercise[];
	patientPhone?: string;
	previousEvolutions?: PreviousEvolution[];
	onCopyLastEvolution?: (evolution: PreviousEvolution) => void;
}

export const EvolutionDraggableGrid: React.FC<EvolutionDraggableGridProps> = ({
	soapData,
	onSoapChange,
	painScaleData,
	onPainScaleChange,
	painHistory,
	showPainTrend = true,
	onAISuggest,
	onCopyLast,
	disabled = false,
	className,
	patientId,
	soapRecordId,
	requiredMeasurements = [],
	exercises = [],
	onExercisesChange,
	onSuggestExercises,
	onRepeatLastSession,
	lastSessionExercises = [],
	patientPhone,
	previousEvolutions = [],
	onCopyLastEvolution,
}) => {
	const [showPainDetails, setShowPainDetails] = useState(false);

	const trend = useMemo(() => {
		if (!painHistory) return null;
		return calculatePainTrend(painHistory, painScaleData.level);
	}, [painHistory, painScaleData.level]);

	const handleSoapFieldChange = useCallback(
		(key: keyof SOAPData, value: string) => {
			onSoapChange({ ...soapData, [key]: value });
		},
		[onSoapChange, soapData]
	);

	return (
		<TooltipProvider>
			<div className={cn("grid grid-cols-1 md:grid-cols-12 gap-6 pb-12", className)}>
				{/* ROW 1: Pain & Exercises */}
				<div className="md:col-span-4 h-full min-h-[300px]">
					<BentoWidget
						title="Pain Level (EVA)"
						icon={<Activity className="h-4 w-4 text-rose-500" />}
						extraHeaderContent={
							<div className="flex items-center gap-2">
								{showPainTrend && trend && (
									<Badge
										variant="outline"
										className={cn(
											"text-[9px] font-black uppercase px-2 h-6 border-none",
											trend.direction === "down" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
										)}
									>
										{trend.direction === "down" ? (
											<TrendingDown className="h-3 w-3 mr-1" />
										) : (
											<TrendingUp className="h-3 w-3 mr-1" />
										)}
										{trend.label}
									</Badge>
								)}
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-xl"
									onClick={() => setShowPainDetails(!showPainDetails)}
								>
									{showPainDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
								</Button>
							</div>
						}
					>
						<div className="p-6 pt-2 h-full">
							<PainScaleWidget
								value={painScaleData}
								onChange={onPainScaleChange}
								hideHeader={true}
								showDetails={showPainDetails}
								disabled={disabled}
								className="border-none shadow-none p-0 bg-transparent"
							/>
						</div>
					</BentoWidget>
				</div>

				<div className="md:col-span-8 h-full min-h-[300px]">
					<BentoWidget
						title="Session Exercises"
						icon={<Dumbbell className="h-4 w-4 text-primary" />}
					>
						<div className="h-full px-4 overflow-hidden">
							<ExerciseBlockWidget
								exercises={exercises}
								onChange={onExercisesChange || (() => {})}
								onSuggest={onSuggestExercises}
								onRepeatLastSession={onRepeatLastSession}
								hasLastSession={lastSessionExercises.length > 0}
								disabled={disabled}
							/>
						</div>
					</BentoWidget>
				</div>

				{/* ROW 2: SOAP FIELDS (Grid 2x2 on desktop) */}
				{SOAP_SECTIONS.map((section) => (
					<div key={section.key} className="md:col-span-6 h-[340px]">
						<SOAPSectionWidget
							section={section}
							value={soapData[section.key]}
							onChange={handleSoapFieldChange}
							disabled={disabled}
							onAISuggest={onAISuggest}
							onCopyLast={onCopyLast}
						/>
					</div>
				))}

				{/* ROW 3: Measurements & Home Care */}
				<div className="md:col-span-6 h-full min-h-[400px]">
					<BentoWidget
						title="Clinical Measurements"
						icon={<Activity className="h-4 w-4 text-emerald-500" />}
					>
						<div className="p-4 pt-0 h-full overflow-auto">
							<MeasurementForm
								patientId={patientId || ""}
								soapRecordId={soapRecordId}
								requiredMeasurements={requiredMeasurements}
							/>
						</div>
					</BentoWidget>
				</div>

				<div className="md:col-span-6 h-full min-h-[400px]">
					<BentoWidget
						title="Home Care Guide"
						icon={<House className="h-4 w-4 text-amber-500" />}
					>
						<div className="p-4 pt-0 h-full overflow-auto">
							<HomeCareWidget
								patientId={patientId || ""}
								patientPhone={patientPhone}
								disabled={disabled}
							/>
						</div>
					</BentoWidget>
				</div>

				{/* ROW 4: History & Media */}
				<div className="md:col-span-6 h-full min-h-[350px]">
					<BentoWidget
						title="Clinical History"
						icon={<History className="h-4 w-4 text-blue-500" />}
						extraHeaderContent={
							previousEvolutions.length > 0 && onCopyLastEvolution && (
								<Button
									variant="subtle"
									size="sm"
									className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
									onClick={() => onCopyLastEvolution(previousEvolutions[0])}
									disabled={disabled}
								>
									<Copy className="h-3 w-3 mr-2" /> Replicate Last
								</Button>
							)
						}
					>
						<div className="p-6 pt-0 h-full overflow-auto">
							{previousEvolutions.length > 0 ? (
								<div className="space-y-4">
									{previousEvolutions.slice(0, 5).map((evolution, idx) => (
										<div
											key={evolution.id}
											className="group p-4 rounded-[1.5rem] bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-100"
											onClick={() => onCopyLastEvolution?.(evolution)}
										>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
														{previousEvolutions.length - idx}
													</div>
													<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
														{new Date(evolution.created_at || evolution.record_date || "").toLocaleDateString("pt-BR")}
													</p>
												</div>
												<Copy className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
											<div className="mt-1">
												<ClinicalHistorySummary 
													text={evolution.subjective || evolution.objective || evolution.assessment} 
												/>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-20">
									<History className="h-12 w-12 mb-3" />
									<p className="text-xs font-bold">No history found.</p>
								</div>
							)}
						</div>
					</BentoWidget>
				</div>

				<div className="md:col-span-6 h-full min-h-[350px]">
					<BentoWidget
						title="Session Media"
						icon={<ImageIcon className="h-4 w-4 text-purple-500" />}
					>
						<div className="h-full px-4 pt-0">
							<SessionImageUpload
								patientId={patientId || ""}
								soapRecordId={soapRecordId}
								maxFiles={5}
							/>
						</div>
					</BentoWidget>
				</div>
			</div>
		</TooltipProvider>
	);
};
