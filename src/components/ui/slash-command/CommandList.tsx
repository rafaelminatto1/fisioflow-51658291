import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import {
    Heading2, Heading3, List, ListOrdered, Type,
    CheckSquare, Image as ImageIcon, Youtube, Link as LinkIcon, Table as TableIcon,
    Code, Quote, Minus, Info,
    Stethoscope, Dumbbell, Ruler, Home, Paperclip,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

export interface CommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    category: 'formatacao' | 'clinico' | 'media';
    /** Optional accent color classes for the icon badge */
    iconColor?: string;
    command: (props: { editor: any; range: any }) => void;
}

// ── Helper: insert heading + next block via HTML string ─

function insertClinicalBlock(
    editor: any,
    range: any,
    emoji: string,
    title: string,
    nextBlockType: 'bulletList' | 'paragraph' | 'taskList',
    defaultItems?: string[]
) {
    let nextBlockHtml = '';

    if (nextBlockType === 'bulletList') {
        nextBlockHtml = '<ul><li><p></p></li></ul>';
    } else if (nextBlockType === 'taskList') {
        const itemsHtml = defaultItems
            ? defaultItems.map(item => `<li data-type="taskItem" data-checked="false"><p>${item}</p></li>`).join('')
            : '<li data-type="taskItem" data-checked="false"><p></p></li>';
        nextBlockHtml = `<ul data-type="taskList">${itemsHtml}<li data-type="taskItem" data-checked="false"><p></p></li></ul>`;
    } else {
        nextBlockHtml = '<p></p>';
    }

    editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(`<h3>${emoji} ${title}</h3>${nextBlockHtml}`)
        .run();
}

// ── Suggestion Items ───────────────────────────────────

export const getSuggestionItems = ({ query }: { query: string }): CommandItem[] => {
    const items: CommandItem[] = [
        // ── Formatação ──
        {
            title: 'Texto',
            description: 'Comece a escrever com texto normal.',
            icon: <Type className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
            },
        },
        {
            title: 'Título 2',
            description: 'Título de seção média.',
            icon: <Heading2 className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Título 3',
            description: 'Título de seção pequena.',
            icon: <Heading3 className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Lista de Marcadores',
            description: 'Crie uma lista com marcadores simples.',
            icon: <List className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Lista Numerada',
            description: 'Crie uma lista com numeração sequencial.',
            icon: <ListOrdered className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Checklist',
            description: 'Acompanhe tarefas com uma lista de tarefas.',
            icon: <CheckSquare className="w-4 h-4" />,
            category: 'formatacao',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },

        // ── Mídia & Inserir ──
        {
            title: 'Imagem',
            description: 'Inserir uma imagem via URL.',
            icon: <ImageIcon className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-rose-50 text-rose-600 border-rose-200',
            command: ({ editor, range }) => {
                const url = window.prompt('URL da Imagem:');
                if (url) {
                    editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
                }
            },
        },
        {
            title: 'Vídeo YouTube',
            description: 'Incorporar um vídeo do YouTube.',
            icon: <Youtube className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-red-50 text-red-600 border-red-200',
            command: ({ editor, range }) => {
                const url = window.prompt('URL do YouTube:');
                if (url) {
                    editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
                }
            },
        },
        {
            title: 'Tabela',
            description: 'Inserir uma tabela 3x3.',
            icon: <TableIcon className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
            },
        },
        {
            title: 'Bloco de Código',
            description: 'Inserir um bloco de código com realce.',
            icon: <Code className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-amber-50 text-amber-600 border-amber-200',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
            },
        },
        {
            title: 'Citação',
            description: 'Inserir um bloco de citação.',
            icon: <Quote className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-slate-50 text-slate-600 border-slate-200',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: 'Divisor',
            description: 'Inserir uma linha divisória.',
            icon: <Minus className="h-4 w-4" />,
            category: 'media',
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
        {
            title: 'Callout',
            description: 'Inserir um bloco de destaque (Dica/Aviso).',
            icon: <Info className="w-4 h-4" />,
            category: 'media',
            iconColor: 'bg-sky-50 text-sky-600 border-sky-200',
            command: ({ editor, range }) => {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .insertContent('<div class="notion-callout"><span class="notion-callout-icon">💡</span><div class="notion-callout-content"><p></p></div></div>')
                    .run();
            },
        },

        // ── Blocos Clínicos ──
        {
            title: 'Procedimentos',
            description: 'Técnicas e procedimentos realizados.',
            icon: <Stethoscope className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            command: ({ editor, range }) => {
                insertClinicalBlock(editor, range, '📋', 'Procedimentos', 'taskList', [
                    'Avaliação inicial',
                    'Ultrassom terapêutico — 10 min',
                    'TENS — 20 min',
                    'Crioterapia — 15 min',
                ]);
            },
        },
        {
            title: 'Exercícios',
            description: 'Exercícios realizados na sessão.',
            icon: <Dumbbell className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
            command: ({ editor, range }) => {
                insertClinicalBlock(editor, range, '🏋️', 'Exercícios', 'taskList', [
                    'Alongamento cervical — 3x15 rep',
                    'Fortalecimento quadríceps — 3x10 rep',
                    'Mobilização articular — 2x12 rep',
                ]);
            },
        },
        {
            title: 'Medições',
            description: 'Registrar medições e testes clínicos.',
            icon: <Ruler className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-amber-50 text-amber-600 border-amber-200',
            command: ({ editor, range }) => {
                insertClinicalBlock(editor, range, '📏', 'Medições', 'bulletList');
            },
        },
        {
            title: 'Exercícios para Casa',
            description: 'Prescrever exercícios para fazer em casa.',
            icon: <Home className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-violet-50 text-violet-600 border-violet-200',
            command: ({ editor, range }) => {
                insertClinicalBlock(editor, range, '🏠', 'Exercícios para Casa', 'paragraph');
            },
        },
        {
            title: 'Anexos',
            description: 'Notas sobre anexos e arquivos.',
            icon: <Paperclip className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-rose-50 text-rose-600 border-rose-200',
            command: ({ editor, range }) => {
                insertClinicalBlock(editor, range, '📎', 'Anexos', 'paragraph');
            },
        },
    ];

    if (!query) return items;

    const q = query.toLowerCase();
    return items.filter(
        (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q),
    );
};

