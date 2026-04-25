import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sessionsApi } from "@/api/v2";
import {
	soapKeys,
	SoapOperationError,
	type CreateSoapRecordData,
	type SoapRecord,
	type SoapRecordV2,
} from "./types";
import { invalidateSoapCache } from "./useSoapCache";
import { toSoapRecordV2 } from "./mappers";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";

export const useCreateSoapRecordV2 = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (data: {
			patientId: string;
			subjective: string;
			objective: string;
			assessment: string;
			plan: string;
			recordDate?: string;
		}) => {
			const response = await sessionsApi.create({
				patient_id: data.patientId,
				subjective: data.subjective,
				objective: data.objective,
				assessment: data.assessment,
				plan: data.plan,
				record_date: data.recordDate,
				status: "draft",
			});
			return toSoapRecordV2(
				response.data as unknown as Record<string, unknown>,
			);
		},
		onSuccess: (data) => {
			invalidateSoapCache(queryClient, data.patientId, data.id);
			toast({
				title: "Evolução salva",
				description: "Registro salvo com sucesso.",
			});
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useCreateSoapRecordV2");
		},
	});
};

export const useUpdateSoapRecordV2 = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (data: {
			recordId: string;
			patientId: string;
			subjective: string;
			objective: string;
			assessment: string;
			plan: string;
		}) => {
			const response = await sessionsApi.update(data.recordId, {
				subjective: data.subjective,
				objective: data.objective,
				assessment: data.assessment,
				plan: data.plan,
			});
			return toSoapRecordV2(
				response.data as unknown as Record<string, unknown>,
			);
		},
		onSuccess: (data) => {
			invalidateSoapCache(queryClient, data.patientId, data.id);
			toast({
				title: "Evolução atualizada",
				description: "Registro atualizado com sucesso.",
			});
		},
		onError: (error: Error) => {
			ErrorHandler.handle(error, "useUpdateSoapRecordV2");
		},
	});
};

export const useAutoSaveSoapRecordV2 = () => {
	const createMutation = useCreateSoapRecordV2();
	const updateMutation = useUpdateSoapRecordV2();

	return {
		mutateAsync: async (data: {
			recordId?: string;
			patientId: string;
			subjective: string;
			objective: string;
			assessment: string;
			plan: string;
			recordDate?: string;
		}) => {
			if (data.recordId) {
				return updateMutation.mutateAsync({
					recordId: data.recordId,
					patientId: data.patientId,
					subjective: data.subjective,
					objective: data.objective,
					assessment: data.assessment,
					plan: data.plan,
				});
			}

			return createMutation.mutateAsync({
				patientId: data.patientId,
				subjective: data.subjective,
				objective: data.objective,
				assessment: data.assessment,
				plan: data.plan,
				recordDate: data.recordDate,
			});
		},
		isPending: createMutation.isPending || updateMutation.isPending,
	};
};

export const useCreateSoapRecord = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (data: CreateSoapRecordData) => {
			const res = await sessionsApi.create({
				...data,
				status: data.status ?? "draft",
				record_date: data.record_date ?? new Date().toISOString().split("T")[0],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});
			return res.data as SoapRecord;
		},
		onMutate: async (newData) => {
			await queryClient.cancelQueries({ queryKey: soapKeys.lists() });
			const previousLists = queryClient.getQueryData(soapKeys.all);
			queryClient.setQueryData(
				soapKeys.list(newData.patient_id),
				(old: SoapRecord[] | undefined) => [
					...(old ?? []),
					{
						...newData,
						id: `temp-${Date.now()}`,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						status: newData.status ?? "draft",
					} as SoapRecord,
				],
			);
			return { previousLists };
		},
		onSuccess: (data) => {
			invalidateSoapCache(queryClient, data.patient_id, data.id);
			toast({
				title: "Evolução salva",
				description: "A evolução do paciente foi registrada com sucesso.",
			});
		},
		onError: (error, _variables, context) => {
			if (context?.previousLists)
				queryClient.setQueryData(soapKeys.all, context.previousLists);
			toast({
				title: "Erro ao salvar evolução",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useUpdateSoapRecord = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			recordId,
			data,
		}: {
			recordId: string;
			data: Partial<CreateSoapRecordData>;
		}) => {
			const res = await sessionsApi.update(recordId, data);
			return res.data as SoapRecord;
		},
		onMutate: async ({ recordId, data }) => {
			await queryClient.cancelQueries({ queryKey: soapKeys.detail(recordId) });
			const previousRecord = queryClient.getQueryData(
				soapKeys.detail(recordId),
			);
			queryClient.setQueryData(
				soapKeys.detail(recordId),
				(old: SoapRecord | undefined) =>
					({
						...old,
						...data,
						updated_at: new Date().toISOString(),
					}) as SoapRecord,
			);
			return { previousRecord, recordId };
		},
		onSuccess: (data) => {
			invalidateSoapCache(queryClient, data.patient_id, data.id);
			toast({
				title: "Evolução atualizada",
				description: "A evolução foi atualizada com sucesso.",
			});
		},
		onError: (error, _variables, context) => {
			if (context?.previousRecord && context?.recordId) {
				queryClient.setQueryData(
					soapKeys.detail(context.recordId),
					context.previousRecord,
				);
			}
			toast({
				title: "Erro ao atualizar evolução",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useSignSoapRecord = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (recordId: string) => {
			const res = await sessionsApi.finalize(recordId);
			return res.data as SoapRecord;
		},
		onSuccess: (data) => {
			invalidateSoapCache(queryClient, data.patient_id, data.id);
			toast({
				title: "Evolução finalizada",
				description: "A evolução foi finalizada e assinada com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao finalizar evolução",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useDeleteSoapRecord = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			recordId,
			patientId,
		}: {
			recordId: string;
			patientId: string;
		}) => {
			await sessionsApi.delete(recordId);
			return { recordId, patientId };
		},
		onSuccess: (result) => {
			invalidateSoapCache(queryClient, result.patientId, result.recordId);
			toast({
				title: "Evolução excluída",
				description: "A evolução foi excluída com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao excluir evolução",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useAutoSaveSoapRecord = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateSoapRecordData & { recordId?: string }) => {
			const { recordId, ...rest } = data;
			const res = await sessionsApi.autosave({
				...rest,
				patient_id: rest.patient_id,
				recordId,
				status: rest.status ?? "draft",
				record_date: rest.record_date ?? new Date().toISOString().split("T")[0],
			});
			return res.data as SoapRecord & { isNew?: boolean };
		},
		onSuccess: (result) => {
			if (result.patient_id) {
				queryClient.setQueryData(soapKeys.detail(result.id), result);
				queryClient.invalidateQueries({
					queryKey: soapKeys.drafts(result.patient_id),
				});
			}
		},
		onError: () => {},
	});
};
