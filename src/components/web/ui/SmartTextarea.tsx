import React, { useCallback, useRef, useMemo, memo } from 'react';
import { Textarea } from '@/components/shared/ui/textarea';
import { Button } from '@/components/shared/ui/button';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Quote,
    Minus,
    Maximize2,
    Minimize2,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Code,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Highlighter,
    IndentIncrease,
    IndentDecrease,
    Link,
    Pilcrow,
    Superscript,
    Subscript,
    Eraser
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/shared/ui/tooltip';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    containerClassName?: string;
    showToolbar?: boolean;
    showToolbarOnFocus?: boolean;
    showStats?: boolean;
    compact?: boolean;
    variant?: 'default' | 'ghost';
}

interface ToolbarButtonProps {
    onClick: () => void;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

// Memoized toolbar button component for better performance
const ToolbarButton = memo(({ onClick, title, icon: Icon, shortcut, disabled = false, ariaLabel }: ToolbarButtonProps) => (
    <TooltipProvider delayDuration={200}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onClick}
                    disabled={disabled}
                    aria-label={ariaLabel || title}
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] py-1 px-2" avoidCollisions>
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                    {shortcut && (
                        <span className="bg-muted-foreground/20 px-1.5 py-0.5 rounded text-[9px] font-mono border border-border/50">
                            {shortcut}
                        </span>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
));

ToolbarButton.displayName = 'ToolbarButton';

interface ToolbarSeparatorProps {
    orientation?: 'vertical' | 'horizontal';
}

const ToolbarSeparator = memo(({ orientation = 'vertical' }: ToolbarSeparatorProps) => (
    <div
        className={cn(
            "bg-border",
            orientation === 'vertical' ? "w-[1px] h-4 mx-1" : "h-[1px] w-full my-1"
        )}
        aria-hidden="true"
    />
));

ToolbarSeparator.displayName = 'ToolbarSeparator';

interface FormattingAction {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    format: string;
    endTag?: string;
    shortcut?: string;
    ariaLabel?: string;
}

// Centralized formatting actions configuration
const createFormattingActions = (): Record<string, FormattingAction[]> => ({
    basic: [
        { icon: Bold, label: 'Negrito', format: '**', endTag: '**', shortcut: 'Ctrl+B' },
        { icon: Italic, label: 'Itálico', format: '_', endTag: '_', shortcut: 'Ctrl+I' },
        { icon: Underline, label: 'Sublinhado', format: '<u>', endTag: '</u>', shortcut: 'Ctrl+U' },
        { icon: Strikethrough, label: 'Riscado', format: '~~', endTag: '~~', shortcut: 'Ctrl+Shift+S' },
    ],
    headings: [
        { icon: Heading1, label: 'Título 1', format: '# ', shortcut: 'Ctrl+Shift+1' },
        { icon: Heading2, label: 'Título 2', format: '## ', shortcut: 'Ctrl+Shift+2' },
        { icon: Heading3, label: 'Título 3', format: '### ', shortcut: 'Ctrl+Shift+3' },
    ],
    lists: [
        { icon: List, label: 'Lista com Marcadores', format: '\n- ', shortcut: 'Ctrl+L' },
        { icon: ListOrdered, label: 'Lista Numerada', format: '\n1. ' },
    ],
    code: [
        { icon: Code, label: 'Código Inline', format: '`', endTag: '`', shortcut: 'Ctrl+E' },
        { icon: Pilcrow, label: 'Bloco de Código', format: '\n```\n', endTag: '\n```\n', shortcut: 'Ctrl+Shift+C' },
    ],
    alignment: [
        { icon: AlignLeft, label: 'Alinhar à Esquerda', format: '<div style="text-align: left;">\n', endTag: '\n</div>', ariaLabel: 'Alinhar texto à esquerda' },
        { icon: AlignCenter, label: 'Centralizar', format: '<div style="text-align: center;">\n', endTag: '\n</div>', ariaLabel: 'Centralizar texto' },
        { icon: AlignRight, label: 'Alinhar à Direita', format: '<div style="text-align: right;">\n', endTag: '\n</div>', ariaLabel: 'Alinhar texto à direita' },
        { icon: AlignJustify, label: 'Justificar', format: '<div style="text-align: justify;">\n', endTag: '\n</div>', ariaLabel: 'Justificar texto' },
    ],
    emphasis: [
        { icon: Highlighter, label: 'Destacar', format: '==', endTag: '==', ariaLabel: 'Adicionar destaque ao texto' },
        { icon: Superscript, label: 'Sobrescrito', format: '^', endTag: '^', ariaLabel: 'Formatar como sobrescrito' },
        { icon: Subscript, label: 'Subscrito', format: '~', endTag: '~', ariaLabel: 'Formatar como subscrito' },
    ],
    structure: [
        { icon: Link, label: 'Link', format: '[', endTag: '](url)', shortcut: 'Ctrl+K', ariaLabel: 'Inserir link' },
        { icon: Quote, label: 'Citação', format: '\n> ', shortcut: 'Ctrl+Q' },
        { icon: Minus, label: 'Linha Horizontal', format: '\n---\n', ariaLabel: 'Inserir linha horizontal' },
        { icon: IndentIncrease, label: 'Aumentar Indentação', format: '    ', ariaLabel: 'Aumentar indentação' },
        { icon: IndentDecrease, label: 'Diminuir Indentação', format: '', ariaLabel: 'Diminuir indentação (seleção)' },
    ],
});

const MemoizedSmartTextarea = memo(React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
    ({
        className,
        value,
        onChange,
        containerClassName,
        showToolbar = true,
        showToolbarOnFocus = false,
        showStats = true,
        compact = false,
        variant = 'default',
        ...props
    }, ref) => {
        const [isFullScreen, setIsFullScreen] = React.useState(false);
        const [isFocused, setIsFocused] = React.useState(false);
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        // Combine refs with proper typing
        const setRef = useCallback((element: HTMLTextAreaElement | null) => {
            internalRef.current = element;
            if (typeof ref === 'function') {
                ref(element);
            } else if (ref) {
                ref.current = element;
            }
        }, [ref]);

        // Memoized formatting actions
        const formattingActions = useMemo(() => createFormattingActions(), []);

        // Enhanced insertFormat with better cursor handling
        const insertFormat = useCallback((startTag: string, endTag: string = '') => {
            const textarea = internalRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const before = text.substring(0, start);
            const selection = text.substring(start, end);
            const after = text.substring(end);

            // Smart indentation handling
            let finalStartTag = startTag;
            if (startTag === '\n- ' || startTag === '\n1. ') {
                // Check if we're at the start of a line
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                if (lineStart === start) {
                    finalStartTag = startTag.trim();
                }
            }

            const newValue = `${before}${finalStartTag}${selection}${endTag}${after}`;

            // Create a synthetic event to trigger onChange
            const event = {
                target: { value: newValue },
            } as React.ChangeEvent<HTMLTextAreaElement>;

            onChange?.(event);

            // Restore focus and selection with better positioning
            requestAnimationFrame(() => {
                textarea.focus();
                const cursorPosition = start + finalStartTag.length;
                if (selection.length > 0 && endTag.length > 0) {
                    // Select the text between the tags
                    textarea.setSelectionRange(cursorPosition, cursorPosition + selection.length);
                } else {
                    // Position cursor after the start tag
                    textarea.setSelectionRange(cursorPosition, cursorPosition);
                }
            });
        }, [onChange]);

        // Special handler for decrease indentation
        const handleDecreaseIndent = useCallback(() => {
            const textarea = internalRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;

            // Find the lines affected by the selection
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = text.indexOf('\n', end);
            const affectedText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

            // Remove up to 4 spaces from the beginning of each line
            const dedentedText = affectedText.replace(/^(\t| {4}| {2}| )/gm, '');

            const newValue = text.substring(0, lineStart) + dedentedText + text.substring(lineEnd === -1 ? text.length : lineEnd);

            const event = {
                target: { value: newValue },
            } as React.ChangeEvent<HTMLTextAreaElement>;

            onChange?.(event);

            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(start, end);
            });
        }, [onChange]);

