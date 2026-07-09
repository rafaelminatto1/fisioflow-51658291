import { useMutation } from "@tanstack/react-query";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { request } from "@/api/v2/base";
import type { Tarefa } from "@/types/tarefas";

interface TaskCalendarSyncButtonProps {
  tarefa: Tarefa | null;
}

/** Envia a tarefa (com vencimento) ao Google Calendar do usuário (US-14). */
export function TaskCalendarSyncButton({ tarefa }: TaskCalendarSyncButtonProps) {
  const sync = useMutation({
    mutationFn: async () => {
      const res = await request<{ data: { success: boolean; message: string } }>(
        "/api/integrations/google/calendar/sync-task",
        {
          method: "POST",
          body: JSON.stringify({
            id: tarefa!.id,
            titulo: tarefa!.titulo,
            descricao: tarefa!.descricao,
            data_vencimento: tarefa!.data_vencimento,
            hora_vencimento: tarefa!.hora_vencimento,
          }),
        },
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.warning(data.message);
    },
    onError: (err: Error) => toast.error("Falha ao sincronizar: " + err.message),
  });

  if (!tarefa?.data_vencimento) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      className="gap-1.5 rounded-xl text-xs font-bold text-slate-600"
    >
      {sync.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CalendarPlus className="h-3.5 w-3.5" />
      )}
      Google Calendar
    </Button>
  );
}
