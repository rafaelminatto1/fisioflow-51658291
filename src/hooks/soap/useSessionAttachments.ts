import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import { sessionAttachmentsApi } from "@/api/v2";
import {
	soapKeys,
	SoapOperationError,
	type SessionAttachment,
	type SessionAttachmentCategory,
} from "./types";

export const useSessionAttachments = (
	soapRecordId?: string,
	_patientId?: string,
) => {
	return useQuery({
		queryKey: soapKeys.attachments(soapRecordId, _patientId),
		queryFn: async () => {
			if (!soapRecordId) return [];
			const res = await sessionAttachmentsApi.list(soapRecordId);
			return res.data as SessionAttachment[];
		},
		enabled: !!soapRecordId,
		staleTime: 1000 * 60 * 5,
	});
};

export const useUploadSessionAttachment = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			file,
			soapRecordId,
			patientId: _patientId,
			category = "other",
			description,
		}: {
			file: File;
			soapRecordId?: string;
			patientId: string;
			category?: SessionAttachmentCategory;
			description?: string;
		}) => {
			if (!soapRecordId)
				throw new SoapOperationError(
					"soapRecordId é obrigatório",
					"VALIDATION",
				);
			const { publicUrl, key } = await uploadToR2(file, "session-attachments");
			const res = await sessionAttachmentsApi.create(soapRecordId, {
				file_name: key,
				original_name: file.name,
				file_url: publicUrl,
				mime_type: file.type,
				category,
				size_bytes: file.size,
				description: description ?? undefined,
			});
			return res.data as SessionAttachment;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: soapKeys.attachments(
					variables.soapRecordId,
					variables.patientId,
				),
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao anexar arquivo",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useDeleteSessionAttachment = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			attachmentId,
			soapRecordId,
			patientId,
			fileUrl,
		}: {
			attachmentId: string;
			soapRecordId?: string;
			patientId?: string;
			fileUrl?: string;
		}) => {
			if (!soapRecordId)
				throw new SoapOperationError(
					"soapRecordId é obrigatório",
					"VALIDATION",
				);
			await sessionAttachmentsApi.delete(soapRecordId, attachmentId);
			if (fileUrl) {
				try {
					await deleteFromR2(fileUrl);
				} catch {
					/* ignore */
				}
			}
			return { attachmentId, soapRecordId, patientId };
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: soapKeys.attachments(result.soapRecordId, result.patientId),
			});
			toast({
				title: "Arquivo removido",
				description: "O arquivo foi removido com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao remover arquivo",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};
