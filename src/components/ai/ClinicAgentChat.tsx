import { useRef, useState } from "react";
import { getWorkersApiUrl } from "@/lib/api/config";
import { Bot, Loader2, SendHorizonal, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/v2/client";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  sources?: Array<{ title: string; slug: string }>;
}

const API_BASE = getWorkersApiUrl();

export function ClinicAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiClient.post<{
        data: { reply: string; sources?: Array<{ title: string; slug: string }> };
      }>(`${API_BASE}/api/agents/clinic/chat`, { message });
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: res.data.reply, sources: res.data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Não consegui responder agora. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-4 h-4 text-blue-600" />
          Agente da Clínica
        </CardTitle>
        <CardDescription>
          Pergunte sobre operações, protocolos e conteúdo da base clínica.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div ref={listRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ex.: “qual o protocolo para LCA pós-operatório?”
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "agent" && <Bot className="w-4 h-4 mt-1 text-blue-600 shrink-0" />}
              <div
                data-testid={msg.role === "agent" ? "clinic-chat-message" : undefined}
                className={`rounded-xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
                {msg.sources && msg.sources.length > 0 && (
                  <span className="block mt-1.5 text-[11px] opacity-75">
                    Fontes: {msg.sources.map((s) => s.title).join(" · ")}
                  </span>
                )}
              </div>
              {msg.role === "user" && <User className="w-4 h-4 mt-1 text-slate-400 shrink-0" />}
            </div>
          ))}
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao agente..."
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <SendHorizonal className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
