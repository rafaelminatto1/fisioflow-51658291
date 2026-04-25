import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/api/v2/communications";
import { toast } from "sonner";
import type { WhatsAppTemplateRecord } from "@/types/workers";

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
      name,
      category,
      status,
      template_key,
      variables,
    }: {
      id: string;
      name?: string;
      content?: string;
      category?: string;
      status?: string;
      template_key?: string;
      variables?: string[];
    }) => {
      const res = await whatsappApi.updateTemplate(id, {
        name,
        content,
        category,
        status,
        template_key,
        variables,
      });
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

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      template: Pick<WhatsAppTemplateRecord, "name" | "content"> & Partial<WhatsAppTemplateRecord>,
    ) => {
      const res = await whatsappApi.createTemplate({
        name: template.name,
        content: template.content,
        category: template.category,
        status: template.status,
        template_key: template.template_key,
        variables: template.variables,
        localOnly: true,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await whatsappApi.deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });
}
