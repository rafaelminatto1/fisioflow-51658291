/**
 * usePrescriptions - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	clinicalApi,
	clinicalPublicApi,
	type ExercisePrescription,
} from "@/api/v2";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export type { ExercisePrescription };

export interface PrescriptionExercise {
	id: string;
	name: string;
	description?: string;
	sets: number;
	repetitions: number;
	intensity_rpe?: string; // e.g., "8", "Até a falha", "Moderado"
	frequency: string;
	observations?: string;
	video_url?: string;
	image_url?: string;
	completed?: boolean;
	completed_at?: string;
}

export type Prescription = ExercisePrescription & {
	exercises: PrescriptionExercise[];
	completed_exercises: string[];
};

export const usePrescriptions = (patientId?: string) => {
	const queryClient = useQueryClient();

	const {
		data: prescriptions = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["prescriptions", patientId],
		queryFn: async () => {
			const res = await clinicalApi.prescriptions.list(
				patientId ? { patientId } : undefined,
			);
			return (res?.data ?? []) as Prescription[];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (input: {
			patient_id: string;
			title?: string;
			exercises: PrescriptionExercise[];
			notes?: string;
			validity_days?: number;
		}) => {
			const validityDays = input.validity_days ?? 30;
			const validUntil = format(
				addDays(new Date(), validityDays),
				"yyyy-MM-dd",
			);

			const res = await clinicalApi.prescriptions.create({
				patient_id: input.patient_id,
				title: input.title ?? "Prescrição de Reabilitação",
				exercises: input.exercises as unknown[],
				notes: input.notes,
				validity_days: validityDays,
				valid_until: validUntil,
				qr_code: `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				status: "ativo",
				view_count: 0,
				completed_exercises: [],
			});
			return (res?.data ?? res) as Prescription;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
			toast.success("Prescrição criada com sucesso");
		},
		onError: (error: Error) =>
			toast.error("Erro ao criar prescrição: " + error.message),
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Prescription> & { id: string }) => {
			const res = await clinicalApi.prescriptions.update(
				id,
				updates as Partial<ExercisePrescription>,
			);
			return (res?.data ?? res) as Prescription;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
			toast.success("Prescrição atualizada");
		},
		onError: (error: Error) =>
			toast.error("Erro ao atualizar: " + error.message),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => clinicalApi.prescriptions.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
			toast.success("Prescrição excluída");
		},
		onError: (error: Error) => toast.error("Erro ao excluir: " + error.message),
	});

	return {
		prescriptions,
		loading: isLoading,
		error,
		createPrescription: createMutation.mutateAsync,
		updatePrescription: updateMutation.mutate,
		deletePrescription: deleteMutation.mutate,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
};

export const usePublicPrescription = (qrCode: string) => {
	const queryClient = useQueryClient();

	const {
		data: prescription,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["public-prescription", qrCode],
		queryFn: async () => {
			const res = await clinicalPublicApi.prescriptions.getByQr(qrCode);
			const data = (res?.data ?? null) as Prescription | null;
			if (!data) throw new Error("Prescrição não encontrada");
			// Increment view count in background
			clinicalPublicApi.prescriptions
				.updateByQr(qrCode, {
					view_count: ((data.view_count ?? 0) as number) + 1,
					last_viewed_at: new Date().toISOString(),
				})
				.catch(() => null);
			return data;
		},
		enabled: !!qrCode,
	});

	const markExerciseComplete = useMutation({
		mutationFn: async ({
			exerciseId,
		}: {
			prescriptionId: string;
			exerciseId: string;
		}) => {
			const current = prescription?.completed_exercises ?? [];
			const isCompleted = current.includes(exerciseId);
			const newCompleted = isCompleted
				? current.filter((id) => id !== exerciseId)
				: [...current, exerciseId];

			await clinicalPublicApi.prescriptions.updateByQr(qrCode, {
				completed_exercises: newCompleted,
			});
			return newCompleted;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["public-prescription", qrCode],
			}),
	});

	return {
		prescription,
		loading: isLoading,
		error,
		markExerciseComplete: markExerciseComplete.mutate,
		isMarking: markExerciseComplete.isPending,
	};
};