        // Keyboard shortcuts handler with comprehensive coverage
        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Handle Escape key for fullscreen
            if (e.key === 'Escape' && isFullScreen) {
                e.preventDefault();
                setIsFullScreen(false);
                props.onKeyDown?.(e);
                return;
            }

            if (!(e.ctrlKey || e.metaKey)) {
                props.onKeyDown?.(e);
                return;
            }

            const key = e.key.toLowerCase();
            const shift = e.shiftKey;

            // Map shortcuts to actions
            const shortcuts: Record<string, [string, string | undefined] | undefined> = {
                'b': ['**', '**'],
                'i': ['_', '_'],
                'u': ['<u>', '</u>'],
                'l': ['\n- ', undefined],
                'q': ['\n> ', undefined],
                'k': ['[', '](url)'],
                'e': ['`', '`'],
                's': shift ? ['~~', '~~'] : undefined,
                '1': shift ? ['# ', undefined] : undefined,
                '2': shift ? ['## ', undefined] : undefined,
                '3': shift ? ['### ', undefined] : undefined,
                'c': shift ? ['\n```\n', '\n```\n'] : undefined,
            };

            const action = shortcuts[key];
            if (action) {
                e.preventDefault();
                insertFormat(action[0], action[1]);
            }

            props.onKeyDown?.(e);
        }, [insertFormat, props]);

        // Memoized counts calculations
        const { charCount, wordCount, lineCount } = useMemo(() => {
            const text = typeof value === 'string' ? value : '';
            return {
                charCount: text.length,
                wordCount: text.trim().split(/\s+/).filter(Boolean).length,
                lineCount: text.split('\n').length,
            };
        }, [value]);

        // Render toolbar section
        const renderToolbarSection = useCallback((actions: FormattingAction[]) =>
            actions.map((action, index) => (
                <ToolbarButton
                    key={`${action.label}-${index}`}
                    onClick={() => {
                        if (action.label === 'Diminuir Indentação') {
                            handleDecreaseIndent();
                        } else {
                            insertFormat(action.format, action.endTag);
                        }
                    }}
                    title={action.label}
                    icon={action.icon}
                    shortcut={action.shortcut}
                    ariaLabel={action.ariaLabel}
                />
            )), [insertFormat, handleDecreaseIndent]);

        return (
            <div
                className={cn(
                    "relative group transition-all duration-300",
                    variant === 'default' && "border rounded-lg shadow-sm bg-background/50 backdrop-blur-sm",
                    variant === 'default' && (isFocused ? "ring-2 ring-primary/20 border-primary/50 bg-background" : "hover:border-primary/30"),
                    isFullScreen && "fixed inset-0 z-[100] rounded-none bg-background flex flex-col h-screen",
                    !isFullScreen && "relative flex flex-col",
                    containerClassName
                )}
                role="region"
                aria-label="Editor de texto rico"
                onMouseEnter={() => !showToolbarOnFocus && setIsFocused(true)}
                onMouseLeave={() => !showToolbarOnFocus && !internalRef.current?.matches(':focus') && setIsFocused(false)}
            >
                {/* Toolbar */}
                {showToolbar && (
                    <div
                        className={cn(
                            "flex items-center gap-0.5 p-1.5 border-b bg-muted/30 flex-wrap shrink-0 transition-all duration-300 ease-in-out origin-top",
                            variant === 'default' && "rounded-t-lg",
                            showToolbarOnFocus && !isFocused && !isFullScreen ? "h-0 p-0 border-b-0 opacity-0 scale-y-95 pointer-events-none" : "h-auto opacity-100 scale-y-100",
                            compact && "p-1 gap-0"
                        )}
                        role="toolbar"
                        aria-label="Barra de ferramentas de formatação"
                    >
                        {/* Formatação Básica */}
                        {renderToolbarSection(formattingActions.basic)}
                        <ToolbarSeparator />

                        {/* Cabeçalhos */}
                        {renderToolbarSection(formattingActions.headings)}
                        <ToolbarSeparator />

                        {/* Listas */}
                        {renderToolbarSection(formattingActions.lists)}
                        <ToolbarSeparator />

                        {/* Código */}
                        {renderToolbarSection(formattingActions.code)}
                        <ToolbarSeparator />

                        {/* Alinhamento */}
                        {renderToolbarSection(formattingActions.alignment)}
                        <ToolbarSeparator />

                        {/* Ênfase */}
                        {renderToolbarSection(formattingActions.emphasis)}
                        <ToolbarSeparator />

                        {/* Estrutura */}
                        {renderToolbarSection(formattingActions.structure)}
                        <ToolbarSeparator />

                        {/* Botões de Ação */}
                        <div className="ml-auto flex items-center gap-1 pl-2 border-l border-border/50">
                            <ToolbarButton
                                onClick={() => {
                                    const textarea = internalRef.current;
                                    if (textarea) {
                                        textarea.value = '';
                                        onChange?.({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
                                        textarea.focus();
                                    }
                                }}
                                title="Limpar"
                                icon={Eraser}
                                ariaLabel="Limpar todo o texto"
                            />
                            <ToolbarButton
                                onClick={() => setIsFullScreen(!isFullScreen)}
                                title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                                icon={isFullScreen ? Minimize2 : Maximize2}
                                shortcut={isFullScreen ? 'Esc' : undefined}
                                ariaLabel={isFullScreen ? 'Sair do modo tela cheia' : 'Entrar em modo tela cheia'}
                            />
                        </div>
                    </div>
                )}

                {/* Text Area */}
                <div className={cn("relative flex-1 flex flex-col min-h-0 h-full", isFullScreen && "flex-1 flex flex-col")}>
                    <Textarea
                        ref={setRef}
                        value={value}
                        onChange={onChange}
                        onFocus={(e) => {
                            setIsFocused(true);
                            props.onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setIsFocused(false);
                            props.onBlur?.(e);
                        }}
                        className={cn(
                            "resize-y border-0 focus-visible:ring-0 bg-transparent p-3 text-sm sm:text-base leading-relaxed placeholder:text-muted-foreground/30 tabular-nums transition-all duration-300",
                            showToolbar && (!showToolbarOnFocus || isFocused || isFullScreen) ? "rounded-t-none" : "rounded-t-lg",
                            isFullScreen ? "flex-1 resize-none h-full text-base p-8 max-w-5xl mx-auto" : "flex-1 resize-none h-full min-h-0",
                            className
                        )}
                        placeholder={props.placeholder || "Comece a digitar... Use Ctrl+B para negrito, Ctrl+I para itálico, etc."}
                        aria-label="Área de edição de texto"
                        {...props}
                    />

                    {/* Stats Bar */}
                    {showStats && (
                        <div className={cn(
                            "absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none transition-opacity",
                            !isFullScreen && "opacity-0 group-focus-within:opacity-100",
                            isFullScreen && "opacity-100 bottom-4 right-4"
                        )}>
                            <span
                                className="text-[10px] sm:text-[11px] text-muted-foreground bg-background/90 px-2 py-1 rounded-md border border-border/50 backdrop-blur-sm shadow-sm font-medium tabular-nums"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {lineCount} lin · {wordCount} pal · {charCount} car
                            </span>
                        </div>
                    )}
                </div>

                {/* Escape key handler for fullscreen */}
                {isFullScreen && (
                    <div
                        className="absolute top-4 right-4 text-xs text-muted-foreground/50"
                        aria-live="polite"
                    >
                        Pressione <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> para sair
                    </div>
                )}
            </div>
        );
    }
));

MemoizedSmartTextarea.displayName = 'SmartTextarea';

export const SmartTextarea = MemoizedSmartTextarea;
