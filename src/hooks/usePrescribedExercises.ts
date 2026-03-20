import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clinicalApi, type PrescribedExercise } from "@/lib/api/workers-client";
import { useToast } from "@/hooks/use-toast";

export type { PrescribedExercise };

export const usePrescribedExercises = (patientId: string) => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const { data: prescriptions, isLoading } = useQuery({
		queryKey: ["prescribed-exercises", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const res = await clinicalApi.prescribedExercises.list({
				patientId,
				active: true,
			});
			return (res?.data ?? []) as PrescribedExercise[];
		},
		enabled: !!patientId,
	});

	const addPrescription = useMutation({
		mutationFn: async (
			newPrescription: Omit<
				PrescribedExercise,
				"id" | "patient_id" | "is_active"
			>,
		) => {
			const res = await clinicalApi.prescribedExercises.create({
				...newPrescription,
				patient_id: patientId,
				is_active: true,
			});
			return (res?.data ?? res) as PrescribedExercise;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["prescribed-exercises", patientId],
			});
			toast({
				title: "Exercício prescrito",
				description: "O exercício foi adicionado ao Home Care.",
			});
		},
	});

	const updatePrescription = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<PrescribedExercise> & { id: string }) => {
			const res = await clinicalApi.prescribedExercises.update(id, updates);
			return (res?.data ?? res) as PrescribedExercise;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["prescribed-exercises", patientId],
			});
		},
	});

	const removePrescription = useMutation({
		mutationFn: async (id: string) => {
			await clinicalApi.prescribedExercises.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["prescribed-exercises", patientId],
			});
			toast({
				title: "Prescrição removida",
				description: "O exercício foi removido do Home Care.",
			});
		},
	});

	return {
		prescriptions,
		isLoading,
		addPrescription,
		updatePrescription,
		removePrescription,
	};
};
