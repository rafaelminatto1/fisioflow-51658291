import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/api/v2/insights";
import { toast } from "sonner";

export function useSuggestReply() {
  return useMutation({
    mutationFn: async (params: { patientName: string; context: string }) => {
      const res = await aiApi.suggestReply(params);
      return res.data.suggestion;
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar sugestão de IA: " + error.message);
    },
  });
}
