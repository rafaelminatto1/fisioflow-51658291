import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sessionsApi } from "@/api/v2";
import {
	soapKeys,
	SoapOperationError,
	type CreateSoapRecordData,
	type SoapRecord,
} from "./types";

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
			queryClient.invalidateQueries({
				queryKey: soapKeys.list(data.patient_id),
			});
			queryClient.setQueryData(soapKeys.detail(data.id), data);
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
			queryClient.invalidateQueries({
				queryKey: soapKeys.list(data.patient_id),
			});
			queryClient.setQueryData(soapKeys.detail(data.id), data);
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
			queryClient.invalidateQueries({
				queryKey: soapKeys.list(data.patient_id),
			});
			queryClient.invalidateQueries({
				queryKey: soapKeys.drafts(data.patient_id),
			});
			queryClient.setQueryData(soapKeys.detail(data.id), data);
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
			queryClient.invalidateQueries({
				queryKey: soapKeys.list(result.patientId),
			});
			queryClient.invalidateQueries({
				queryKey: soapKeys.drafts(result.patientId),
			});
			queryClient.removeQueries({ queryKey: soapKeys.detail(result.recordId) });
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
