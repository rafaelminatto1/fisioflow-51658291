/**
 * useQuests - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
	gamificationApi,
	type QuestDefinitionRow,
} from "@/lib/api/workers-client";

export type QuestCategory = "daily" | "weekly" | "special";
export type QuestStatus = "pending" | "in_progress" | "completed" | "expired";
export type QuestDifficulty = "easy" | "medium" | "hard" | "expert";

export interface QuestDefinition {
	id: string;
	code: string;
	title: string;
	description: string;
	category: QuestCategory;
	xp_reward: number;
	points_reward: number;
	requirements: Record<string, unknown>;
	icon?: string;
	difficulty: QuestDifficulty;
	is_active: boolean;
	repeat_interval: "once" | "daily" | "weekly" | "monthly";
}

export interface PatientQuest {
	id: string;
	patient_id: string;
	quest_id: string;
	status: QuestStatus;
	progress: Record<string, unknown>;
	started_at: string | null;
	completed_at: string | null;
	expires_at: string | null;
	quest_definition?: QuestDefinition;
}

export interface UseQuestsResult {
	dailyQuests: PatientQuest[];
	weeklyQuests: PatientQuest[];
	allQuests: PatientQuest[];
	availableQuests: QuestDefinition[];
	isLoading: boolean;
	error: Error | null;
	startQuest: (questId: string) => Promise<void>;
	claimReward: (patientQuestId: string) => Promise<void>;
	refreshQuests: () => Promise<void>;
	refetch: () => void;
}

export const DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
	easy: "Fácil",
	medium: "Médio",
	hard: "Difícil",
	expert: "Expert",
};

const toQuestDefinition = (
	row: Partial<QuestDefinitionRow>,
): QuestDefinition => ({
	id: row.id || crypto.randomUUID(),
	code: row.code || row.id || "",
	title: row.title || "Missão",
	description: row.description || "",
	category: (row.category as QuestCategory) || "daily",
	xp_reward: row.xp_reward || 0,
	points_reward: row.points_reward || 0,
	requirements: (row.requirements as Record<string, unknown>) || {},
	icon: row.icon || "Target",
	difficulty: (row.difficulty as QuestDifficulty) || "easy",
	is_active: row.is_active ?? true,
	repeat_interval:
		(row.repeat_interval as QuestDefinition["repeat_interval"]) || "daily",
});

export const useQuests = (patientId?: string): UseQuestsResult => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const { data: questRows = [], isLoading: loadingDefinitions } = useQuery({
		queryKey: ["available-quests"],
		queryFn: async () =>
			(await gamificationApi.questDefinitions.list()).data ?? [],
		staleTime: 1000 * 60 * 10,
	});

	const availableQuests = questRows
		.filter((row) => row.is_active)
		.map(toQuestDefinition);

	const {
		data: patientQuests = [],
		isLoading: loadingPatientQuests,
		error,
		refetch,
	} = useQuery({
		queryKey: ["patient-quests", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const [dailyRes, challengesRes] = await Promise.all([
				gamificationApi.getQuests(patientId),
				gamificationApi.weeklyChallenges.list({ active: true, patientId }),
			]);

			const daily: PatientQuest[] = (dailyRes.data?.quests_data ?? []).map(
				(quest) => ({
					id: quest.id,
					patient_id: patientId,
					quest_id: quest.id,
					status: quest.completed ? "completed" : "in_progress",
					progress: { current: quest.completed ? 1 : 0, target: 1 },
					started_at: dailyRes.data?.date
						? `${dailyRes.data.date}T00:00:00.000Z`
						: null,
					completed_at: quest.completed ? new Date().toISOString() : null,
					expires_at: dailyRes.data?.date
						? `${dailyRes.data.date}T23:59:59.999Z`
						: null,
					quest_definition: {
						id: quest.id,
						code: quest.id,
						title: quest.title,
						description: quest.description || "",
						category: "daily",
						xp_reward: quest.xp,
						points_reward: 0,
						requirements: {},
						icon: quest.icon || "Calendar",
						difficulty: "easy",
						is_active: true,
						repeat_interval: "daily",
					},
				}),
			);

			const weekly: PatientQuest[] = (challengesRes.data ?? []).map(
				(challenge) => ({
					id: `challenge-${challenge.id}`,
					patient_id: patientId,
					quest_id: challenge.id,
					status: challenge.patient_progress?.completed
						? "completed"
						: "in_progress",
					progress: {
						current: challenge.patient_progress?.progress || 0,
						target: challenge.target?.count || 1,
					},
					started_at: challenge.start_date
						? `${challenge.start_date}T00:00:00.000Z`
						: null,
					completed_at: challenge.patient_progress?.completed_at || null,
					expires_at: challenge.end_date
						? `${challenge.end_date}T23:59:59.999Z`
						: null,
					quest_definition: {
						id: challenge.id,
						code: challenge.id,
						title: challenge.title,
						description: challenge.description || "",
						category: "weekly",
						xp_reward: challenge.xp_reward || 0,
						points_reward: challenge.point_reward || 0,
						requirements: { target: challenge.target },
						icon: challenge.icon || "Flame",
						difficulty: "medium",
						is_active: challenge.is_active ?? true,
						repeat_interval: "weekly",
					},
				}),
			);

			return [...daily, ...weekly];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 2,
		retry: 1,
	});

	const dailyQuests = patientQuests.filter(
		(q) => q.quest_definition?.category === "daily",
	);
	const weeklyQuests = patientQuests.filter(
		(q) => q.quest_definition?.category === "weekly",
	);

	const startQuestMutation = useMutation({
		mutationFn: async (_questId: string) => undefined,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["patient-quests", patientId],
			});
			toast({
				title: "Quest iniciada!",
				description: "A missão foi marcada como ativa.",
			});
		},
		onError: (error: Error) =>
			toast({
				title: "Erro ao iniciar quest",
				description: error.message,
				variant: "destructive",
			}),
	});

	const claimRewardMutation = useMutation({
		mutationFn: async (patientQuestId: string) => {
			const quest = patientQuests.find((q) => q.id === patientQuestId);
			if (!quest) throw new Error("Quest não encontrada");
			if (quest.quest_definition?.category !== "daily") return;
			await gamificationApi.completeQuest(patientId || "", quest.quest_id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["patient-quests", patientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["gamification-profile", patientId],
			});
			toast({
				title: "Recompensa recebida!",
				description: "A missão foi concluída e o XP foi aplicado.",
			});
		},
		onError: (error: Error) =>
			toast({
				title: "Erro ao reclamar recompensa",
				description: error.message,
				variant: "destructive",
			}),
	});

	const refreshQuests = async () => {
		await queryClient.invalidateQueries({
			queryKey: ["patient-quests", patientId],
		});
		toast({
			title: "Quests atualizadas",
			description: "Dados de missões recarregados.",
		});
	};

	return {
		dailyQuests,
		weeklyQuests,
		allQuests: patientQuests,
		availableQuests,
		isLoading: loadingDefinitions || loadingPatientQuests,
		error: (error as Error | null) ?? null,
		startQuest: (questId: string) => startQuestMutation.mutateAsync(questId),
		claimReward: (patientQuestId: string) =>
			claimRewardMutation.mutateAsync(patientQuestId),
		refreshQuests,
		refetch,
	};
};
