import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { request } from "@/api/v2/base";
import { cn, safeFormat } from "@/lib/utils";

interface ConversationMessage {
  id: string;
  direction: string;
  content?: { text?: string; body?: string } | string | null;
  createdAt?: string;
}

function messageText(content: ConversationMessage["content"]): string {
  if (!content) return "(mídia)";
  if (typeof content === "string") return content;
  return content.text || content.body || "(mídia)";
}

interface TaskConversationContextProps {
  conversationId: string;
}

/**
 * Últimas mensagens da conversa vinculada à tarefa (padrão HubSpot/Pipedrive:
 * tarefa criada do inbox carrega o contexto junto).
 */
export function TaskConversationContext({ conversationId }: TaskConversationContextProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tarefa-conversation-context", conversationId],
    queryFn: async () => {
      const res = await request<{
        conversation?: { display_name?: string; patient_name?: string };
        messages?: ConversationMessage[];
      }>(`/api/whatsapp/inbox/conversations/${conversationId}?limit=5`);
      return res;
    },
    staleTime: 1000 * 60,
    retry: false,
  });

  if (isLoading) {
    return <p className="mt-2 text-xs text-muted-foreground">Carregando conversa…</p>;
  }

  const messages = (data?.messages ?? []).slice(-5);
  const contactName = data?.conversation?.patient_name || data?.conversation?.display_name;
  if (messages.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5 rounded-xl border border-border/60 bg-slate-50/60 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        <MessageSquare className="h-3 w-3" />
        Últimas mensagens{contactName ? ` — ${contactName}` : ""}
      </p>
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs",
            m.direction === "inbound"
              ? "bg-white text-foreground"
              : "bg-blue-50 text-blue-900 ml-6",
          )}
        >
          <p className="whitespace-pre-wrap break-words line-clamp-3">{messageText(m.content)}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            {safeFormat(m.createdAt, "dd/MM HH:mm")}
          </p>
        </div>
      ))}
    </div>
  );
}
