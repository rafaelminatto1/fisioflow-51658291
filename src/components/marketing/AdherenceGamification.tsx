/**
 * Treatment Adherence Gamification Component
 *
 * Gamification system to encourage patients to complete their treatment plans
 */

import React, { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
	Trophy,
	Award,
	Target,
	Gift,
	Crown,
	Sparkles,
	Save,
	Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RewardType = "badge" | "points" | "discount" | "free_session" | "product";

interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string;
	requirement: number;
	type: "sessions" | "streak" | "attendance" | "early_arrival" | "exercises";
	reward: {
		type: RewardType;
		value: number | string;
	};
}

interface GamificationConfig {
	enabled: boolean;
	pointsPerSession: number;
	pointsPerStreakDay: number;
	earlyArrivalBonus: number;
	homeExerciseCompletion: number;
	achievements: Achievement[];
	rewardsEnabled: boolean;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
	{
		id: "first_session",
		title: "Primeira Sessão",
		description: "Complete sua primeira sessão de fisioterapia",
		icon: "🎯",
		requirement: 1,
		type: "sessions",
		reward: { type: "points", value: 100 },
	},
	{
		id: "streak_3",
		title: "Consistente",
		description: "Complete 3 sessões consecutivas sem faltar",
		icon: "🔥",
		requirement: 3,
		type: "streak",
		reward: { type: "badge", value: "Consistente" },
	},
	{
		id: "streak_7",
		title: "Dedicação Total",
		description: "7 sessões consecutivas sem falta",
		icon: "⭐",
		requirement: 7,
		type: "streak",
		reward: { type: "points", value: 200 },
	},
	{
		id: "sessions_10",
		title: "Em Movimento",
		description: "Complete 10 sessões do tratamento",
		icon: "🏃",
		requirement: 10,
		type: "sessions",
		reward: { type: "discount", value: "10%" },
	},
	{
		id: "perfect_attendance_month",
		title: "Presença Perfeita",
		description: "Não falte nenhuma sessão durante um mês",
		icon: "📅",
		requirement: 4,
		type: "attendance",
		reward: { type: "free_session", value: 1 },
	},
	{
		id: "early_bird",
		title: "Pontual",
		description: "Chegue 5 vezes adiantado às sessões",
		icon: "⏰",
		requirement: 5,
		type: "early_arrival",
		reward: { type: "points", value: 50 },
	},
	{
		id: "exercises_warrior",
		title: "Guerreiro dos Exercícios",
		description: "Complete exercícios de casa por 30 dias",
		icon: "💪",
		requirement: 30,
		type: "exercises",
		reward: { type: "product", value: "Bandas elásticas" },
	},
	{
		id: "sessions_20",
		title: "Meio Caminho",
		description: "Complete 20 sessões do tratamento",
		icon: "🏆",
		requirement: 20,
		type: "sessions",
		reward: { type: "badge", value: "Meio Caminho" },
	},
];

const LEVELS = [
	{ name: "Iniciante", minPoints: 0, icon: "🌱" },
	{ name: "Dedicado", minPoints: 500, icon: "🌿" },
	{ name: "Consistente", minPoints: 1000, icon: "🌳" },
	{ name: "Focado", minPoints: 2000, icon: "💪" },
	{ name: "Determinado", minPoints: 3500, icon: "⭐" },
	{ name: "Campeão", minPoints: 5000, icon: "🏆" },
	{ name: "Lenda", minPoints: 7500, icon: "👑" },
];

