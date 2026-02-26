/**
 * RichTextBlock - Enhanced text block with rich text editor
 *
 * Same visual wrapper as TextBlock (icon, title, accent colors, badges)
 * but renders RichTextEditor (Tiptap) instead of MagicTextarea.
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

interface RichTextBlockProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    placeholder: string;
    hint: string;
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    accentColor?: string;
}

export const RichTextBlock: React.FC<RichTextBlockProps> = ({
    icon,
    iconBg,
    title,
    placeholder,
    hint,
    value,
    onValueChange,
    disabled,
    className,
    accentColor = 'primary',
}) => {
    const [isFocused, setIsFocused] = useState(false);

    // Check if content is present (strip HTML tags for the check)
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();
    const hasContent = value ? stripHtml(value).length > 0 : false;

    const accentColors: Record<string, { from: string; to: string }> = {
        primary: { from: 'from-primary/60', to: 'to-primary' },
        sky: { from: 'from-sky-500/60', to: 'to-sky-500' },
        violet: { from: 'from-violet-500/60', to: 'to-violet-500' },
        amber: { from: 'from-amber-500/60', to: 'to-amber-500' },
    };

    const colors = accentColors[accentColor] || accentColors.primary;

    return (
        <div
            className={cn(
                'relative transition-all duration-300 group',
                className
            )}
        >
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
                        'transition-all duration-200 border-transparent hover:bg-slate-50',
                        isFocused && 'bg-white ring-1 ring-slate-200 shadow-sm'
                    )}
                />
            </div>
        </div>
    );
};
