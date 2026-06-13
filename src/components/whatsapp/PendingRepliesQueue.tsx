import { useState } from "react";
import { getWorkersApiUrl } from "@/lib/api/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, MessageCircle, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/v2/client";
import { toast } from "sonner";

interface PendingReply {
  id: string;
  wa_id: string;
  original_message: string;
  suggested_reply: string;
  intent: string;
  created_at: string;
}

const API_BASE = getWorkersApiUrl();

const INTENT_LABEL: Record<string, string> = {
  urgent: "Urgência",
  information: "Dúvida clínica",
  scheduling: "Agendamento",
  other: "Outro",
};

export function PendingRepliesQueue() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp", "pending-replies"],
    queryFn: () =>
      apiClient.get<{ data: PendingReply[] }>(`${API_BASE}/api/whatsapp/pending-replies`),
    refetchInterval: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "pending-replies"] });

  const approve = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply?: string }) =>
      apiClient.post(`${API_BASE}/api/whatsapp/pending-replies/${id}/approve`, { reply }),
    onSuccess: () => {
      toast.success("Resposta enviada ao paciente");
      invalidate();
    },
    onError: () => toast.error("Falha ao aprovar resposta"),
  });

  const reject = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`${API_BASE}/api/whatsapp/pending-replies/${id}/reject`, {}),
    onSuccess: () => {
      toast.success("Resposta descartada");
      invalidate();
    },
    onError: () => toast.error("Falha ao rejeitar resposta"),
  });

  const replies = data?.data ?? [];
  if (!isLoading && replies.length === 0) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4 text-amber-600" />
          Respostas aguardando aprovação
          <Badge variant="secondary">{replies.length}</Badge>
        </CardTitle>
        <CardDescription>
          O assistente sugeriu estas respostas para mensagens sensíveis. Revise antes de enviar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {replies.map((reply) => (
          <div key={reply.id} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                {reply.wa_id}
              </span>
              <Badge variant={reply.intent === "urgent" ? "destructive" : "secondary"}>
                {INTENT_LABEL[reply.intent] ?? reply.intent}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              “{reply.original_message}”
            </p>
            <Textarea
              value={edits[reply.id] ?? reply.suggested_reply}
              onChange={(e) => setEdits((prev) => ({ ...prev, [reply.id]: e.target.value }))}
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => reject.mutate(reply.id)}
                disabled={reject.isPending}
              >
                <X className="w-4 h-4 mr-1" /> Descartar
              </Button>
              <Button
                size="sm"
                onClick={() => approve.mutate({ id: reply.id, reply: edits[reply.id] })}
                disabled={approve.isPending}
              >
                <Check className="w-4 h-4 mr-1" /> Aprovar e enviar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
