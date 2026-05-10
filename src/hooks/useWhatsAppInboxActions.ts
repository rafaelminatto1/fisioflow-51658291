import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  assign as apiAssign, 
  transfer as apiTransfer, 
  updatePriority as apiUpdatePriority,
  snoozeConversation as apiSnoozeConversation 
} from "@/services/whatsapp-api";

export const useWhatsAppInboxActions = (refetch?: () => void, refetchConversation?: () => void) => {
  const [loading, setLoading] = useState(false);

  const handleAssign = useCallback(async (conversationId: string, userId: string) => {
    setLoading(true);
    try {
      await apiAssign(conversationId, userId);
      toast.success("Conversa atribuída");
      if (refetch) await refetch();
      if (refetchConversation) await refetchConversation();
      return true;
    } catch {
      toast.error("Erro ao atribuir conversa");
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch, refetchConversation]);

  const handleTransfer = useCallback(async (conversationId: string, userId: string) => {
    setLoading(true);
    try {
      await apiTransfer(conversationId, userId);
      toast.success("Conversa transferida");
      if (refetch) await refetch();
      if (refetchConversation) await refetchConversation();
      return true;
    } catch {
      toast.error("Erro ao transferir conversa");
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch, refetchConversation]);

  const handlePriorityChange = useCallback(async (conversationId: string, priority: "low" | "medium" | "high" | "urgent") => {
    try {
      await apiUpdatePriority(conversationId, priority);
      toast.success("Prioridade atualizada");
      if (refetch) await refetch();
      if (refetchConversation) await refetchConversation();
    } catch {
      toast.error("Erro ao atualizar prioridade");
    }
  }, [refetch, refetchConversation]);

  const handleSnooze = useCallback(async (conversationId: string, hours: number) => {
    try {
      await apiSnoozeConversation(conversationId, hours);
      toast.success(`Conversa adiada por ${hours}h`);
      if (refetch) await refetch();
    } catch {
      toast.error("Erro ao adiar conversa");
    }
  }, [refetch]);

  return {
    loading,
    handleAssign,
    handleTransfer,
    handlePriorityChange,
    handleSnooze
  };
};
