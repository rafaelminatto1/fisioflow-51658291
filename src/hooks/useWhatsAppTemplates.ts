import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/api/v2/communications";
import { toast } from "sonner";

export function useWhatsAppTemplates() {
	return useQuery({
		queryKey: ["whatsapp-templates"],
		queryFn: async () => {
			const res = await whatsappApi.listTemplates();
			return res.data || [];
		},
	});
}

export function useUpdateWhatsAppTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			content,
			status,
		}: {
			id: string;
			content?: string;
			status?: string;
		}) => {
			const res = await whatsappApi.updateTemplate(id, { content, status });
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
			toast.success("Template atualizado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar template: " + error.message);
		},
	});
}
