import type React from "react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceBlock = {
  id: string;
  type: string;
};

export function WikiEditorWorkspace({
  showPreview,
  commandBar,
  blocks,
  draggingBlockId,
  uploadInputs,
  getBlockLabel,
  onDropBlock,
  onDragStart,
  onDragEnd,
  onInsertBelow,
  onDuplicate,
  onRemove,
  renderBlockEditor,
  renderPreviewBlock,
}: {
  showPreview: boolean;
  commandBar: React.ReactNode;
  blocks: WorkspaceBlock[];
  draggingBlockId: string | null;
  uploadInputs: React.ReactNode;
  getBlockLabel: (type: string) => string;
  onDropBlock: (targetBlockId: string) => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onInsertBelow: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  renderBlockEditor: (blockId: string) => React.ReactNode;
  renderPreviewBlock: (blockId: string) => React.ReactNode;
}) {
  return (
    <div className={cn("min-h-0 flex-1", showPreview && "grid grid-cols-1 2xl:grid-cols-2")}>
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", showPreview && "2xl:border-r")}>
        <div className="relative border-b bg-muted/20 px-4 py-3">{commandBar}</div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {blocks.map((block) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => onDragStart(block.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropBlock(block.id)}
                onDragEnd={onDragEnd}
                className={cn(
                  "rounded-xl border bg-background shadow-sm transition",
                  draggingBlockId === block.id && "opacity-50",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{getBlockLabel(block.type)}</Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onInsertBelow(block.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Inserir abaixo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDuplicate(block.id)}
                      title="Duplicar bloco"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(block.id)}
                      title="Excluir bloco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3">{renderBlockEditor(block.id)}</div>
              </div>
            ))}
          </div>
        </div>

        {uploadInputs}
      </div>

      {showPreview && (
        <div className="min-h-0 overflow-auto bg-muted/10 p-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Pré-visualização por blocos
          </h3>
          <div className="space-y-4">
            {blocks.map((block) => (
              <div key={`preview-${block.id}`} className="rounded-xl border bg-background p-4">
                {renderPreviewBlock(block.id)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
