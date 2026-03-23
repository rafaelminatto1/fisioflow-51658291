import { useQuery } from "@tanstack/react-query";
import { evolutionApi, type TreatmentSessionRecord } from "@/api/v2";
import { SessionExercise } from "@/components/evolution/SessionExercisesPanel";

type TreatmentSessionWithExercises = TreatmentSessionRecord & {
	exercises_performed?: SessionExercise[];
};

export const useSessionExercises = (patientId: string) => {
	const lastSessionQuery = useQuery({
		queryKey: ["last-treatment-session", patientId],
		queryFn: async () => {
			if (!patientId) return null;
			const res = await evolutionApi.treatmentSessions.list(patientId, {
				limit: 1,
			});
			const session = (res?.data?.[0] ??
				null) as TreatmentSessionWithExercises | null;
			return session;
		},
		enabled: !!patientId,
	});

	const suggestExerciseChanges = (
		exercises: SessionExercise[],
		painLevel: number,
		observations: string,
	): SessionExercise[] => {
		return exercises.map((exercise) => {
			let suggestedReps = exercise.repetitions;
			let suggestionMsg = "";

			if (
				painLevel <= 2 &&
				!observations.toLowerCase().includes("dor") &&
				!observations.toLowerCase().includes("difícil")
			) {
				suggestedReps = Math.min(exercise.repetitions + 2, 20);
				suggestionMsg = "Sugerido aumentar repetições (Paciente estável)";
			} else if (painLevel >= 7) {
				suggestedReps = Math.max(exercise.repetitions - 2, 5);
				suggestionMsg = "Sugerido reduzir volume devido à dor";
			}

			if (!suggestionMsg) return exercise;

			return {
				...exercise,
				repetitions: suggestedReps,
				observations: exercise.observations
					? `${exercise.observations} | ${suggestionMsg}`
					: suggestionMsg,
			};
		});
	};

	return {
		lastSession: lastSessionQuery.data,
		isLoadingLastSession: lastSessionQuery.isLoading,
		suggestExerciseChanges,
	};
};
