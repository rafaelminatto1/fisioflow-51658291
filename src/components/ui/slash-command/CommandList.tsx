import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { Heading2, Heading3, List, ListOrdered, Type, Code } from 'lucide-react';

export interface CommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (props: { editor: any; range: any }) => void;
}

export const getSuggestionItems = ({ query }: { query: string }): CommandItem[] => {
    return [
        {
            title: 'Texto',
            description: 'Comece a escrever com texto normal.',
            icon: <Type className="w-4 h-4" />,
            command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
            },
        },
        {
            title: 'Título 2',
            description: 'Título de seção média.',
            icon: <Heading2 className="w-4 h-4" />,
            command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Título 3',
            description: 'Título de seção pequena.',
            icon: <Heading3 className="w-4 h-4" />,
            command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Lista de Marcadores',
            description: 'Crie uma lista com marcadores simples.',
            icon: <List className="w-4 h-4" />,
            command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Lista Numerada',
            description: 'Crie uma lista com numeração sequencial.',
            icon: <ListOrdered className="w-4 h-4" />,
            command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
    ].filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()));
};

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    if (props.items.length === 0) {
        return null;
    }

    return (
        <div className="z-50 bg-white rounded-md shadow-md border border-border p-1 w-64 max-h-80 overflow-y-auto">
            {props.items.map((item, index) => (
                <button
                    key={index}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-sm',
                        index === selectedIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                    )}
                    onClick={() => selectItem(index)}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded border border-border bg-background">
                        {item.icon}
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">{item.title}</div>
                        <div className="text-xs text-slate-500 m-0 leading-tight">{item.description}</div>
                    </div>
                </button>
            ))}
        </div>
    );
});

CommandList.displayName = 'CommandList';
