import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { 
    Dumbbell, Type, Heading1, Heading2, Heading3, List,
    CheckSquare, Search, Stethoscope,
    Table, ListOrdered, Code, Minus, Quote, Info, CheckCircle2, AlertTriangle,
    Image as ImageIcon, Link2, Video, Target, Activity, History, ClipboardCheck,
    Ruler, Sparkles, PenTool, Home
} from 'lucide-react';
import { CommandList } from './CommandList';
import { withImageParams } from '@/lib/storageProxy';
import { cn } from '@/lib/utils';
import { uploadFile, STORAGE_FOLDERS } from '@/lib/firebase/storage';

// ── Suggestion Logic ──────────────────────────────────

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
        nextBlockHtml = `<ul data-type="taskList">${itemsHtml}</ul>`;
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

function insertCallout(editor: any, range: any, type: 'info' | 'success' | 'warning') {
    const config = {
        info: { emoji: '💡', title: 'Dica', className: 'notion-callout--info', icon: <Info className="w-4 h-4" /> },
        success: { emoji: '✅', title: 'Sucesso', className: 'notion-callout--success', icon: <CheckCircle2 className="w-4 h-4" /> },
        warning: { emoji: '⚠️', title: 'Atenção', className: 'notion-callout--warning', icon: <AlertTriangle className="w-4 h-4" /> },
    }[type];

    editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(
            `<div class="notion-callout ${config.className}"><span class="notion-callout-icon">${config.emoji}</span><div class="notion-callout-content"><p><strong>${config.title}:</strong> </p></div></div>`
        )
        .run();
}

interface SlashSuggestionItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    iconColor?: string;
    keywords?: string[];
    command: ({ editor, range }: any) => void;
}

interface SuggestionRuntimeOptions {
    imageUploadFolder?: string;
}

function promptValue(message: string): string | null {
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') return null;
    const value = window.prompt(message);
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function pickLocalFile(accept: string): Promise<File | null> {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') {
            resolve(null);
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        document.body.appendChild(input);

        const cleanup = () => input.remove();

        input.onchange = () => {
            const file = input.files?.[0] ?? null;
            cleanup();
            resolve(file);
        };
        input.oncancel = () => {
            cleanup();
            resolve(null);
        };

        input.click();
    });
}

async function uploadAndInsertFile({
    editor,
    range,
    accept,
    imageUploadFolder,
    defaultFolder,
    asImage,
}: {
    editor: any;
    range: any;
    accept: string;
    imageUploadFolder?: string;
    defaultFolder: string;
    asImage: boolean;
}) {
    editor.chain().focus().deleteRange(range).run();
    const file = await pickLocalFile(accept);
    if (!file) return;

    const result = await uploadFile(file, {
        folder: imageUploadFolder || defaultFolder,
        includeUserIdPath: !imageUploadFolder,
    });

    if (asImage && file.type.startsWith('image/')) {
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
        return;
    }

    editor
        .chain()
        .focus()
        .insertContent(`<p><a href="${result.url}" target="_blank" rel="noopener noreferrer">📎 ${file.name}</a></p>`)
        .run();
}

