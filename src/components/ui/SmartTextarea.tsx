import React, { useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, List, Italic, Type, Underline, Strikethrough, Quote, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    containerClassName?: string;
}

const MemoizedSmartTextarea = React.memo(React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
    ({ className, value, onChange, containerClassName, ...props }, ref) => {
        const [isFullScreen, setIsFullScreen] = React.useState(false);
        const internalRef = useRef<HTMLTextAreaElement | null>(null);

        // Combine refs
        const setRef = useCallback((element: HTMLTextAreaElement | null) => {
            internalRef.current = element;
            if (typeof ref === 'function') {
                ref(element);
            } else if (ref) {
                // @ts-expect-error - ref type mismatch with internalRef
                ref.current = element;
            }
        }, [ref]);

        const insertFormat = (startTag: string, endTag: string = '') => {
            const textarea = internalRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const before = text.substring(0, start);
            const selection = text.substring(start, end);
            const after = text.substring(end);

            const newValue = `${before}${startTag}${selection}${endTag}${after}`;

            // Create a synthetic event to trigger onChange
            const event = {
                target: { value: newValue },
            } as React.ChangeEvent<HTMLTextAreaElement>;

            onChange?.(event);

            // Restore focus and selection
            setTimeout(() => {
                textarea.focus();
                if (selection.length > 0) {
                    textarea.setSelectionRange(start + startTag.length, end + startTag.length);
                } else {
                    textarea.setSelectionRange(start + startTag.length, start + startTag.length);
                }
            }, 0);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        insertFormat('**', '**');
                        break;
                    case 'i':
                        e.preventDefault();
                        insertFormat('_', '_');
                        break;
                    case 'u':
                        e.preventDefault();
                        insertFormat('<u>', '</u>');
                        break;
                    case 's':
                        if (e.shiftKey) {
                            e.preventDefault();
                            insertFormat('~~', '~~');
                        }
                        break;
                    case 'l':
                        e.preventDefault();
                        insertFormat('\n- ');
                        break;
                    case 'q':
                        e.preventDefault();
                        insertFormat('\n> ');
                        break;
                }
            }
            props.onKeyDown?.(e);
        };

        const charCount = typeof value === 'string' ? value.length : 0;
        const wordCount = typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0;

        const ToolbarButton = ({
            onClick,
            title,
            icon: Icon,
            shortcut
        }: {
            onClick: () => void;
            title: string;
            icon: any;
            shortcut?: string;
        }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={onClick}
                        >
                            <Icon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                        <p className="flex items-center gap-2">
                            {title}
                            {shortcut && (
                                <span className="bg-muted px-1 rounded text-[9px] font-mono opacity-70">
                                    {shortcut}
                                </span>
                            )}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        return (
            <div className={cn(
                "relative group border rounded-lg shadow-sm bg-background/50 backdrop-blur-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50",
                isFullScreen && "fixed inset-0 z-50 rounded-none bg-background flex flex-col h-screen",
                !isFullScreen && "relative flex flex-col", // Added flex flex-col
                containerClassName
            )}>
                <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 rounded-t-lg">
                    <ToolbarButton
                        onClick={() => insertFormat('**', '**')}
                        title="Negrito"
                        icon={Bold}
                        shortcut="Ctrl+B"
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('_', '_')}
                        title="Itálico"
                        icon={Italic}
                        shortcut="Ctrl+I"
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('<u>', '</u>')}
                        title="Sublinhado"
                        icon={Underline}
                        shortcut="Ctrl+U"
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('~~', '~~')}
                        title="Riscado"
                        icon={Strikethrough}
                        shortcut="Ctrl+Shift+S"
                    />
                    <div className="w-[1px] h-4 bg-border mx-1" />
                    <ToolbarButton
                        onClick={() => insertFormat('# ')}
                        title="Título"
                        icon={Type}
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('\n- ')}
                        title="Lista"
                        icon={List}
                        shortcut="Ctrl+L"
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('\n> ')}
                        title="Citação"
                        icon={Quote}
                        shortcut="Ctrl+Q"
                    />
                    <ToolbarButton
                        onClick={() => insertFormat('\n---\n')}
                        title="Linha Horizontal"
                        icon={Minus}
                    />
                    <div className="ml-auto flex items-center gap-1">
                        <ToolbarButton
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                            icon={isFullScreen ? Minimize2 : Maximize2}
                        />
                    </div>
                </div>
                <div className={cn("relative", isFullScreen && "flex-1 flex flex-col")}>
                    <Textarea
                        ref={setRef}
                        value={value}
                        onChange={onChange}
                        onKeyDown={handleKeyDown}
                        className={cn(
                            "min-h-[120px] resize-y border-0 focus-visible:ring-0 rounded-t-none bg-transparent p-3 text-sm sm:text-base leading-relaxed placeholder:text-muted-foreground/50",
                            isFullScreen ? "flex-1 resize-none h-full text-lg p-8 max-w-4xl mx-auto" : "flex-1 resize-none h-full",
                            className
                        )}
                        {...props}
                    />
                    <div className={cn(
                        "absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none transition-opacity",
                        !isFullScreen && "opacity-0 group-focus-within:opacity-100",
                        isFullScreen && "opacity-100 bottom-4 right-4"
                    )}>
                        <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/50 backdrop-blur-sm shadow-sm">
                            {wordCount} palavras | {charCount} caracteres
                        </span>
                    </div>
                </div>
            </div>
        );
    }
));

MemoizedSmartTextarea.displayName = 'SmartTextarea';

export const SmartTextarea = MemoizedSmartTextarea;
