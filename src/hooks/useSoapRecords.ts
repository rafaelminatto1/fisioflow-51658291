/**
 * useSoapRecords — Sessões SOAP migradas para Neon via Workers API
 *
 * SOAP CRUD     → sessionsApi         (Cloudflare Workers + Neon)
 * Attachments   → sessionAttachmentsApi (Cloudflare Workers + Neon)
 * Templates     → sessionTemplatesApi   (Cloudflare Workers + Neon)
 */

import {
	useQuery,
	useMutation,
	useQueryClient,
	useInfiniteQuery,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";
import {
	sessionsApi,
	sessionAttachmentsApi,
	sessionTemplatesApi,
} from "@/api/v2";

// ===== TYPES =====

export type SoapStatus = "draft" | "finalized" | "cancelled";

export const soapKeys = {
	all: ["soap-records"] as const,
	lists: () => [...soapKeys.all, "list"] as const,
	list: (
		patientId: string,
		filters?: { status?: SoapStatus; limit?: number },
	) => [...soapKeys.lists(), patientId, filters] as const,
	details: () => [...soapKeys.all, "detail"] as const,
	detail: (id: string) => [...soapKeys.details(), id] as const,
	drafts: (patientId: string) =>
		[...soapKeys.all, "drafts", patientId] as const,
	templates: (therapistId?: string) =>
		[...soapKeys.all, "templates", therapistId] as const,
	attachments: (soapRecordId?: string, patientId?: string) =>
		[...soapKeys.all, "attachments", soapRecordId, patientId] as const,
} as const;

export class SoapOperationError extends Error {
	constructor(
		message: string,
		public code?: string,
		public originalError?: unknown,
	) {
		super(message);
		this.name = "SoapOperationError";
	}
}

export interface SoapRecord {
	id: string;
	patient_id: string;
	appointment_id?: string;
	session_number?: number;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	status: SoapStatus;
	pain_level?: number;
	pain_location?: string;
	pain_character?: string;
	duration_minutes?: number;
	last_auto_save_at?: string;
	finalized_at?: string;
	finalized_by?: string;
	record_date: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	signed_at?: string;
	signature_hash?: string;
}

export interface CreateSoapRecordData {
	patient_id: string;
	appointment_id?: string;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	status?: SoapStatus;
	pain_level?: number;
	pain_location?: string;
	pain_character?: string;
	duration_minutes?: number;
	record_date?: string;
}

export interface UpdateSoapRecordData extends Partial<CreateSoapRecordData> {
	status?: SoapStatus;
}

export type SessionAttachmentCategory =
	| "exam"
	| "imaging"
	| "document"
	| "before_after"
	| "other";
export type SessionAttachmentFileType =
	| "pdf"
	| "jpg"
	| "png"
	| "docx"
	| "other";

export interface SessionAttachment {
	id: string;
	soap_record_id?: string;
	patient_id: string;
	file_name: string;
	original_name?: string;
	file_url: string;
	thumbnail_url?: string;
	file_type: SessionAttachmentFileType;
	mime_type?: string;
	category: SessionAttachmentCategory;
	size_bytes?: number;
	description?: string;
	uploaded_by?: string;
	uploaded_at: string;
}

export interface SessionTemplate {
	id: string;
	organization_id?: string;
	therapist_id?: string;
	name: string;
	description?: string;
	subjective?: string;
	objective?: Record<string, unknown>;
	assessment?: string;
	plan?: Record<string, unknown>;
	is_global: boolean;
	created_at: string;
	updated_at: string;
}

// ===== SOAP RECORDS — Workers/Neon =====

export const useSoapRecords = (patientId: string, limitValue = 10) => {
	return useQuery({
		queryKey: soapKeys.list(patientId, { limit: limitValue }),
		queryFn: async () => {
			const res = await sessionsApi.list({ patientId, limit: limitValue });
			return res.data as SoapRecord[];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 20,
	});
};

export const useInfiniteSoapRecords = (patientId: string, limitValue = 20) => {
	return useInfiniteQuery({
		queryKey: [...soapKeys.lists(), patientId, "infinite"],
		queryFn: async ({ pageParam = 0 }) => {
			const res = await sessionsApi.list({
				patientId,
				limit: limitValue,
				offset: (pageParam as number) * limitValue,
			});
			return res.data as SoapRecord[];
		},
		initialPageParam: 0,
		enabled: !!patientId,
		getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
			(lastPageParam as number) + 1,
		staleTime: 1000 * 60 * 5,
	});
};

export const useSoapRecord = (recordId: string) => {
	return useQuery({
		queryKey: soapKeys.detail(recordId),
		queryFn: async () => {
			const res = await sessionsApi.get(recordId);
			return res.data as SoapRecord;
		},
		enabled: !!recordId,
		staleTime: 1000 * 60 * 10,
	});
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

export const useDraftSoapRecords = (patientId: string) => {
	return useQuery({
		queryKey: soapKeys.drafts(patientId),
		queryFn: async () => {
			const res = await sessionsApi.list({ patientId, status: "draft" });
			return res.data as SoapRecord[];
		},
		enabled: !!patientId,
		staleTime: 1000 * 60 * 2,
	});
};

export const useDraftSoapRecordByAppointment = (
	patientId: string,
	appointmentId: string | undefined,
) => {
	return useQuery({
		queryKey: [...soapKeys.drafts(patientId), "byAppointment", appointmentId],
		queryFn: async () => {
			if (!appointmentId) return null;
			const res = await sessionsApi.list({
				patientId,
				appointmentId,
				status: "draft",
				limit: 1,
			});
			return (res.data[0] as SoapRecord) ?? null;
		},
		enabled: !!patientId && !!appointmentId,
		staleTime: 1000 * 60 * 2,
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
		onError: () => {
			// Silent error for autosave — não interrompe o usuário
		},
	});
};

// ===== SESSION ATTACHMENTS — Neon via Workers =====

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
			patientId,
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

// ===== SESSION TEMPLATES — Neon via Workers =====

export const useSessionTemplates = (_therapistId?: string) => {
	return useQuery({
		queryKey: soapKeys.templates(_therapistId),
		queryFn: async () => {
			const res = await sessionTemplatesApi.list();
			return res.data as SessionTemplate[];
		},
		staleTime: 1000 * 60 * 10,
	});
};

export const useCreateSessionTemplate = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (
			template: Omit<SessionTemplate, "id" | "created_at" | "updated_at">,
		) => {
			const res = await sessionTemplatesApi.create({
				name: template.name,
				description: template.description,
				subjective: template.subjective as string | undefined,
				objective: template.objective as string | undefined,
				assessment: template.assessment as string | undefined,
				plan: template.plan as string | undefined,
				is_global: template.is_global,
			});
			return res.data as SessionTemplate;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
			toast({
				title: "Template criado",
				description: "O template de sessão foi criado com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao criar template",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useUpdateSessionTemplate = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async ({
			templateId,
			data,
		}: {
			templateId: string;
			data: Partial<SessionTemplate>;
		}) => {
			const res = await sessionTemplatesApi.update(templateId, data);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
			toast({
				title: "Template atualizado",
				description: "O template foi atualizado com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao atualizar template",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};

export const useDeleteSessionTemplate = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (templateId: string) => {
			await sessionTemplatesApi.delete(templateId);
			return templateId;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: soapKeys.templates() });
			toast({
				title: "Template removido",
				description: "O template foi removido com sucesso.",
			});
		},
		onError: (error: unknown) => {
			toast({
				title: "Erro ao remover template",
				description:
					error instanceof SoapOperationError
						? error.message
						: "Erro desconhecido",
				variant: "destructive",
			});
		},
	});
};
