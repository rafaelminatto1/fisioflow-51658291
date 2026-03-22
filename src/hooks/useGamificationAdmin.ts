/**
 * useGamificationAdmin - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
	GamificationStats,
	EngagementData,
	AtRiskPatient,
	PopularAchievement,
	LevelConfig,
	LevelReward,
	ProgressionType,
} from "@/types/gamification";
import { gamificationApi } from "@/api/v2";

export interface UseGamificationAdminResult {
	stats: GamificationStats | undefined;
	statsLoading: boolean;
	engagementData: EngagementData[] | undefined;
	engagementLoading: boolean;
	atRiskPatients: AtRiskPatient[] | undefined;
	atRiskPatientsLoading: boolean;
	popularAchievements: PopularAchievement[] | undefined;
	popularAchievementsLoading: boolean;
	levelSettings:
		| {
				progressionType: ProgressionType;
				baseXp: number;
				multiplier: number;
				titles: string[];
				rewards: LevelReward[];
		  }
		| undefined;
	levelSettingsLoading: boolean;
	adjustXp: ReturnType<typeof useAdjustXp>;
	resetStreak: ReturnType<typeof useResetStreak>;
	updateLevelSettings: ReturnType<typeof useUpdateLevelSettings>;
}

const parseSettingNumber = (value: unknown, fallback: number): number => {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
};

const parseSettingStringArray = (value: unknown): string[] => {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? parsed.map(String) : [];
		} catch {
			return value ? [value] : [];
		}
	}
	return [];
};

const parseSettingRewards = (value: unknown): LevelReward[] => {
	if (Array.isArray(value)) return value as LevelReward[];
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as LevelReward[]) : [];
		} catch {
			return [];
		}
	}
	return [];
};

const buildEngagementData = (
	transactions: Array<{
		patient_id: string;
		amount: number;
		reason: string;
		created_at: string;
	}>,
): EngagementData[] => {
	const grouped = transactions.reduce<Record<string, EngagementData>>(
		(acc, t) => {
			const date = t.created_at.split("T")[0];
			if (!acc[date]) {
				acc[date] = {
					date,
					activePatients: 0,
					questsCompleted: 0,
					xpAwarded: 0,
					achievementsUnlocked: 0,
				};
			}
			acc[date].xpAwarded += t.amount ?? 0;
			if (t.reason === "daily_quest") acc[date].questsCompleted += 1;
			if (t.reason === "achievement_unlocked")
				acc[date].achievementsUnlocked += 1;
			return acc;
		},
		{},
	);

	const uniquePatientsPerDate = new Map<string, Set<string>>();
	transactions.forEach((t) => {
		const date = t.created_at.split("T")[0];
		if (!uniquePatientsPerDate.has(date))
			uniquePatientsPerDate.set(date, new Set());
		uniquePatientsPerDate.get(date)?.add(t.patient_id);
	});

	Object.entries(grouped).forEach(([date, row]) => {
		row.activePatients = uniquePatientsPerDate.get(date)?.size ?? 0;
	});

	return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

export const useGamificationAdmin = (days = 30): UseGamificationAdminResult => {
	const { toast } = useToast();

	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ["gamification-admin-stats", days],
		queryFn: async (): Promise<GamificationStats> => {
			const res = await gamificationApi.getAdminStats(days);
			return res.data;
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	const { data: engagementData, isLoading: engagementLoading } = useQuery({
		queryKey: ["gamification-admin-engagement", days],
		queryFn: async (): Promise<EngagementData[]> => {
			const res = await gamificationApi.listTransactions({ days, limit: 5000 });
			return buildEngagementData(res.data ?? []);
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	const { data: atRiskPatients, isLoading: atRiskPatientsLoading } = useQuery({
		queryKey: ["gamification-admin-at-risk"],
		queryFn: async (): Promise<AtRiskPatient[]> => {
			const res = await gamificationApi.getAtRiskPatients({
				days: 7,
				limit: 50,
			});
			return res.data ?? [];
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	const { data: popularAchievements, isLoading: popularAchievementsLoading } =
		useQuery({
			queryKey: ["gamification-admin-popular-achievements"],
			queryFn: async (): Promise<PopularAchievement[]> => {
				const res = await gamificationApi.getPopularAchievements(10);
				return res.data ?? [];
			},
			staleTime: 1000 * 60 * 10,
			gcTime: 1000 * 60 * 15,
		});

	const { data: levelSettings, isLoading: levelSettingsLoading } = useQuery({
		queryKey: ["gamification-admin-level-settings"],
		queryFn: async () => {
			const res = await gamificationApi.getSettings();
			const settings = res.data ?? [];
			const find = (key: string) =>
				settings.find((row) => row.key === key)?.value;

			return {
				progressionType: (find("level_progression_type") ??
					find("progression_type") ??
					"linear") as ProgressionType,
				baseXp: parseSettingNumber(
					find("level_base_xp") ?? find("base_xp"),
					1000,
				),
				multiplier: parseSettingNumber(
					find("level_multiplier") ?? find("multiplier"),
					1.5,
				),
				titles: parseSettingStringArray(find("level_titles")),
				rewards: parseSettingRewards(find("level_rewards")),
			};
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});

	const adjustXp = useAdjustXp();
	const resetStreak = useResetStreak();
	const updateLevelSettings = useUpdateLevelSettings();

	return {
		stats,
		statsLoading,
		engagementData,
		engagementLoading,
		atRiskPatients,
		atRiskPatientsLoading,
		popularAchievements,
		popularAchievementsLoading,
		levelSettings,
		levelSettingsLoading,
		adjustXp,
		resetStreak,
		updateLevelSettings,
	};
};

function useAdjustXp() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			patientId,
			amount,
			reason,
		}: {
			patientId: string;
			amount: number;
			reason: string;
		}) => {
			const res = await gamificationApi.adjustXp({ patientId, amount, reason });
			return { patientId, amount, newTotal: res.data.total_points };
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["gamification-admin-stats"] });
			queryClient.invalidateQueries({
				queryKey: ["gamification-admin-at-risk"],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-profile", result.patientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-patient-detail", result.patientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-transactions", result.patientId],
			});
			toast({
				title: "XP ajustado com sucesso",
				description: `${result.amount > 0 ? "+" : ""}${result.amount} XP (${result.newTotal} total)`,
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao ajustar XP",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}

function useResetStreak() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			patientId,
			patientName,
		}: {
			patientId: string;
			patientName?: string;
		}) => {
			await gamificationApi.resetStreak(patientId);
			return { patientId, patientName };
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["gamification-admin-stats"] });
			queryClient.invalidateQueries({
				queryKey: ["gamification-admin-at-risk"],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-profile", result.patientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-patient-detail", result.patientId],
			});
			toast({
				title: "Streak resetado",
				description: `Streak de ${result.patientName || "paciente"} foi resetado para 0`,
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao resetar streak",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}

function useUpdateLevelSettings() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (settings: {
			progressionType: ProgressionType;
			baseXp: number;
			multiplier: number;
		}) => {
			await gamificationApi.updateSettings({
				level_progression_type: settings.progressionType,
				level_base_xp: settings.baseXp,
				level_multiplier: settings.multiplier,
				progression_type: settings.progressionType,
				base_xp: settings.baseXp,
				multiplier: settings.multiplier,
			});
			return settings;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["gamification-admin-level-settings"],
			});
			toast({
				title: "Configurações atualizadas",
				description: "Sistema de níveis foi configurado com sucesso",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao atualizar configurações",
				description: error.message,
				variant: "destructive",
			});
		},
	});
}

export const calculateLevelCurve = (
	progressionType: ProgressionType,
	baseXp: number,
	multiplier: number,
	maxLevel = 50,
): LevelConfig[] => {
	const levels: LevelConfig[] = [];

	for (let level = 1; level <= maxLevel; level++) {
		let xpRequired: number;
		switch (progressionType) {
			case "linear":
				xpRequired = baseXp * level;
				break;
			case "exponential":
				xpRequired = Math.floor(baseXp * Math.pow(multiplier, level - 1));
				break;
			case "custom":
			default:
				xpRequired = baseXp * level;
				break;
		}
		levels.push({ level, xpRequired });
	}

	return levels;
};