export function AdherenceGamification() {
	const [config, setConfig] = useState<GamificationConfig>({
		enabled: true,
		pointsPerSession: 50,
		pointsPerStreakDay: 25,
		earlyArrivalBonus: 10,
		homeExerciseCompletion: 15,
		achievements: DEFAULT_ACHIEVEMENTS,
		rewardsEnabled: true,
	});

	const [patientStats, _setPatientStats] = useState({
		totalPoints: 1250,
		currentStreak: 5,
		longestStreak: 12,
		completedSessions: 18,
		missedSessions: 2,
		onTimeArrivals: 15,
		completedExercisesDays: 22,
		unlockedAchievements: 4,
	});

	const getCurrentLevel = () => {
		for (let i = LEVELS.length - 1; i >= 0; i--) {
			if (patientStats.totalPoints >= LEVELS[i].minPoints) {
				return LEVELS[i];
			}
		}
		return LEVELS[0];
	};

	const getNextLevel = () => {
		const currentLevelIndex = LEVELS.findIndex(
			(l) => l.name === getCurrentLevel().name,
		);
		return LEVELS[currentLevelIndex + 1] || LEVELS[currentLevelIndex];
	};

	const currentLevel = getCurrentLevel();
	const nextLevel = getNextLevel();
	const progressToNext = nextLevel
		? ((patientStats.totalPoints - currentLevel.minPoints) /
				(nextLevel.minPoints - currentLevel.minPoints)) *
			100
		: 100;

	const saveConfig = () => {
		// In production, save to database
		toast.success("Configurações salvas com sucesso!");
	};

	const getRewardLabel = (reward: Achievement["reward"]) => {
		switch (reward.type) {
			case "points":
				return `+${reward.value} pontos`;
			case "badge":
				return `Badge: ${reward.value}`;
			case "discount":
				return `Desconto de ${reward.value}`;
			case "free_session":
				return `${reward.value} sessão grátis`;
			case "product":
				return `Produto: ${reward.value}`;
			default:
				return "Recompensa";
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold flex items-center gap-2">
					<Trophy className="h-6 w-6 text-amber-500" />
					Gamificação de Adesão
				</h2>
				<p className="text-muted-foreground">
					Sistema de pontos e conquistas para engajar pacientes
				</p>
			</div>

			{/* Patient Level Preview */}
			<Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-900">
				<CardContent className="p-6">
					<div className="flex items-center gap-6">
						<div className="text-6xl">{currentLevel.icon}</div>
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<Badge className="bg-amber-600">{currentLevel.name}</Badge>
								<span className="text-sm text-muted-foreground">
									Nível Atual
								</span>
							</div>
							<p className="text-2xl font-bold">
								{patientStats.totalPoints} pontos
							</p>
							<div className="mt-2">
								<div className="flex items-center justify-between text-xs mb-1">
									<span>
										Progresso para {nextLevel.icon} {nextLevel.name}
									</span>
									<span>{progressToNext.toFixed(0)}%</span>
								</div>
								<div className="h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
									<div
										className="h-full bg-amber-600 transition-all"
										style={{ width: `${progressToNext}%` }}
									/>
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4 text-center">
							<div>
								<p className="text-2xl font-bold text-orange-600">
									{patientStats.currentStreak}
								</p>
								<p className="text-xs text-muted-foreground">Sequência Atual</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-purple-600">
									{patientStats.unlockedAchievements}
								</p>
								<p className="text-xs text-muted-foreground">Conquistas</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Configuration */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Configurações de Pontuação
					</CardTitle>
					<CardDescription>
						Defina quantos pontos os pacientes ganham por cada ação
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="space-y-0.5">
							<Label className="text-base font-semibold">
								Ativar Gamificação
							</Label>
							<p className="text-sm text-muted-foreground">
								Habilita o sistema de pontos e conquistas para todos os
								pacientes
							</p>
						</div>
						<Switch
							checked={config.enabled}
							onCheckedChange={(checked) =>
								setConfig({ ...config, enabled: checked })
							}
						/>
					</div>

					{config.enabled && (
						<>
							{/* Points Settings */}
							<div className="space-y-4">
								<h4 className="font-semibold">Pontos por Ação</h4>

								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<Label className="flex-1">Por sessão completada</Label>
										<div className="flex items-center gap-2 w-48">
											<Slider
												value={[config.pointsPerSession]}
												onValueChange={([v]) =>
													setConfig({ ...config, pointsPerSession: v })
												}
												min={10}
												max={100}
												step={5}
											/>
											<span className="w-12 text-right text-sm font-medium">
												{config.pointsPerSession}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<Label className="flex-1">
											Por dia de sequência (streak)
										</Label>
										<div className="flex items-center gap-2 w-48">
											<Slider
												value={[config.pointsPerStreakDay]}
												onValueChange={([v]) =>
													setConfig({ ...config, pointsPerStreakDay: v })
												}
												min={5}
												max={50}
												step={5}
											/>
											<span className="w-12 text-right text-sm font-medium">
												{config.pointsPerStreakDay}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<Label className="flex-1">Bônus por pontualidade</Label>
										<div className="flex items-center gap-2 w-48">
											<Slider
												value={[config.earlyArrivalBonus]}
												onValueChange={([v]) =>
													setConfig({ ...config, earlyArrivalBonus: v })
												}
												min={5}
												max={30}
												step={5}
											/>
											<span className="w-12 text-right text-sm font-medium">
												{config.earlyArrivalBonus}
											</span>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<Label className="flex-1">
											Exercícios de casa completados
										</Label>
										<div className="flex items-center gap-2 w-48">
											<Slider
												value={[config.homeExerciseCompletion]}
												onValueChange={([v]) =>
													setConfig({ ...config, homeExerciseCompletion: v })
												}
												min={5}
												max={50}
												step={5}
											/>
											<span className="w-12 text-right text-sm font-medium">
												{config.homeExerciseCompletion}
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Rewards Toggle */}
							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div className="space-y-0.5">
									<Label className="text-base font-semibold">
										Ativar Recompensas Reais
									</Label>
									<p className="text-sm text-muted-foreground">
										Permite que pacientes troquem pontos por descontos ou
										benefícios
									</p>
								</div>
								<Switch
									checked={config.rewardsEnabled}
									onCheckedChange={(checked) =>
										setConfig({ ...config, rewardsEnabled: checked })
									}
								/>
							</div>

							<Button onClick={saveConfig} className="w-full">
								<Save className="h-4 w-4 mr-2" />
								Salvar Configurações
							</Button>
						</>
					)}
				</CardContent>
			</Card>

			{/* Achievements */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Award className="h-5 w-5" />
						Conquistas Disponíveis
					</CardTitle>
					<CardDescription>
						Defina as conquistas que os pacientes podem desbloquear
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-2">
						{config.achievements.map((achievement) => {
							const isUnlocked =
								achievement.type === "sessions"
									? patientStats.completedSessions >= achievement.requirement
									: achievement.type === "streak"
										? patientStats.longestStreak >= achievement.requirement
										: false;

							return (
								<div
									key={achievement.id}
									className={cn(
										"p-4 border rounded-lg transition-all",
										isUnlocked
											? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
											: "border-border opacity-70",
									)}
								>
									<div className="flex items-start gap-3">
										<div className="text-3xl">{achievement.icon}</div>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span className="font-semibold">
													{achievement.title}
												</span>
												{isUnlocked && (
													<Badge
														variant="secondary"
														className="text-xs bg-amber-600"
													>
														Desbloqueado
													</Badge>
												)}
											</div>
											<p className="text-sm text-muted-foreground mt-1">
												{achievement.description}
											</p>
											<div className="flex items-center gap-2 mt-2">
												<Target className="h-3 w-3 text-muted-foreground" />
												<span className="text-xs text-muted-foreground">
													Requisito: {achievement.requirement}
												</span>
												<Gift className="h-3 w-3 text-amber-600 ml-2" />
												<span className="text-xs text-amber-600 font-medium">
													{getRewardLabel(achievement.reward)}
												</span>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* Leaderboard Preview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Crown className="h-5 w-5 text-amber-500" />
						Ranking da Clínica
					</CardTitle>
					<CardDescription>Pacientes mais engajados do mês</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{[
							{ rank: 1, name: "Maria Silva", points: 5420, avatar: "👩" },
							{ rank: 2, name: "João Santos", points: 4890, avatar: "👨" },
							{ rank: 3, name: "Ana Costa", points: 4250, avatar: "👩" },
							{ rank: 4, name: "Pedro Lima", points: 3870, avatar: "👨" },
							{ rank: 5, name: "Carla Dias", points: 3540, avatar: "👩" },
						].map((patient) => (
							<div
								key={patient.rank}
								className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
							>
								<div
									className={cn(
										"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
										patient.rank === 1
											? "bg-amber-500 text-white"
											: patient.rank === 2
												? "bg-gray-400 text-white"
												: patient.rank === 3
													? "bg-orange-600 text-white"
													: "bg-muted",
									)}
								>
									{patient.rank}
								</div>
								<div className="text-2xl">{patient.avatar}</div>
								<div className="flex-1">
									<p className="font-medium">{patient.name}</p>
								</div>
								<div className="text-right">
									<p className="font-bold text-amber-600">{patient.points}</p>
									<p className="text-xs text-muted-foreground">pontos</p>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Tips Card */}
			<Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
						<div className="text-sm">
							<p className="font-medium text-purple-900 dark:text-purple-100 mb-2">
								Benefícios da Gamificação
							</p>
							<ul className="space-y-1 text-purple-800 dark:text-purple-200">
								<li>• Aumenta a adesão ao tratamento em até 40%</li>
								<li>• Reduz o absenteísmo e cancelamentos</li>
								<li>• Melhora a motivação e engajamento dos pacientes</li>
								<li>• Cria senso de comunidade e competição saudável</li>
								<li>• Incentiva a realização de exercícios em casa</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
