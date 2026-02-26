/**
 * RichTextEditor - Reusable Tiptap-based rich text editor
 */
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { CustomTaskItem } from './CustomTaskItem';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Youtube } from '@tiptap/extension-youtube';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Dumbbell, Search, Target, Activity, History, ClipboardCheck, Sparkles, PenTool, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRichTextContext } from '@/context/RichTextContext';
import { SlashCommand, suggestionConfig, ExerciseAutocomplete, exerciseSuggestionConfig } from './slash-command/suggestion';
import { useExercises } from '@/hooks/useExercises';
import { usePatientGoals, usePatientPathologies } from '@/hooks/usePatientEvolution';
import { useSoapRecords } from '@/hooks/useSoapRecords';
import { useStandardizedTests } from '@/hooks/useStandardizedTests';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { 
    Command, 
    CommandEmpty, 
    CommandGroup, 
    CommandInput, 
    CommandItem, 
    CommandList as UICommandList 
} from "@/components/ui/command";
import { Button } from '@/components/ui/button';
import { withImageParams } from '@/lib/storageProxy';
import { toast } from 'sonner';
import './rich-text-editor.css';

const lowlight = createLowlight(common);

const ForceListContinue = Extension.create({
    name: 'forceListContinue',
    priority: 1000,
    addKeyboardShortcuts() {
        return {
            Enter: () => {
                const { state, commands } = this.editor;
                const { selection } = state;
                if (!selection.empty) return false;
                const { $from } = selection;
                const parent = $from.parent;
                const parentType = parent.type.name;
                const isListItem = parentType === 'listItem';
                const isTaskItem = parentType === 'taskItem';
                if (!isListItem && !isTaskItem) return false;
                const text = parent.textContent.replace(/\u200b/g, '').trim();
                if (text.length > 0) return false;
                if (isTaskItem) return commands.splitListItem('taskItem');
                return commands.splitListItem('listItem');
            },
        };
    },
});

