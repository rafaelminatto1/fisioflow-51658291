import type React from "react";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ViewerComment = {
  id: string;
  content: string;
  created_at: unknown;
  selection_text?: string | null;
  selection_start?: number | null;
  selection_end?: number | null;
};

type ViewerSelection = {
  text: string;
  start: number;
  end: number;
} | null;

export function WikiPageViewerBlock({
  blockId,
  blockLabel,
  commentCount,
  isCommenting,
  selectedRange,
  commentDraft,
  blockExcerpt,
  comments,
  onToggleComment,
  onCaptureSelection,
  onCommentDraftChange,
  onClearSelection,
  onCancelComment,
  onSubmitComment,
  formatTimestamp,
  children,
}: {
  blockId: string;
  blockLabel: string;
  commentCount: number;
  isCommenting: boolean;
  selectedRange: ViewerSelection;
  commentDraft: string;
  blockExcerpt: string;
  comments: ViewerComment[];
  onToggleComment: () => void;
  onCaptureSelection: () => void;
  onCommentDraftChange: (value: string) => void;
  onClearSelection: () => void;
  onCancelComment: () => void;
  onSubmitComment: () => void;
  formatTimestamp: (value: unknown) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-1.5 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-900/50 rounded-t-xl opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {blockLabel}
          </span>
          {commentCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 gap-1 text-[9px]">
              <MessageSquare className="h-2.5 w-2.5" />
              {commentCount}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          className="h-7 px-2 text-[10px] font-semibold text-slate-500 hover:text-primary transition-colors"
          onClick={onToggleComment}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Comentar
        </Button>
      </div>

      <div
        onMouseUp={onCaptureSelection}
        onTouchEnd={onCaptureSelection}
        onKeyUp={onCaptureSelection}
        className="p-5 md:p-6"
        data-block-id={blockId}
      >
        {children}
      </div>

      {isCommenting && (
        <div className="border-t bg-muted/20 p-3">
          <Label className="mb-2 block text-xs text-muted-foreground">
            Trecho: {selectedRange?.text || blockExcerpt || "Bloco sem texto"}
          </Label>
          {selectedRange && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Offsets no bloco: {selectedRange.start} - {selectedRange.end}
            </p>
          )}
          <Textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder="Escreva seu comentário inline..."
            className="min-h-[86px]"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            {selectedRange && (
              <Button variant="ghost" size="sm" onClick={onClearSelection}>
                Limpar seleção
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onCancelComment}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onSubmitComment}>
              Salvar comentário
            </Button>
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-2 border-t bg-muted/10 p-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border bg-background px-3 py-2 text-xs">
              {comment.selection_text && (
                <p className="mb-1 line-clamp-2 text-muted-foreground">
                  Trecho: {comment.selection_text}
                </p>
              )}
              <p className="whitespace-pre-wrap">{comment.content}</p>
              {typeof comment.selection_start === "number" &&
                typeof comment.selection_end === "number" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Offsets: {comment.selection_start} - {comment.selection_end}
                  </p>
                )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatTimestamp(comment.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
