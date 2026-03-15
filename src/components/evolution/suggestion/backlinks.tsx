import { Extension } from '@tiptap/core';
import Mention from '@tiptap/extension-mention';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';

export const Backlinks = Extension.create({
  name: 'backlinks',

  addOptions() {
    return {
      suggestion: {
        char: '[[',
        command: ({ editor, range, props }: any) => {
          editor
            .chain()
            .focus()
            .replaceRangeWith(range, {
              type: 'mention',
              attrs: props,
            })
            .insertContent(' ')
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('backlinks'),
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          // Mock de sessões passadas para demonstração do estilo Obsidian
          return [
            { id: '1', label: 'Sessão de 01/03 - Avaliação' },
            { id: '2', label: 'Sessão de 03/03 - Mobilidade' },
            { id: '3', label: 'Protocolo Pós-Op LCA' },
          ].filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
        },
        render: () => {
          let component: any;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(BacklinkList, {
                props,
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props: any) {
              component.updateProps(props);
              if (popup) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              }
            },
            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                if (popup) popup[0].hide();
                return true;
              }
              return component.ref?.onKeyDown(props);
            },
            onExit() {
              if (popup) popup[0].destroy();
              if (component) component.destroy();
            },
          };
        },
      }),
    ];
  },
});

import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';

const BacklinkList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
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

  useEffect(() => setSelectedIndex(0), [props.items]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl overflow-hidden min-w-[200px]">
      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
        Vincular Sessão (Obsidian Style)
      </div>
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            key={index}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
              index === selectedIndex ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => selectItem(index)}
          >
            [[ {item.label} ]]
          </button>
        ))
      ) : (
        <div className="px-3 py-1.5 text-sm text-gray-500">Nenhuma sessão encontrada</div>
      )}
    </div>
  );
});

BacklinkList.displayName = 'BacklinkList';
