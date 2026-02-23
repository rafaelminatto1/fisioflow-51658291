import React, { useState } from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Undo2,
    Redo2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Plus,
    Image,
    Youtube,
    Link,
    Table as TableIcon,
    Code,
    Quote,
    Info,
    ChevronDown,
    Palette,
    Minus,
    Type,
    Rows,
    Columns,
    Trash2,
} from 'lucide-react';
import { useRichTextContext } from '@/context/RichTextContext';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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

const ToolbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("rich-text-toolbar-group", className)}>{children}</div>
);

const COLORS = [
    { label: 'Padrão', color: 'inherit' },
    { label: 'Cinza', color: '#787774' },
    { label: 'Marrom', color: '#976d57' },
    { label: 'Laranja', color: '#d9730d' },
    { label: 'Amarelo', color: '#dfab01' },
    { label: 'Verde', color: '#448361' },
    { label: 'Azul', color: '#337ea9' },
    { label: 'Roxo', color: '#9065b0' },
    { label: 'Rosa', color: '#c14c8a' },
    { label: 'Vermelho', color: '#d44c47' },
];

export const RichTextToolbar: React.FC<{ className?: string }> = ({ className }) => {
    const { activeEditor: editor } = useRichTextContext();

    if (!editor) return null;

    const addImage = () => {
        const url = window.prompt('URL da Imagem:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const addYoutubeVideo = () => {
        const url = window.prompt('URL do YouTube:');
        if (url) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);

        if (url === null) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const isInTable = editor.isActive('table');

    return (
        <div
            className={cn(
                "rich-text-toolbar sticky top-0 z-50 flex flex-wrap gap-1 px-4 py-1.5 border-b border-border/40 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300",
                className
            )}
        >
            <div className="max-w-[1200px] mx-auto w-full flex items-center flex-wrap gap-x-3 gap-y-2 overflow-x-auto no-scrollbar">

                {/* ── Text Formatting ── */}
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
                </ToolbarGroup>

                {/* ── Text Styling (Sub/Super/Highlight) ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        isActive={editor.isActive('highlight')}
                        title="Realçar"
                    >
                        <Highlighter className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSubscript().run()}
                        isActive={editor.isActive('subscript')}
                        title="Subscrito"
                    >
                        <div className="relative">
                            <span className="text-xs">x</span>
                            <span className="text-[8px] absolute -bottom-1 -right-1">2</span>
                        </div>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        isActive={editor.isActive('superscript')}
                        title="Sobrescrito"
                    >
                        <div className="relative">
                            <span className="text-xs">x</span>
                            <span className="text-[8px] absolute -top-1 -right-1">2</span>
                        </div>
                    </ToolbarButton>

                    {/* Color Picker Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="rich-text-toolbar-btn group" title="Cor do texto">
                                <Palette className="h-4 w-4" style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }} />
                                <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.color}
                                        className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.color === 'inherit' ? '#fff' : c.color }}
                                        onClick={() => {
                                            if (c.color === 'inherit') {
                                                editor.chain().focus().unsetColor().run();
                                            } else {
                                                editor.chain().focus().setColor(c.color).run();
                                            }
                                        }}
                                        title={c.label}
                                    >
                                        {c.color === 'inherit' && <Minus className="h-4 w-4 text-slate-300" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </ToolbarGroup>

                {/* ── Headings ── */}
                <ToolbarGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long group px-2 flex items-center gap-2 min-w-[100px]" title="Tipo de texto">
                                <Type className="h-4 w-4" />
                                <span className="text-xs font-medium truncate">
                                    {editor.isActive('heading', { level: 1 }) ? 'Título 1' :
                                        editor.isActive('heading', { level: 2 }) ? 'Título 2' :
                                            editor.isActive('heading', { level: 3 }) ? 'Título 3' : 'Parágrafo'}
                                </span>
                                <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                                <Type className="h-4 w-4 mr-2" /> Parágrafo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="font-bold text-lg">
                                <Heading1 className="h-4 w-4 mr-2" /> Título 1
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="font-semibold text-base">
                                <Heading2 className="h-4 w-4 mr-2" /> Título 2
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="font-medium text-sm">
                                <Heading3 className="h-4 w-4 mr-2" /> Título 3
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>

                {/* ── Lists ── */}
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
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive('taskList')}
                        title="Lista de tarefas"
                    >
                        <CheckSquare className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Alignment ── */}
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
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        isActive={editor.isActive({ textAlign: 'justify' })}
                        title="Justificar"
                    >
                        <AlignJustify className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Insert Menu ── */}
                <ToolbarGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long bg-primary/5 text-primary hover:bg-primary/10 px-2 flex items-center gap-1.5" title="Inserir mídia ou blocos">
                                <Plus className="h-4 w-4" />
                                <span className="text-xs font-semibold">Inserir</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem onClick={addImage}>
                                <Image className="h-4 w-4 mr-2 text-rose-500" /> Imagem (URL)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={addYoutubeVideo}>
                                <Youtube className="h-4 w-4 mr-2 text-red-600" /> Vídeo YouTube
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={setLink}>
                                <Link className="h-4 w-4 mr-2 text-blue-500" /> Hyperlink
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                                <TableIcon className="h-4 w-4 mr-2 text-emerald-500" /> Tabela
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                                <Code className="h-4 w-4 mr-2 text-amber-600" /> Bloco de Código
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                                <Quote className="h-4 w-4 mr-2 text-slate-400" /> Citação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                                <Minus className="h-4 w-4 mr-2 text-slate-300" /> Linha Divisória
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<div class="notion-callout"><span class="notion-callout-icon">💡</span><div class="notion-callout-content"><p></p></div></div>').run()}>
                                <Info className="h-4 w-4 mr-2 text-sky-500" /> Callout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>

                {/* ── Contextual Table Actions ── */}
                {isInTable && (
                    <ToolbarGroup className="bg-emerald-50/50 border-emerald-100 px-1 py-0.5 rounded-md animate-in slide-in-from-left-2 duration-300">
                        <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Adicionar linha acima">
                            <Rows className="h-4 w-4 rotate-180" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha abaixo">
                            <Rows className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Adicionar coluna à esquerda">
                            <Columns className="h-4 w-4 -rotate-90" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna à direita">
                            <Columns className="h-4 w-4 rotate-90" />
                        </ToolbarButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="rich-text-toolbar-btn text-rose-600" title="Excluir...">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-rose-600">
                                    Excluir Linha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-rose-600">
                                    Excluir Coluna
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-rose-700 font-bold">
                                    Excluir Tabela Completa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                )}

                {/* ── History (Undo / Redo) ── */}
                <ToolbarGroup className="ml-auto">
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
