import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import { CommandList, getSuggestionItems } from './CommandList';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

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

export const suggestionConfig = {
    items: getSuggestionItems,
    render: () => {
        let component: ReactRenderer<any>;
        let popup: Instance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList as any, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                    zIndex: 9999,
                    maxWidth: 'none',
                    offset: [0, 8],
                    popperOptions: {
                        modifiers: [
                            {
                                name: 'flip',
                                options: { fallbackPlacements: ['top-start'] },
                            },
                            {
                                name: 'preventOverflow',
                                options: { boundary: 'viewport', padding: 8 },
                            },
                        ],
                    },
                });
            },

            onUpdate(props: any) {
                component.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }

                return component.ref?.onKeyDown(props);
            },

            onExit() {
                popup[0].destroy();
                component.destroy();
            },
        };
    },
};
