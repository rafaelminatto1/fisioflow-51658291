import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sessionTemplatesApi } from "@/api/v2";
import {
	soapKeys,
	SoapOperationError,
	type SessionTemplate,
} from "./types";

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