// ── CommandList Component ──────────────────────────────

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainer = useRef<HTMLDivElement>(null);

    const selectItem = useCallback(
        (index: number) => {
            const item = props.items[index];
            if (item) {
                props.command(item);
            }
        },
        [props],
    );

    // Reset selection when items change
    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    // Scroll selected item into view
    useEffect(() => {
        const container = scrollContainer.current;
        if (!container) return;
        const selected = container.querySelector('[data-selected="true"]') as HTMLElement;
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex(
                    (prev) => (prev + props.items.length - 1) % props.items.length,
                );
                return true;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % props.items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    // ── Empty state ──
    if (props.items.length === 0) {
        return (
            <div className="z-50 bg-white rounded-lg shadow-lg border border-border/60 p-3 w-72">
                <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum comando encontrado
                </p>
            </div>
        );
    }

    // ── Group items by category, preserving global index ──
    const groups: Array<{
        key: string;
        label: string;
        items: Array<{ item: CommandItem; globalIndex: number }>;
    }> = [];

    const formatacao: Array<{ item: CommandItem; globalIndex: number }> = [];
    const media: Array<{ item: CommandItem; globalIndex: number }> = [];
    const clinico: Array<{ item: CommandItem; globalIndex: number }> = [];

    props.items.forEach((item, idx) => {
        if (item.category === 'clinico') {
            clinico.push({ item, globalIndex: idx });
        } else if (item.category === 'media') {
            media.push({ item, globalIndex: idx });
        } else {
            formatacao.push({ item, globalIndex: idx });
        }
    });

    if (formatacao.length > 0) groups.push({ key: 'fmt', label: 'Formatação', items: formatacao });
    if (media.length > 0) groups.push({ key: 'med', label: 'Mídia & Inserir', items: media });
    if (clinico.length > 0) groups.push({ key: 'cli', label: 'Blocos Clínicos', items: clinico });

    return (
        <div
            ref={scrollContainer}
            className="z-50 bg-white rounded-lg shadow-lg border border-border/60 p-1.5 w-72 max-h-[340px] overflow-y-auto"
        >
            {groups.map((group, gi) => (
                <div key={group.key}>
                    {gi > 0 && <div className="my-1.5 mx-2 border-t border-border/40" />}

                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                        {group.label}
                    </div>

                    {group.items.map(({ item, globalIndex }) => (
                        <button
                            key={globalIndex}
                            data-selected={globalIndex === selectedIndex}
                            className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 text-sm text-left rounded-md transition-colors duration-100',
                                globalIndex === selectedIndex
                                    ? 'bg-primary/10 ring-1 ring-primary/20'
                                    : 'hover:bg-slate-50',
                            )}
                            onClick={() => selectItem(globalIndex)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                            <div
                                className={cn(
                                    'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border',
                                    item.iconColor || 'bg-slate-50 text-slate-600 border-slate-200',
                                )}
                            >
                                {item.icon}
                            </div>
                            <div className="min-w-0">
                                <div className={cn(
                                    'font-medium text-[13px] leading-tight truncate',
                                    globalIndex === selectedIndex ? 'text-primary' : 'text-slate-800',
                                )}>
                                    {item.title}
                                </div>
                                <div className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                                    {item.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
});

CommandList.displayName = 'CommandList';