export const getSuggestionItems = ({
    query,
    exercises,
    options,
}: {
    query: string,
    exercises?: any[],
    options?: SuggestionRuntimeOptions,
}) => {
    const imageUploadFolder = options?.imageUploadFolder;
    const items: SlashSuggestionItem[] = [
        // ── Formatação ──
        {
            title: 'Texto',
            description: 'Comece a escrever com texto normal.',
            icon: <Type className="w-4 h-4" />,
            category: 'formatacao',
            keywords: ['paragrafo', 'normal'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
            },
        },
        {
            title: 'Título 1',
            description: 'Título principal.',
            icon: <Heading1 className="w-4 h-4" />,
            category: 'formatacao',
            keywords: ['h1', 'heading 1'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Título 2',
            description: 'Título de seção média.',
            icon: <Heading2 className="w-4 h-4" />,
            category: 'formatacao',
            keywords: ['h2', 'heading 2'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Checklist',
            description: 'Acompanhe tarefas com uma lista de tarefas.',
            icon: <CheckSquare className="w-4 h-4" />,
            category: 'formatacao',
            keywords: ['todo', 'to-do', 'task'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },

        // ── Novos Comandos Clínicos Dinâmicos ──
        {
            title: 'Metas do Paciente',
            description: 'Inserir metas cadastradas do paciente.',
            icon: <Target className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-orange-50 text-orange-600 border-orange-200',
            keywords: ['objetivos', 'goals', 'metas'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__INSERT_PATIENT_METAS = true;
            },
        },
        {
            title: 'Diagnóstico',
            description: 'Inserir patologia e diagnóstico do paciente.',
            icon: <Activity className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-red-50 text-red-600 border-red-200',
            keywords: ['patologia', 'doenca', 'diagnostico'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__INSERT_PATIENT_DIAGNOSTICO = true;
            },
        },
        {
            title: 'Última Sessão',
            description: 'Replicar conduta da sessão anterior.',
            icon: <History className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-slate-50 text-slate-600 border-slate-200',
            keywords: ['anterior', 'copiar', 'replicate'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__REPLICATE_PREVIOUS_SESSION = true;
            },
        },
        {
            title: 'Sinais Vitais',
            description: 'Inserir bloco de sinais vitais (PA, FC, SatO2).',
            icon: <Activity className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            keywords: ['pressao', 'frequencia', 'temperatura'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range)
                    .insertContent('<h3>📊 Sinais Vitais</h3>')
                    .insertContent('<table class="notion-table"><tr><th>Sinal</th><th>Valor</th></tr><tr><td>PA</td><td>   /    mmHg</td></tr><tr><td>FC</td><td>   bpm</td></tr><tr><td>SatO2</td><td>   %</td></tr><tr><td>Temp</td><td>   °C</td></tr></table>')
                    .run();
            },
        },
        {
            title: 'Testes Clínicos',
            description: 'Selecionar e inserir testes ortopédicos.',
            icon: <ClipboardCheck className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
            keywords: ['avaliar', 'testes', 'ortopedico'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__OPEN_TESTS_SELECTOR = true;
            },
        },
        {
            title: 'ADM / Goniometria',
            description: 'Tabela de Amplitude de Movimento.',
            icon: <Ruler className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-amber-50 text-amber-600 border-amber-200',
            keywords: ['graus', 'movimento', 'goniometro'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range)
                    .insertContent('<h3>📏 Amplitude de Movimento</h3>')
                    .insertContent('<table class="notion-table"><tr><th>Movimento</th><th>Esq</th><th>Dir</th></tr><tr><td>Flexão</td><td>°</td><td>°</td></tr><tr><td>Extensão</td><td>°</td><td>°</td></tr></table>')
                    .run();
            },
        },
        {
            title: 'Assistente IA',
            description: 'Sugerir conduta clínica com IA.',
            icon: <Sparkles className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-violet-50 text-violet-600 border-violet-200',
            keywords: ['ia', 'ajuda', 'sugestao'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__TRIGGER_AI_CONDUCT = true;
            },
        },
        {
            title: 'Assinatura',
            description: 'Inserir assinatura profissional e data.',
            icon: <PenTool className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-slate-50 text-slate-600 border-slate-200',
            keywords: ['carimbo', 'finalizar', 'nome'],
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__INSERT_SIGNATURE = true;
            },
        },

        // ── Blocos Clínicos Tradicionais ──
        {
            title: 'Procedimentos',
            description: 'Técnicas e procedimentos realizados.',
            icon: <Stethoscope className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            command: ({ editor, range }: any) => {
                insertClinicalBlock(editor, range, '📋', 'Procedimentos', 'taskList', [
                    'Avaliação inicial',
                    'Ultrassom terapêutico — 10 min',
                ]);
            },
        },
        {
            title: 'Exercícios',
            description: 'Inserir bloco de exercícios.',
            icon: <Dumbbell className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
            command: ({ editor, range }: any) => {
                insertClinicalBlock(editor, range, '🏋️', 'Exercícios', 'taskList', [
                    'Alongamento cervical — 3x15 rep',
                    'Fortalecimento quadríceps — 3x10 rep',
                ]);
            },
        },
        {
            title: 'Exercícios para Casa',
            description: 'Prescrever exercícios para casa.',
            icon: <Home className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-violet-50 text-violet-600 border-violet-200',
            keywords: ['casa', 'home', 'orientacao'],
            command: ({ editor, range }: any) => {
                insertClinicalBlock(editor, range, '🏠', 'Exercícios para Casa', 'taskList', [
                    'Mobilidade de quadril — 3x10 rep',
                ]);
            },
        },
        {
            title: 'Biblioteca de Exercícios',
            description: 'Buscar exercícios na biblioteca completa.',
            icon: <Search className="w-4 h-4" />,
            category: 'clinico',
            iconColor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                (window as any).__OPEN_EXERCISE_LIBRARY = true;
            },
        },
    ];

    // Add matching exercises to the list if searching
    if (query && exercises) {
        const q = query.toLowerCase();
        const matchingExercises = exercises
            .filter(ex => ex.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map(ex => ({
                title: ex.name,
                description: `Exercício: ${ex.category || 'Geral'}`,
                icon: <Dumbbell className="w-4 h-4" />,
                category: 'exercicios',
                iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
                command: ({ editor, range }: any) => {
                    const insertText = `${ex.name} — 3x10 rep`;
                    const from = range.from;
                    const { $from } = editor.state.selection;
                    const isTaskItem = editor.isActive('taskItem');

                    if (isTaskItem) {
                        const start = $from.start();
                        const end = $from.end();
                        editor.chain().focus()
                            .insertContentAt({ from: start, to: end }, insertText)
                            .setTextSelection({ from: start + ex.name.length + 3, to: start + insertText.length })
                            .run();
                    } else {
                        editor.chain().focus()
                            .deleteRange(range)
                            .insertContent(`<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>${insertText}</p></li></ul>`)
                            .setTextSelection({ from: from + ex.name.length + 3, to: from + insertText.length })
                            .run();
                    }
                },
            }));
        
        items.push(...matchingExercises);
    }

    if (!query) return items;

    const q = query.toLowerCase();
    return items.filter(
        (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
};

export const getExerciseSuggestionItems = ({ query, exercises }: { query: string, exercises: any[] }) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return exercises
        .filter(ex => ex.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map(ex => ({
            title: ex.name,
            id: ex.id,
            image: ex.image_url,
            category: ex.category
        }));
};

// ── Extensions ────────────────────────────────────────

export const SlashCommand = Extension.create({
    name: 'slashCommand',
    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export const ExerciseAutocomplete = Extension.create({
    name: 'exerciseAutocomplete',
    addOptions() {
        return {
            suggestion: {
                char: '',
                pluginKey: new PluginKey('exerciseAutocomplete'),
                startOfLine: false,
                allow: ({ state, range }: any) => {
                    const $from = state.doc.resolve(range.from);
                    const isTaskItem = $from.node(-1)?.type.name === 'taskItem';
                    const text = $from.parent.textContent;
                    if (text.startsWith('/')) return false;
                    return isTaskItem && text.trim().length >= 2 && !text.includes(' — ');
                },
                command: ({ editor, range, props }: any) => {
                    const insertText = props.title + ' — 3x10 rep';
                    const from = range.from;
                    editor.chain().focus().insertContentAt(range, insertText)
                        .setTextSelection({ from: from + props.title.length + 3, to: from + insertText.length })
                        .run();
                },
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

// ── Renderers ─────────────────────────────────────────

export const suggestionConfig = (exercises: any[], options?: SuggestionRuntimeOptions) => ({
    items: ({ query }: { query: string }) => getSuggestionItems({ query, exercises, options }),
    render: () => {
        let component: ReactRenderer<any>;
        let popup: Instance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList as any, {
                    props: { ...props, editor: props.editor },
                    editor: props.editor,
                });
                if (!props.clientRect) return;
                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                    zIndex: 9999,
                    offset: [0, 8],
                });
            },
            onUpdate(props: any) {
                component.updateProps({ ...props, editor: props.editor });
                if (!props.clientRect) return;
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }
                return component.ref?.onKeyDown(props);
            },
            onExit() {
                if (popup && popup[0]) popup[0].destroy();
                if (component) component.destroy();
            },
        };
    },
});

// ── Exercise Suggestion List ──────────────────────────

export const ExerciseSuggestionList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) props.command(item);
    };
    useEffect(() => setSelectedIndex(0), [props.items]);
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
    return (
        <div className="z-[10000] bg-white rounded-lg shadow-xl border border-border/60 p-1 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500 bg-blue-50/50 mb-1 rounded flex items-center gap-1.5">
                <Dumbbell className="w-3 h-3" /> Sugestões de Exercícios
            </div>
            {props.items.length > 0 ? (
                props.items.map((item: any, index: number) => (
                    <button
                        key={index}
                        onClick={() => selectItem(index)}
                        className={cn(
                            "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left rounded-md transition-all duration-75",
                            index === selectedIndex ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-slate-50 text-slate-700"
                        )}
                    >
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40">
                            {item.image ? (
                                <img src={withImageParams(item.image, { width: 64, height: 64, fit: 'cover' })} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Dumbbell className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="truncate flex-1 min-w-0">
                            <div className="font-medium truncate text-[13px]">{item.title}</div>
                            {item.category && <div className="text-[10px] text-muted-foreground truncate">{item.category}</div>}
                        </div>
                    </button>
                ))
            ) : (
                <div className="px-2 py-3 text-sm text-muted-foreground italic text-center">Nenhum exercício encontrado</div>
            )}
        </div>
    );
});

ExerciseSuggestionList.displayName = 'ExerciseSuggestionList';

export const exerciseSuggestionConfig = (exercises: any[]) => ({
    items: ({ query }: { query: string }) => getExerciseSuggestionItems({ query, exercises }),
    render: () => {
        let component: ReactRenderer<any>;
        let popup: Instance[];
        return {
            onStart: (props: any) => {
                component = new ReactRenderer(ExerciseSuggestionList as any, {
                    props,
                    editor: props.editor,
                });
                if (!props.clientRect) return;
                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                    zIndex: 10000,
                    offset: [0, 8],
                });
            },
            onUpdate(props: any) {
                component.updateProps(props);
                if (!props.clientRect) return;
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }
                return component.ref?.onKeyDown(props);
            },
            onExit() {
                if (popup && popup[0]) popup[0].destroy();
                if (component) component.destroy();
            },
        };
    },
});
