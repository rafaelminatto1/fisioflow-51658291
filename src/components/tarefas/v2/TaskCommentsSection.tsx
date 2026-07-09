import { useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Trash2, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, safeFormat } from "@/lib/utils";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import type { TeamMember } from "@/types/tarefas";
import {
  useTarefaComments,
  useCreateTarefaComment,
  useDeleteTarefaComment,
} from "@/hooks/useTarefas";
import { useAuth } from "@/contexts/AuthContext";

interface TaskCommentsSectionProps {
  tarefaId: string | undefined;
  teamMembers: TeamMember[];
}

/** Última menção "@texto" ainda sendo digitada (para autocomplete). */
function pendingMentionQuery(text: string): string | null {
  const match = text.match(/@([\p{L}\d]*)$/u);
  return match ? match[1] : null;
}

export function TaskCommentsSection({ tarefaId, teamMembers }: TaskCommentsSectionProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useTarefaComments(tarefaId);
  const createComment = useCreateTarefaComment(tarefaId);
  const deleteComment = useDeleteTarefaComment(tarefaId);

  const [content, setContent] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionQuery = pendingMentionQuery(content);
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return teamMembers
      .filter((m) => mentionQuery === "" || accentIncludes(m.full_name, mentionQuery))
      .slice(0, 6);
  }, [mentionQuery, teamMembers]);

  const pickMention = (member: TeamMember) => {
    setContent((prev) => prev.replace(/@[\p{L}\d]*$/u, `@${member.full_name} `));
    setMentionIds((prev) => (prev.includes(member.id) ? prev : [...prev, member.id]));
    textareaRef.current?.focus();
  };

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed || !tarefaId) return;
    createComment.mutate(
      { content: trimmed, mentions: mentionIds },
      {
        onSuccess: () => {
          setContent("");
          setMentionIds([]);
        },
      },
    );
  };

  const memberName = (id: string) => teamMembers.find((m) => m.id === id)?.full_name ?? id;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando comentários…</p>}
        {!isLoading && (comments?.length ?? 0) === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sem comentários ainda. Use @ para mencionar alguém.</p>
          </div>
        )}
        {comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3 rounded-xl border p-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">
                {(comment.author_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{comment.author_name ?? "Membro"}</span>
                <span className="text-xs text-muted-foreground">
                  {safeFormat(comment.created_at, "dd/MM/yyyy HH:mm")}
                </span>
                {(comment.author_id === user?.uid || user?.role === "admin") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 text-muted-foreground hover:text-red-600"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
              {comment.mentions?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {comment.mentions.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 text-[10px]">
                      <AtSign className="h-2.5 w-2.5" />
                      {memberName(id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative space-y-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Escreva um comentário… (@nome para mencionar, Ctrl+Enter envia)"
          className="min-h-[80px] rounded-xl"
        />
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 z-30 mb-1 w-64 rounded-xl border bg-background p-1 shadow-lg">
            {suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMention(m)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                {m.full_name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {mentionIds.map((id) => (
              <Badge key={id} variant="secondary" className={cn("gap-1 text-[10px]")}>
                <AtSign className="h-2.5 w-2.5" />
                {memberName(id)}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            onClick={submit}
            disabled={!content.trim() || createComment.isPending}
            className="gap-1.5 rounded-xl"
          >
            <Send className="h-3.5 w-3.5" />
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}
