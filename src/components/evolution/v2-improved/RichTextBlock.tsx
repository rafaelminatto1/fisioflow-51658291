/**
 * RichTextBlock - Enhanced text block with rich text editor
 *
 * Same visual wrapper as TextBlock (icon, title, accent colors, badges)
 * but renders RichTextEditor (Tiptap) instead of MagicTextarea.
 */
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

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
}

export const RichTextBlock: React.FC<RichTextBlockProps> = ({
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
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn("relative transition-all duration-300 group", className)}>
      <div className="pb-1">
        <RichTextEditor
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          showToolbar={showToolbar}
          collaborationId={collaborationId}
          userName={userName}
          userColor={userColor}
          externalValueRevision={externalValueRevision}
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
};
