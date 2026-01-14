import React, { useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, List, Italic, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const SmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
    ({ className, value, onChange, ...props }, ref) => {
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
                textarea.setSelectionRange(start + startTag.length, end + startTag.length);
            }, 0);
        };

        return (
            <div className="relative border rounded-md shadow-sm bg-background focus-within:ring-1 focus-within:ring-ring">
                <div className="flex items-center gap-1 p-1 border-b bg-muted/20">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => insertFormat('**', '**')}
                        title="Negrito"
                    >
                        <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => insertFormat('_', '_')}
                        title="Itálico"
                    >
                        <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => insertFormat('\n- ')}
                        title="Lista"
                    >
                        <List className="h-3 w-3" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => insertFormat('# ')}
                        title="Título"
                    >
                        <Type className="h-3 w-3" />
                    </Button>
                </div>
                <Textarea
                    ref={setRef}
                    value={value}
                    onChange={onChange}
                    className={cn(
                        "min-h-[120px] resize-y border-0 focus-visible:ring-0 rounded-t-none bg-transparent p-3",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

SmartTextarea.displayName = 'SmartTextarea';
