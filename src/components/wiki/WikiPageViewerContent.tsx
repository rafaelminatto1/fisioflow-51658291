import {
  Clock as ClockIcon,
  Eye,
  History as HistoryIcon,
  Share2 as ShareIcon,
  Edit as EditIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WikiPageViewerBlock } from "@/components/wiki/WikiPageViewerBlock";
import type { WikiComment, WikiPage, WikiPageVersion } from "@/types/wiki";

type BlockTextSelection = {
  text: string;
  start: number;
  end: number;
};

type ViewerBlock = {
  id: string;
  type: string;
};

export function WikiPageViewerContent({
  page,
  blocks,
  versions,
  commentsByBlock,
  activeCommentBlockId,
  commentDraftsByBlock,
  selectedTextByBlock,
  blockContentRefs,
  onEdit,
  onToggleComment,
  onCaptureSelection,
  onCommentDraftChange,
  onClearSelection,
  onCancelComment,
  onSubmitComment,
  formatTimestamp,
  getBlockLabel,
  getBlockExcerpt,
  isEvidencePage,
  renderBlock,
  renderHistoryDiff,
}: {
  page: WikiPage;
  blocks: ViewerBlock[];
  versions: WikiPageVersion[];
  commentsByBlock: Record<string, WikiComment[]>;
  activeCommentBlockId: string | null;
  commentDraftsByBlock: Record<string, string>;
  selectedTextByBlock: Record<string, BlockTextSelection>;
  blockContentRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onEdit: () => void;
  onToggleComment: (blockId: string) => void;
  onCaptureSelection: (blockId: string) => void;
  onCommentDraftChange: (blockId: string, value: string) => void;
  onClearSelection: (blockId: string) => void;
  onCancelComment: () => void;
  onSubmitComment: (blockId: string) => void;
  formatTimestamp: (value: unknown) => string;
  getBlockLabel: (type: string) => string;
  getBlockExcerpt: (blockId: string) => string;
  isEvidencePage: (page: Pick<WikiPage, "slug">) => boolean;
  renderBlock: (blockId: string) => React.ReactNode;
  renderHistoryDiff: (page: WikiPage, versions: WikiPageVersion[]) => React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {page.icon && (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl shadow-sm">
                {page.icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {page.category && (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wider"
                  >
                    {page.category}
                  </Badge>
                )}
                {isEvidencePage(page) && (
                  <Badge className="bg-emerald-600 px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wider">
                    Trilha Clínica
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                {page.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <ClockIcon className="h-3.5 w-3.5" />
              Atualizado em {formatTimestamp(page.updated_at)}
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Eye className="h-3.5 w-3.5" />
              {page.view_count} visualizações
            </div>
            {page.version > 1 && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <HistoryIcon className="h-3.5 w-3.5" />v{page.version}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="shadow-sm gap-2">
            <EditIcon className="h-4 w-4" />
            Editar Página
          </Button>
          <Button variant="ghost" size="sm" className="shadow-sm">
            <ShareIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {page.clinical_metadata && Object.keys(page.clinical_metadata).length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">
              Alvo RPE (Borg)
            </p>
            <p className="text-2xl font-black text-primary">
              {page.clinical_metadata.rpe_target || "—"}
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">
              Regra de Progressão
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {page.clinical_metadata.progression_rule || "Manual"}
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">
              Evidência Científica
            </p>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-white font-black px-1.5 py-0">
                {page.clinical_metadata.evidence_level || "?"}
              </Badge>
              <p className="text-xs font-medium text-muted-foreground">
                {page.clinical_metadata.evidence_level === "A"
                  ? "Evidência Forte"
                  : page.clinical_metadata.evidence_level === "B"
                    ? "Evidência Moderada"
                    : page.clinical_metadata.evidence_level === "C"
                      ? "Evidência Fraca"
                      : page.clinical_metadata.evidence_level === "D"
                        ? "Consenso Teórico"
                        : "Não especificado"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {blocks.map((block) => {
          const blockComments = commentsByBlock[block.id] || [];
          const isCommenting = activeCommentBlockId === block.id;
          const selectedRange = selectedTextByBlock[block.id];

          return (
            <WikiPageViewerBlock
              key={block.id}
              blockId={block.id}
              blockLabel={getBlockLabel(block.type)}
              commentCount={blockComments.length}
              isCommenting={isCommenting}
              selectedRange={selectedRange ?? null}
              commentDraft={commentDraftsByBlock[block.id] || ""}
              blockExcerpt={getBlockExcerpt(block.id)}
              comments={blockComments}
              onToggleComment={() => onToggleComment(block.id)}
              onCaptureSelection={() => onCaptureSelection(block.id)}
              onCommentDraftChange={(value) => onCommentDraftChange(block.id, value)}
              onClearSelection={() => onClearSelection(block.id)}
              onCancelComment={onCancelComment}
              onSubmitComment={() => onSubmitComment(block.id)}
              formatTimestamp={formatTimestamp}
            >
              <div
                ref={(element) => {
                  blockContentRefs.current[block.id] = element;
                }}
              >
                {renderBlock(block.id)}
              </div>
            </WikiPageViewerBlock>
          );
        })}
      </div>

      {page.tags.length > 0 && (
        <div className="mt-8 border-t pt-8">
          <div className="flex flex-wrap gap-2">
            {page.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">{renderHistoryDiff(page, versions)}</div>
    </div>
  );
}
