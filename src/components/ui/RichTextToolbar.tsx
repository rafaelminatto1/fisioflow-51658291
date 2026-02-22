import React from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Undo2,
    Redo2,
    AlignLeft,
    AlignCenter,
    AlignRight,
} from 'lucide-react';
import { useRichTextContext } from '@/context/RichTextContext';
import { cn } from '@/lib/utils';
import './rich-text-editor.css';

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
}) => (
    <button
        type="button"
        className={cn('rich-text-toolbar-btn', isActive && 'is-active')}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
    >
        {children}
    </button>
);

const ToolbarGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rich-text-toolbar-group">{children}</div>
);

export const RichTextToolbar: React.FC<{ className?: string }> = ({ className }) => {
    const { activeEditor: editor } = useRichTextContext();

    if (!editor) return null;

    return (
        <div
            className={cn(
                "rich-text-toolbar sticky top-0 z-50 flex flex-wrap gap-2 px-2 py-1.5 border-b border-border/40 bg-white/80 backdrop-blur-md shadow-sm transition-all duration-300",
                className
            )}
        >
            <div className="max-w-4xl mx-auto w-full flex items-center gap-2 overflow-x-auto no-scrollbar">
                {/* Text formatting */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        title="Negrito (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        title="Itálico (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive('underline')}
                        title="Sublinhado (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        title="Riscado"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        isActive={editor.isActive('highlight')}
                        title="Realçar"
                    >
                        <Highlighter className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* Headings */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                        title="Título (H2)"
                    >
                        <Heading2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        isActive={editor.isActive('heading', { level: 3 })}
                        title="Subtítulo (H3)"
                    >
                        <Heading3 className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* Lists */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        title="Lista com marcadores"
                    >
                        <List className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        title="Lista numerada"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* Alignment */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        isActive={editor.isActive({ textAlign: 'left' })}
                        title="Alinhar à esquerda"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        isActive={editor.isActive({ textAlign: 'center' })}
                        title="Centralizar"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        isActive={editor.isActive({ textAlign: 'right' })}
                        title="Alinhar à direita"
                    >
                        <AlignRight className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* Undo / Redo */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Desfazer (Ctrl+Z)"
                    >
                        <Undo2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Refazer (Ctrl+Shift+Z)"
                    >
                        <Redo2 className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>
            </div>
        </div>
    );
};
