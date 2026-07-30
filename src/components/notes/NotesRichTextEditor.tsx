import { forwardRef, useMemo } from "react";
import type YProvider from "y-partyserver/provider";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/ui/RichTextEditor";
import { cn } from "@/lib/utils";

export type NotesCollaborationStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface NotesRichTextEditorProps {
  /** Conteúdo HTML controlado e persistido da nota. */
  contentHtml: string;
  /** Recebe o HTML após a edição local ou uma atualização colaborativa. */
  onContentHtmlChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** ID estável da nota para a sala colaborativa. Omitir mantém o modo local. */
  collaborationId?: string;
  collaborationPath?: string;
  collaborationTicketPath?: string;
  /** Notas não persistem localmente até existir dispositivo confiável. */
  offlinePersistence?: boolean;
  offlinePersistenceKey?: string;
  collaboratorName?: string;
  collaboratorColor?: string;
  collaborationStatus?: NotesCollaborationStatus;
  /** Texto curto apresentado no indicador de salvamento. */
  saveStatus?: "saved" | "saving" | "unsaved" | "error";
  externalValueRevision?: number;
  onCollaborationStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
  onCollaborationProviderChange?: (provider: YProvider | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const collaborationCopy: Record<NotesCollaborationStatus, string> = {
  idle: "Edição individual",
  connecting: "Conectando colaboração",
  connected: "Colaboração ativa",
  disconnected: "Colaboração indisponível",
  error: "Não foi possível conectar à colaboração",
};

const saveCopy: Record<NonNullable<NotesRichTextEditorProps["saveStatus"]>, string> = {
  saved: "Tudo salvo",
  saving: "Salvando alterações",
  unsaved: "Alterações não salvas",
  error: "Falha ao salvar",
};

/**
 * Superfície de edição das notas. Mantém o contrato HTML simples para a página
 * e concentra os detalhes de colaboração e feedback de salvamento.
 */
export const NotesRichTextEditor = forwardRef<RichTextEditorHandle, NotesRichTextEditorProps>(({
  contentHtml,
  onContentHtmlChange,
  placeholder = "Escreva / para comandos, @ para mencionar…",
  disabled = false,
  className,
  collaborationId,
  collaborationPath,
  collaborationTicketPath,
  offlinePersistence = false,
  offlinePersistenceKey,
  collaboratorName,
  collaboratorColor,
  collaborationStatus = collaborationId ? "connecting" : "idle",
  saveStatus = "saved",
  externalValueRevision,
  onCollaborationStatusChange,
  onCollaborationProviderChange,
  onFocus,
  onBlur,
}, ref) => {
  const status = useMemo(() => ({
    collaboration: collaborationCopy[collaborationStatus],
    save: saveCopy[saveStatus],
  }), [collaborationStatus, saveStatus]);

  const collaborationTone = collaborationStatus === "connected"
    ? "bg-emerald-500"
    : collaborationStatus === "error" || collaborationStatus === "disconnected"
      ? "bg-amber-500"
      : "bg-slate-400";
  const saveTone = saveStatus === "error"
    ? "text-rose-700"
    : saveStatus === "unsaved"
      ? "text-amber-700"
      : "text-slate-500";

  return (
    <section
      aria-label="Editor de conteúdo da nota"
      className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}
    >
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2" aria-live="polite">
          <span className={cn("size-2 shrink-0 rounded-full", collaborationTone)} aria-hidden="true" />
          <span className="truncate text-xs font-medium text-slate-600">{status.collaboration}</span>
        </div>
        <span className={cn("shrink-0 text-xs", saveTone)} aria-live="polite">{status.save}</span>
      </div>

      <RichTextEditor
        key={collaborationId ?? "notes-local"}
        ref={ref}
        value={contentHtml}
        onValueChange={onContentHtmlChange}
        placeholder={placeholder}
        disabled={disabled}
        showToolbar
        collaborationId={collaborationId}
        collaborationPath={collaborationPath}
        collaborationTicketPath={collaborationTicketPath}
        offlinePersistence={offlinePersistence}
        offlinePersistenceKey={offlinePersistenceKey}
        userName={collaboratorName}
        userColor={collaboratorColor}
        externalValueRevision={externalValueRevision}
        onCollabStatusChange={onCollaborationStatusChange}
        onCollabProviderChange={onCollaborationProviderChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="min-h-[22rem] border-0 shadow-none"
      />
    </section>
  );
});

NotesRichTextEditor.displayName = "NotesRichTextEditor";
