/**
 * RichTextEditor - Reusable Tiptap-based rich text editor
 *
 * Features:
 *   - Formatting toolbar (bold, italic, underline, strikethrough, highlight)
 *   - Headings (H2, H3)
 *   - Lists (bullet, ordered)
 *   - Undo / Redo
 *   - Placeholder support
 *   - Debounced value output
 *   - Disabled state support
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
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
import {
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
import { cn } from '@/lib/utils';
import { useRichTextContext } from '@/context/RichTextContext';
import { SlashCommand, suggestionConfig } from './slash-command/suggestion';
import './rich-text-editor.css';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
    value: string;
    onValueChange: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    accentColor?: 'sky' | 'violet' | 'amber' | 'rose'; // For typing pulse effect
}



export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onValueChange,
    placeholder = '',
    disabled = false,
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

    // Typing pulse effect - show glow when typing
    const handleInput = useCallback(() => {
        setIsTyping(true);

        // Clear previous timer
        if (typingTimer.current) clearTimeout(typingTimer.current);

        // Reset typing state after 2 seconds of inactivity
        typingTimer.current = setTimeout(() => {
            setIsTyping(false);
        }, 2000);
    }, []);

    // Get accent color for typing pulse
    const getAccentGlow = () => {
        const colors = {
            sky: 'hsl(199, 89%, 48%)',
            violet: 'hsl(263, 70%, 50%)',
            amber: 'hsl(38, 92%, 50%)',
            rose: 'hsl(346, 77%, 49%)',
        };
        return colors[accentColor];
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
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
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto my-4 mx-auto block',
                },
            }),
            Youtube.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full my-4 mx-auto block aspect-video',
                },
            }),
            TaskList.configure({
                HTMLAttributes: {
                    class: 'notion-task-list',
                },
            }),
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: 'notion-task-item',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'notion-table',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({
                lowlight,
                HTMLAttributes: {
                    class: 'notion-code-block',
                },
            }),
            SlashCommand.configure({
                suggestion: suggestionConfig,
            }),
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
            if (isUpdatingFromProp.current) return;
            const html = ed.getHTML();

            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
            debounceTimer.current = setTimeout(() => {
                // Tiptap returns <p></p> for empty, normalize to ''
                const normalized = html === '<p></p>' ? '' : html;
                lastSentValue.current = normalized;
                onValueChange(normalized);
                debounceTimer.current = null;
            }, 500); // Optimized from 800ms to 500ms for better UX
        },
        onFocus: () => {
            onFocus?.();
            if (editor) {
                setActiveEditor?.(editor);
            }
        },
        onBlur: () => onBlur?.(),
        editorProps: {
            attributes: {
                class: 'outline-none',
            },
        },
    });

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

    // Sync editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [disabled, editor]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
        };
    }, []);

    if (!editor) return null;

    return (
        <div
            className={cn(
                'rich-text-editor rounded-lg border border-transparent',
                isTyping && 'typing-active',
                className
            )}
            style={
                isTyping
                    ? {
                        '--typing-glow': getAccentGlow(),
                    } as React.CSSProperties
                    : undefined
            }
        >
            {/* Editor content */}
            <EditorContent editor={editor} />
        </div>
    );
};
