import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
	Activity,
	Calendar,
	Target,
	DollarSign,
	Sparkles,
	Loader2,
	Trophy,
	Flame,
	Star,
	Award,
	Plus,
	Pencil,
	CheckCircle2,
	Brain,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { parseResponseDate } from "@/utils/dateUtils";
import { PatientHelpers } from "@/types";
import { usePatientInsight } from "@/hooks/usePatientInsight";
import { useGamification } from "@/hooks/useGamification";
import {
	useCompleteGoal,
	usePatientGoals,
	usePatientPathologies,
} from "@/hooks/usePatientEvolution";
import { MetaFormModal } from "@/components/evolution/MetaFormModal";
import { PathologyFormModal } from "@/components/evolution/PathologyFormModal";
import type { PatientGoal, Pathology } from "@/types/evolution";
import { Link } from "react-router-dom";

interface PatientDashboardProps {
	patient: {
		id?: string;
		name?: string;
		age?: number;
		profession?: string;
		phone?: string;
		email?: string;
		address?: { city?: string; state?: string };
		photoUrl?: string;
		alerts?: string[];
		isActive?: boolean;
		balance?: number;
		mainCondition?: string;
		status?: string;
		allergies?: string;
		birth_date?: string;
		birthDate?: string;
		occupation?: string;
		city?: string;
		sessions_available?: number;
	};
	appointments?: Array<{
		id?: string;
		date?: Date | string;
		appointment_date?: Date | string;
		type?: string;
		status?: string;
		notes?: string;
	}>;
	activeGoals?: Array<{
		id?: string;
		goal_title?: string;
		goal_description?: string;
		description?: string;
		targetDate?: string | Date;
		target_date?: string | Date;
	}>;
	activePathologies?: Array<{
		id?: string;
		pathology_name?: string;
		name?: string;
		diagnosedAt?: string | Date;
		diagnosis_date?: string | Date;
		status?: string;
	}>;
	surgeries?: Array<{
		name: string;
		hospital?: string;
		surgeon?: string;
		surgeryDate?: string | Date;
		notes?: string;
	}>;
	onAction?: (action: string) => void;
	currentAppointmentId?: string;
}

