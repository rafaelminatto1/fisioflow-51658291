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
}

export const RichTextBlock: React.FC<RichTextBlockProps> = ({
  placeholder,
  value,
  onValueChange,
  disabled,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn("relative transition-all duration-300 group", className)}>
      {/* Content – Rich Text Editor */}
      <div className="pb-1">
        <RichTextEditor
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "transition-all duration-200 border-transparent hover:bg-slate-50",
            isFocused && "bg-white ring-1 ring-slate-200 shadow-sm",
          )}
        />
      </div>
    </div>
  );
};
