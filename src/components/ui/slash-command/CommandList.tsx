import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────

export interface CommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    iconColor?: string;
    command: (props: { editor: any; range: any }) => void;
}

// ── CommandList Component ──────────────────────────────

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
    editor: any;
}

export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainer = useRef<HTMLDivElement>(null);

    const selectItem = useCallback(
        (index: number) => {
            const item = props.items[index];
            if (item) {
                if (item.title === 'Biblioteca de Exercícios') {
                    // Signal to RichTextEditor
                    (window as any).__OPEN_EXERCISE_LIBRARY = true;
                    props.command(item);
                } else {
                    props.command(item);
                }
            }
        },
        [props],
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

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
                setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length);
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

    const groups: Array<{
        key: string;
        label: string;
        items: Array<{ item: CommandItem; globalIndex: number }>;
    }> = [];

    const formatacao: Array<{ item: CommandItem; globalIndex: number }> = [];
    const media: Array<{ item: CommandItem; globalIndex: number }> = [];
    const clinico: Array<{ item: CommandItem; globalIndex: number }> = [];
    const exercicios: Array<{ item: CommandItem; globalIndex: number }> = [];

    props.items.forEach((item, idx) => {
        if (item.category === 'clinico') clinico.push({ item, globalIndex: idx });
        else if (item.category === 'exercicios') exercicios.push({ item, globalIndex: idx });
        else if (item.category === 'media') media.push({ item, globalIndex: idx });
        else formatacao.push({ item, globalIndex: idx });
    });

    if (formatacao.length > 0) groups.push({ key: 'fmt', label: 'Formatação', items: formatacao });
    if (media.length > 0) groups.push({ key: 'med', label: 'Mídia & Inserir', items: media });
    if (clinico.length > 0) groups.push({ key: 'cli', label: 'Blocos Clínicos', items: clinico });
    if (exercicios.length > 0) groups.push({ key: 'exs', label: 'Exercícios Sugeridos', items: exercicios });

    return (
        <div
            ref={scrollContainer}
            className="z-50 bg-white rounded-lg shadow-lg border border-border/60 p-1.5 w-72 max-h-[340px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
            {props.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum comando encontrado</p>
            )}
            {groups.map((group, gi) => (
                <div key={group.key}>
                    {gi > 0 && <div className="my-1.5 mx-2 border-t border-border/40" />}
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">{group.label}</div>
                    {group.items.map(({ item, globalIndex }) => (
                        <button
                            key={globalIndex}
                            data-selected={globalIndex === selectedIndex}
                            className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 text-sm text-left rounded-md transition-colors duration-100',
                                globalIndex === selectedIndex ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-slate-50',
                            )}
                            onClick={() => selectItem(globalIndex)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                            <div className={cn('flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border', item.iconColor || 'bg-slate-50 text-slate-600 border-slate-200')}>{item.icon}</div>
                            <div className="min-w-0">
                                <div className={cn('font-medium text-[13px] leading-tight truncate', globalIndex === selectedIndex ? 'text-primary' : 'text-slate-800')}>{item.title}</div>
                                <div className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{item.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
});

CommandList.displayName = 'CommandList';