export const PatientDashboard360 = ({
	patient,
	appointments = [],
	activeGoals = [],
	activePathologies = [],
	surgeries = [],
	onAction = () => {},
	currentAppointmentId,
}: PatientDashboardProps) => {
	
	const patientId = patient?.id;
	const { data: fetchedGoals = [] } = usePatientGoals(patientId || "");
	const { data: fetchedPathologies = [] } = usePatientPathologies(
		patientId || "",
	);
	const completeGoal = useCompleteGoal();
	const [goalModalOpen, setGoalModalOpen] = useState(false);
	const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);
	const [pathologyModalOpen, setPathologyModalOpen] = useState(false);
	const [editingPathology, setEditingPathology] = useState<Pathology | null>(
		null,
	);

	// Gamification hook
	const { profile, unlockedAchievements, allAchievements, xpPerLevel } =
		useGamification(patientId || "");

	// Memoized data processing
	const { nextAppointment, calculatedAge, patientName } =
		useMemo(() => {
			const name = PatientHelpers.getName(patient);
			const birthDate = patient.birth_date || patient.birthDate;

			const age =
				patient.age ||
				(birthDate
					? Math.floor(
							(new Date().getTime() - new Date(birthDate).getTime()) /
								(1000 * 60 * 60 * 24 * 365.25),
						)
					: undefined);

			const current = appointments?.find((a) => a.id === currentAppointmentId);

			const next = appointments
				? [...appointments]
						.filter((a) => {
							const date = a.date || a.appointment_date;
							const status = a.status;
							return (
								new Date(date) > new Date() &&
								a.id !== currentAppointmentId &&
								status !== "cancelado" &&
								status !== "falta"
							);
						})
						.sort((a, b) => {
							const dateA = new Date(
								a.date || (a.appointment_date as string),
							).getTime();
							const dateB = new Date(
								b.date || (b.appointment_date as string),
							).getTime();
							return dateA - dateB;
						})[0]
				: null;

			return {
				nextAppointment: next,
				currentSession: current,
				calculatedAge: age,
				patientName: name,
			};
		}, [appointments, currentAppointmentId, patient]);

	const resolvedActiveGoals = useMemo(() => {
		if (fetchedGoals.length > 0) {
			return fetchedGoals
				.filter((goal) => goal.status === "em_andamento")
				.map((goal) => ({
					id: goal.id,
					goal_title: goal.goal_title,
					goal_description: goal.goal_description,
					target_date: goal.target_date,
					editableGoal: goal,
				}));
		}

		return activeGoals.map((goal, index) => ({
			id: goal.id ?? `goal-${index}`,
			goal_title: goal.goal_title ?? goal.description ?? "Meta",
			goal_description: goal.goal_description,
			target_date: goal.target_date ?? goal.targetDate,
			editableGoal: null,
		}));
	}, [activeGoals, fetchedGoals]);

	const resolvedActivePathologies = useMemo(() => {
		if (fetchedPathologies.length > 0) {
			return fetchedPathologies
				.filter((pathology) => pathology.status === "em_tratamento")
				.map((pathology) => ({
					id: pathology.id,
					pathology_name: pathology.pathology_name,
					diagnosis_date: pathology.diagnosis_date,
					editablePathology: pathology,
				}));
		}

		return activePathologies.map((pathology, index) => ({
			id: pathology.id ?? `pathology-${index}`,
			pathology_name: pathology.pathology_name ?? pathology.name ?? "Patologia",
			diagnosis_date: pathology.diagnosis_date ?? pathology.diagnosedAt,
			editablePathology: null,
		}));
	}, [activePathologies, fetchedPathologies]);

	const [insightResult, setInsightResult] = useState<string | null>(null);
	const { mutate: generateInsight, isPending: isGeneratingInsight } =
		usePatientInsight();

	// Early return after hooks
	if (!patient) return null;

	const handleGenerateInsight = () => {
		const patientData = {
			name: patientName,
			age: calculatedAge,
			mainCondition: patient.mainCondition,
			goals: resolvedActiveGoals.map((goal) => goal.goal_title),
			pathologies: resolvedActivePathologies.map(
				(pathology) => pathology.pathology_name,
			),
			recentAppointments: appointments?.slice(0, 5).map((a) => ({
				date: a.date,
				type: a.type,
				notes: a.notes,
			})),
		};

		generateInsight(patientData, {
			onSuccess: (data) => {
				setInsightResult(data.insight);
			},
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Top Section: Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-blue-100 shadow-sm bg-white overflow-hidden group">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
							<DollarSign className="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
								Saldo de Sessões
							</p>
							<div className="flex items-baseline gap-1">
								<span
									className={cn(
										"text-2xl font-bold",
										(patient.balance ?? patient.sessions_available ?? 0) <= 1
											? "text-rose-600"
											: "text-slate-900",
									)}
								>
									{patient.balance ?? patient.sessions_available ?? 0}
								</span>
								<span className="text-xs text-slate-500 font-medium">
									sessões
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-blue-100 shadow-sm bg-white overflow-hidden group">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
							<Calendar className="w-6 h-6 text-emerald-600" />
						</div>
						<div>
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
								Próximo Agendamento
							</p>
							<p className="text-sm font-bold text-slate-900 truncate">
								{nextAppointment
									? format(
											parseResponseDate(
												nextAppointment.date ||
													nextAppointment.appointment_date,
											),
											"dd/MM 'às' HH:mm",
											{ locale: ptBR },
										)
									: "Nenhum agendado"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-blue-100 shadow-sm bg-white overflow-hidden group">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
							<Activity className="w-6 h-6 text-amber-600" />
						</div>
						<div>
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
								Condição Principal
							</p>
							<p
								className="text-sm font-bold text-slate-900 truncate max-w-[150px]"
								title={patient.mainCondition}
							>
								{patient.mainCondition || "Não informada"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-blue-100 shadow-sm bg-white overflow-hidden group">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
							<Trophy className="w-6 h-6 text-purple-600" />
						</div>
						<div>
							<p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
								Nível Gamificação
							</p>
							<p className="text-sm font-bold text-slate-900">
								{profile ? `Nível ${profile.level}` : "Não iniciado"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* AI Insight Section */}
				<Card className="lg:col-span-3 border-blue-100 bg-blue-50/30 shadow-sm overflow-hidden">
					<CardContent className="p-6">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-600 rounded-lg shadow-sm shadow-blue-200">
									<Sparkles className="w-5 h-5 text-white" />
								</div>
								<div>
									<h3 className="font-bold text-slate-900">
										Resumo Inteligente (IA)
									</h3>
									<p className="text-xs text-slate-500 font-medium">
										Análise automática de tendências e histórico clínico
									</p>
								</div>
							</div>
							<Button
								size="sm"
								onClick={() => handleGenerateInsight()}
								disabled={isGeneratingInsight}
								className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
							>
								{isGeneratingInsight ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Analisando...
									</>
								) : (
									"Atualizar Análise"
								)}
							</Button>
						</div>

						{insightResult ? (
							<div className="text-sm text-slate-700 bg-white p-4 rounded-xl border border-blue-100 shadow-sm prose prose-sm max-w-none prose-p:leading-relaxed">
								<ReactMarkdown>{insightResult}</ReactMarkdown>
							</div>
						) : (
							<div className="text-center py-8 px-4 bg-white/50 rounded-xl border border-dashed border-blue-200">
								<Brain className="w-10 h-10 text-blue-200 mx-auto mb-3" />
								<p className="text-sm text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
									Ainda não há uma análise gerada. Clique no botão acima para
									que a IA processe o histórico do paciente.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Gamification Section */}
			{patientId && profile && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Level Progress */}
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl overflow-hidden">
						<CardContent className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-bold flex items-center gap-2 text-slate-800">
									<Trophy className="w-5 h-5 text-blue-500" />
									Nível {profile.level}
								</h3>
								<Badge
									variant="secondary"
									className="bg-blue-50 text-blue-700 font-bold"
								>
									{profile.current_xp || 0} XP
								</Badge>
							</div>
							<Progress
								value={
									xpPerLevel > 0
										? (((profile.current_xp || 0) % xpPerLevel) / xpPerLevel) *
											100
										: 0
								}
								className="h-2 mb-3 bg-slate-100 [&>div]:bg-blue-500"
							/>
							<p className="text-xs text-slate-500 font-medium">
								{xpPerLevel - ((profile.current_xp || 0) % xpPerLevel)} XP para
								o próximo nível
							</p>
							<Link to="/gamification" className="mt-4 block">
								<Button
									variant="outline"
									size="sm"
									className="w-full text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800 font-medium"
								>
									Ver Progresso Completo
								</Button>
							</Link>
						</CardContent>
					</Card>

					{/* Streak */}
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl overflow-hidden">
						<CardContent className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-bold flex items-center gap-2 text-slate-800">
									<Flame className="w-5 h-5 text-orange-500" />
									Sequência Atual
								</h3>
								<Badge
									variant="secondary"
									className="bg-orange-50 text-orange-700 font-bold"
								>
									{profile.current_streak || 0} dias
								</Badge>
							</div>
							<div className="flex items-center gap-2 mt-3">
								<div className="flex-1">
									<div className="flex gap-1.5">
										{[...Array(Math.min(7, 3))].map((_, i) => (
											<div
												key={i}
												className={`h-8 flex-1 rounded-md transition-colors ${i < (profile.current_streak || 0) ? "bg-orange-400" : "bg-slate-100"}`}
											/>
										))}
									</div>
								</div>
							</div>
							<p className="text-xs text-slate-500 font-medium mt-3">
								{profile.current_streak >= 3
									? "Ótimo! Continue mantendo a sequência!"
									: "Complete exercícios diários para aumentar sua sequência"}
							</p>
						</CardContent>
					</Card>

					{/* Recent Achievements */}
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl overflow-hidden">
						<CardContent className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-bold flex items-center gap-2 text-slate-800">
									<Award className="w-5 h-5 text-amber-500" />
									Conquistas
								</h3>
								<Badge
									variant="secondary"
									className="bg-amber-50 text-amber-700 font-bold"
								>
									{unlockedAchievements.length}/{allAchievements.length}
								</Badge>
							</div>
							<div className="grid grid-cols-4 gap-3 mb-4">
								{allAchievements.slice(0, 4).map((achievement) => {
									const isUnlocked = unlockedAchievements.some(
										(ua) => ua.achievement_id === achievement.id,
									);
									return (
										<div
											key={achievement.id}
											className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
												isUnlocked
													? "bg-amber-100 text-amber-500 shadow-sm"
													: "bg-slate-50 text-slate-300"
											}`}
										>
											<Star
												className="w-5 h-5"
												fill={isUnlocked ? "currentColor" : "none"}
											/>
										</div>
									);
								})}
							</div>
							<Link to="/gamification/achievements" className="block">
								<Button
									variant="outline"
									size="sm"
									className="w-full text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800 font-medium"
								>
									Ver Todas as Conquistas
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Middle Section: Goals & Pathologies */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Treatment Goals */}
				<Card className="h-full border border-blue-100 shadow-sm overflow-hidden bg-white">
					<CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/20 flex flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
							<Target className="w-4 h-4 text-blue-600" />
							Objetivos do Tratamento
						</CardTitle>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 hover:text-blue-700"
							onClick={() => {
								setEditingGoal(null);
								setGoalModalOpen(true);
							}}
							disabled={!patientId}
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							Nova meta
						</Button>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						{resolvedActiveGoals.length > 0 ? (
							<div className="space-y-3">
								{resolvedActiveGoals.map((goal) => (
									<div
										key={goal.id}
										className="flex items-start justify-between gap-3 p-3 rounded-xl border border-blue-50 bg-blue-50/10 group hover:bg-blue-50/20 transition-colors"
									>
										<div className="min-w-0">
											<p className="font-semibold text-sm text-slate-700">
												{goal.goal_title}
											</p>
											{goal.goal_description && (
												<p className="text-xs text-slate-500 mt-1 line-clamp-2">
													{goal.goal_description}
												</p>
											)}
											{goal.target_date && (
												<div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
													<Calendar className="h-3 w-3" />
													Alvo:{" "}
													{format(new Date(goal.target_date), "dd/MM/yyyy")}
												</div>
											)}
										</div>
										<div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8 text-blue-600 hover:bg-blue-100/50"
												onClick={() => {
													if (!goal.editableGoal) return;
													setEditingGoal(goal.editableGoal);
													setGoalModalOpen(true);
												}}
												disabled={!goal.editableGoal}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="h-8 w-8 text-emerald-600 hover:bg-emerald-100/50"
												onClick={() => completeGoal.mutate(goal.id)}
												disabled={!goal.editableGoal || completeGoal.isPending}
											>
												<CheckCircle2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
								<Target className="w-8 h-8 text-slate-200 mx-auto mb-2" />
								<p className="text-xs text-slate-500 font-medium">
									Nenhum objetivo ativo.
								</p>
								<Button
									variant="link"
									size="sm"
									className="text-blue-600 font-bold text-[10px] uppercase mt-1 p-0 h-auto"
									onClick={() => {
										setEditingGoal(null);
										setGoalModalOpen(true);
									}}
									disabled={!patientId}
								>
									Adicionar agora
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Pathologies */}
				<Card className="h-full border border-blue-100 shadow-sm overflow-hidden bg-white">
					<CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/20 flex flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
							<Activity className="w-4 h-4 text-blue-600" />
							Patologias Ativas
						</CardTitle>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 hover:text-blue-700"
							onClick={() => {
								setEditingPathology(null);
								setPathologyModalOpen(true);
							}}
							disabled={!patientId}
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							Nova patologia
						</Button>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						{resolvedActivePathologies.length > 0 ? (
							<div className="space-y-3">
								{resolvedActivePathologies.map((pathology) => (
									<div
										key={pathology.id}
										className="flex items-start justify-between gap-3 p-3 rounded-xl border border-blue-50 bg-blue-50/10 group hover:bg-blue-50/20 transition-colors"
									>
										<div className="min-w-0">
											<p className="font-semibold text-sm text-slate-700">
												{pathology.pathology_name}
											</p>
											<div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
												<Activity className="h-3 w-3" />
												Diagnóstico:{" "}
												{pathology.diagnosis_date
													? format(
															new Date(pathology.diagnosis_date),
															"dd/MM/yyyy",
														)
													: "N/A"}
											</div>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-blue-600 hover:bg-blue-100/50 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => {
												if (!pathology.editablePathology) {
													onAction("anamnesis");
													return;
												}
												setEditingPathology(pathology.editablePathology);
												setPathologyModalOpen(true);
											}}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
								<Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
								<p className="text-xs text-slate-500 font-medium">
									Nenhuma patologia registrada.
								</p>
								<Button
									variant="link"
									size="sm"
									className="text-blue-600 font-bold text-[10px] uppercase mt-1 p-0 h-auto"
									onClick={() => {
										setEditingPathology(null);
										setPathologyModalOpen(true);
									}}
									disabled={!patientId}
								>
									Registrar agora
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Bottom Section: Surgeries & Timeline */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Activity className="w-5 h-5 text-blue-500" />
						Histórico Cirúrgico
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="relative pl-6 border-l-2 border-muted space-y-6">
						{(surgeries || []).map((surgery, i: number) => (
							<div key={i} className="relative">
								<div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-background" />
								<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
									<div>
										<h4 className="font-semibold text-lg">{surgery.name}</h4>
										<p className="text-muted-foreground text-sm">
											{surgery.hospital} • Dr(a). {surgery.surgeon}
										</p>
									</div>
									<div className="mt-2 sm:mt-0 text-right">
										<p className="font-medium text-blue-600">
											{surgery.surgeryDate
												? format(new Date(surgery.surgeryDate), "dd MMM yyyy", {
														locale: ptBR,
													})
												: "Data não inf."}
										</p>
										{surgery.surgeryDate && (
											<p className="text-xs text-muted-foreground">
												há{" "}
												{Math.floor(
													(new Date().getTime() -
														new Date(surgery.surgeryDate).getTime()) /
														(1000 * 60 * 60 * 24 * 30),
												)}{" "}
												meses
											</p>
										)}
									</div>
								</div>
								{surgery.notes && (
									<p className="mt-2 text-sm text-foreground/80 bg-muted/30 p-3 rounded-md">
										{surgery.notes}
									</p>
								)}
							</div>
						))}
						{(!surgeries || surgeries.length === 0) && (
							<p className="text-muted-foreground text-sm italic">
								Nenhuma cirurgia registrada.
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			{patientId && (
				<MetaFormModal
					open={goalModalOpen}
					onOpenChange={(open) => {
						setGoalModalOpen(open);
						if (!open) setEditingGoal(null);
					}}
					patientId={patientId}
					goal={editingGoal}
				/>
			)}

			{patientId && (
				<PathologyFormModal
					open={pathologyModalOpen}
					onOpenChange={(open) => {
						setPathologyModalOpen(open);
						if (!open) setEditingPathology(null);
					}}
					patientId={patientId}
					pathology={editingPathology}
				/>
			)}
		</div>
	);
};