interface RichTextEditorProps {
    value: string;
    onValueChange: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
    imageUploadFolder?: string;
    patientId?: string;
    className?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    accentColor?: 'sky' | 'violet' | 'amber' | 'rose';
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onValueChange,
    placeholder = '',
    disabled = false,
    imageUploadFolder,
    patientId,
    className,
    onFocus,
    onBlur,
    accentColor = 'violet',
}) => {
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSentValue = useRef(value);
    const isUpdatingFromProp = useRef(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const context = useRichTextContext();
    const setActiveEditor = context?.setActiveEditor;
    
    // Data Hooks
    const { exercises } = useExercises();
    const { data: goals = [] } = usePatientGoals(patientId || '');
    const { data: pathologies = [] } = usePatientPathologies(patientId || '');
    const { data: evolutions = [] } = useSoapRecords(patientId || '', 5);
    
    // UI Modals State
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [librarySearch, setLibrarySearch] = useState("");
    const [testsOpen, setTestsOpen] = useState(false);

    const handleInput = useCallback(() => {
        setIsTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
    }, []);

    const getAccentGlow = () => {
        const colors = {
            sky: 'hsl(199, 89%, 48%)',
            violet: 'hsl(263, 70%, 50%)',
            amber: 'hsl(38, 92%, 50%)',
            rose: 'hsl(346, 77%, 49%)',
        };
        return colors[accentColor];
    };

    const extensions = useMemo(() => [
        ForceListContinue,
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            link: false,
            underline: false,
            codeBlock: false,
        }),
        Placeholder.configure({ placeholder }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        Subscript,
        Superscript,
        Link.configure({
            openOnClick: false,
            HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
        }),
        Image.configure({
            allowBase64: true,
            HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4 mx-auto block' },
        }),
        Youtube.configure({
            HTMLAttributes: { class: 'rounded-lg max-w-full my-4 mx-auto block aspect-video' },
        }),
        TaskList.configure({
            HTMLAttributes: { class: 'notion-task-list' },
        }),
        CustomTaskItem.configure({
            nested: true,
            HTMLAttributes: { class: 'notion-task-item' },
        }),
        Table.configure({
            resizable: true,
            HTMLAttributes: { class: 'notion-table' },
        }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
            lowlight,
            HTMLAttributes: { class: 'notion-code-block' },
        }),
        SlashCommand.configure({
            suggestion: suggestionConfig(exercises, { imageUploadFolder }),
        }),
        ExerciseAutocomplete.configure({
            suggestion: exerciseSuggestionConfig(exercises),
        }),
    ], [exercises, placeholder, imageUploadFolder]);

    const editor = useEditor({
        extensions,
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
            if (isUpdatingFromProp.current) return;
            const html = ed.getHTML();
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                const normalized = html === '<p></p>' ? '' : html;
                lastSentValue.current = normalized;
                onValueChange(normalized);
            }, 500);
        },
        onFocus: () => {
            onFocus?.();
            if (editor) setActiveEditor?.(editor);
        },
        onBlur: () => onBlur?.(),
        editorProps: {
            attributes: { class: 'outline-none' },
        },
    });

    // ── Signal Listeners ─────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            if (!editor?.isFocused) return;

            // 1. Biblioteca
            if ((window as any).__OPEN_EXERCISE_LIBRARY) {
                (window as any).__OPEN_EXERCISE_LIBRARY = false;
                setLibraryOpen(true);
            }

            // 2. Metas
            if ((window as any).__INSERT_PATIENT_METAS) {
                (window as any).__INSERT_PATIENT_METAS = false;
                if (goals.length > 0) {
                    const html = `<h3>🎯 Metas de Tratamento</h3><ul data-type="taskList">${goals.map(g => 
                        `<li data-type="taskItem" data-checked="${g.status === 'concluido'}"><p>${g.description}</p></li>`
                    ).join('')}</ul>`;
                    editor.chain().focus().insertContent(html).run();
                    toast.success('Metas inseridas');
                } else {
                    toast.error('Nenhuma meta cadastrada para este paciente');
                }
            }

            // 3. Diagnóstico
            if ((window as any).__INSERT_PATIENT_DIAGNOSTICO) {
                (window as any).__INSERT_PATIENT_DIAGNOSTICO = false;
                if (pathologies.length > 0) {
                    const html = `<h3>📋 Diagnóstico Clínico</h3>${pathologies.map(p => 
                        `<div class="notion-callout notion-callout--info"><span class="notion-callout-icon">🩺</span><div class="notion-callout-content"><p><strong>${p.name}:</strong> ${p.description || 'Sem descrição'}</p></div></div>`
                    ).join('')}`;
                    editor.chain().focus().insertContent(html).run();
                    toast.success('Diagnóstico inserido');
                } else {
                    toast.error('Nenhuma patologia cadastrada para este paciente');
                }
            }

            // 4. Última Sessão
            if ((window as any).__REPLICATE_PREVIOUS_SESSION) {
                (window as any).__REPLICATE_PREVIOUS_SESSION = false;
                const lastSession = evolutions[0];
                if (lastSession) {
                    editor.chain().focus()
                        .insertContent('<h3>🔄 Replicado da Última Sessão</h3>')
                        .insertContent(lastSession.plan || 'Sem conduta registrada na última sessão')
                        .run();
                    toast.success('Conduta anterior replicada');
                } else {
                    toast.error('Nenhuma sessão anterior encontrada');
                }
            }

            // 5. Testes
            if ((window as any).__OPEN_TESTS_SELECTOR) {
                (window as any).__OPEN_TESTS_SELECTOR = false;
                setTestsOpen(true);
            }

            // 6. IA Assistente
            if ((window as any).__TRIGGER_AI_CONDUCT) {
                (window as any).__TRIGGER_AI_CONDUCT = false;
                toast.info('Solicitando sugestão à IA...');
                // Simulação de chamada de IA - Em produção chamaria patient-summary ou similar
                setTimeout(() => {
                    const aiHtml = `<div class="notion-callout notion-callout--info" style="border-left-color: #8b5cf6"><span class="notion-callout-icon">✨</span><div class="notion-callout-content"><p><strong>Sugestão da IA:</strong> Baseado na evolução estável, recomendo progressão de carga nos exercícios de agachamento e início de treino de equilíbrio dinâmico.</p></div></div>`;
                    editor.chain().focus().insertContent(aiHtml).run();
                }, 1500);
            }

            // 7. Assinatura
            if ((window as any).__INSERT_SIGNATURE) {
                (window as any).__INSERT_SIGNATURE = false;
                const now = new Date().toLocaleString('pt-BR');
                const user = (window as any).__USER_PROFILE || { full_name: 'Profissional', crefito: '—' };
                const html = `<hr /><p style="text-align: right text-slate-400 font-medium italic">Assinado eletronicamente por <strong>${user.full_name}</strong> (CREFITO: ${user.crefito}) em ${now}</p>`;
                editor.chain().focus().insertContent(html).run();
            }

        }, 150);
        return () => clearInterval(interval);
    }, [editor, goals, pathologies, evolutions]);

    // Sync external value changes
    useEffect(() => {
        if (!editor) return;
        const currentHtml = editor.getHTML();
        const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml;
        if (value !== normalizedCurrent && value !== lastSentValue.current && !debounceTimer.current) {
            isUpdatingFromProp.current = true;
            editor.commands.setContent(value || '');
            lastSentValue.current = value || '';
            isUpdatingFromProp.current = false;
        }
    }, [value, editor]);

    useEffect(() => {
        if (editor) editor.setEditable(!disabled);
    }, [disabled, editor]);

    const filteredExercises = useMemo(() => {
        if (!librarySearch) return exercises.slice(0, 10);
        const q = librarySearch.toLowerCase();
        return exercises.filter(ex => ex.name.toLowerCase().includes(q)).slice(0, 10);
    }, [exercises, librarySearch]);

    const handleLibrarySelect = (exercise: any) => {
        if (!editor) return;
        const insertText = `${exercise.name} — 3x10 rep`;
        const { $from } = editor.state.selection;
        const isTaskItem = editor.isActive('taskItem');

        if (isTaskItem) {
            const start = $from.start();
            const end = $from.end();
            editor.chain().focus()
                .insertContentAt({ from: start, to: end }, insertText)
                .setTextSelection({ from: start + exercise.name.length + 3, to: start + insertText.length })
                .run();
        } else {
            editor.chain().focus()
                .insertContent(`<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>${insertText}</p></li></ul>`)
                .run();
        }
        setLibraryOpen(false);
        setLibrarySearch("");
    };

    const handleTestSelect = (testName: string) => {
        editor.chain().focus()
            .insertContent(`<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p><strong>Teste: ${testName}</strong> — [ ] Positivo [ ] Negativo</p></li></ul>`)
            .run();
        setTestsOpen(false);
    };

    if (!editor) return null;

    return (
        <div className={cn('rich-text-editor rounded-lg border border-transparent', isTyping && 'typing-active', className)}
             style={isTyping ? { '--typing-glow': getAccentGlow() } as React.CSSProperties : undefined}>
            
            <EditorContent editor={editor} onInput={handleInput} />

            {/* ── Exercise Library Dialog ── */}
            <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white">
                    <DialogHeader className="p-4 border-b bg-slate-50/50">
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Dumbbell className="w-5 h-5" /> Biblioteca de Exercícios
                        </DialogTitle>
                    </DialogHeader>
                    <Command shouldFilter={false} className="rounded-none border-none">
                        <div className="flex items-center border-b px-4 bg-white sticky top-0 z-10">
                            <Search className="mr-2 h-5 w-5 shrink-0 opacity-50 text-slate-400" />
                            <CommandInput 
                                placeholder="Pesquisar exercício por nome ou categoria..." 
                                value={librarySearch}
                                onValueChange={setLibrarySearch}
                                className="flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-none border-none focus:ring-0"
                                autoFocus
                            />
                        </div>
                        <UICommandList className="max-h-[450px] overflow-y-auto p-2 scrollbar-thin">
                            <CommandEmpty className="py-12 text-center text-slate-500">Nenhum exercício encontrado</CommandEmpty>
                            <CommandGroup>
                                {filteredExercises.map((exercise: any) => (
                                    <CommandItem
                                        key={exercise.id}
                                        onSelect={() => handleLibrarySelect(exercise)}
                                        className="flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-slate-50 aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-all group"
                                    >
                                        <div className="h-16 w-16 flex-shrink-0 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
                                            {exercise.image_url ? (
                                                <img src={withImageParams(exercise.image_url, { width: 128, height: 128, fit: 'cover' })} className="h-full w-full object-cover" alt="" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center"><Dumbbell className="h-8 w-8 text-slate-300" /></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-bold text-base truncate">{exercise.name}</span>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 w-fit">{exercise.category || 'Geral'}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </UICommandList>
                    </Command>
                </DialogContent>
            </Dialog>

            {/* ── Tests Selector Dialog ── */}
            <Dialog open={testsOpen} onOpenChange={setTestsOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-blue-600" /> Selecionar Teste Clínico
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto p-1">
                        {['Lachman', 'Gaveta Anterior', 'McMurray', 'Thompson', 'Phalen', 'Lasègue', 'Neer', 'Jobe', 'Apprehension'].map(test => (
                            <Button 
                                key={test} 
                                variant="outline" 
                                className="justify-start h-12 text-left hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                onClick={() => handleTestSelect(test)}
                            >
                                {test}
                            </Button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTestsOpen(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
