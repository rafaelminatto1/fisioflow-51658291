/**
 * RichTextBlock - Enhanced text block with rich text editor
 *
 * Same visual wrapper as TextBlock (icon, title, accent colors, badges)
 * but renders RichTextEditor (Tiptap) instead of MagicTextarea.
 */
import React, { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/ui/RichTextEditor";
import type YProvider from "y-partyserver/provider";

interface RichTextBlockProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
  showToolbar?: boolean;
  collaborationId?: string;
  userName?: string;
  userColor?: string;
  externalValueRevision?: number;
  onCollabStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
  onCollabProviderChange?: (provider: YProvider | null) => void;
}

export const RichTextBlock = forwardRef<RichTextEditorHandle, RichTextBlockProps>(({
  placeholder,
  value,
  onValueChange,
  disabled,
  className,
  editorClassName,
  showToolbar = false,
  collaborationId,
  userName,
  userColor,
  externalValueRevision,
  onCollabStatusChange,
  onCollabProviderChange,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn("relative transition-all duration-300 group", className)}>
      <div className="pb-1">
        <RichTextEditor
          // Força um remount completo (novo Y.Doc/provider) ao trocar entre
          // modo clássico e colaborativo, ou entre sessões colaborativas —
          // evita reaproveitar uma instância cujo `useEditor` já rodou sem a
          // extensão Collaboration da nova sessão.
          key={collaborationId ?? "classic"}
          ref={ref}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          showToolbar={showToolbar}
          collaborationId={collaborationId}
          userName={userName}
          userColor={userColor}
          externalValueRevision={externalValueRevision}
          onCollabStatusChange={onCollabStatusChange}
          onCollabProviderChange={onCollabProviderChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "transition-all duration-200 border-transparent hover:bg-slate-50",
            isFocused && "bg-white ring-1 ring-slate-200 shadow-sm",
            editorClassName,
          )}
        />
      </div>
    </div>
  );
});

RichTextBlock.displayName = "RichTextBlock";
