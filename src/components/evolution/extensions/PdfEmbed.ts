import { Node, mergeAttributes } from '@tiptap/core';

export interface PdfOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pdf: {
      /**
       * Inserir um PDF visual no editor
       */
      setPdf: (options: { src: string, title?: string }) => ReturnType,
    }
  }
}

export const PdfEmbed = Node.create<PdfOptions>({
  name: 'pdf',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'pdf-embed-container my-4',
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: 'Exame/Documento PDF',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pdf-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div', 
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'pdf-embed' }),
      [
        'div', 
        { class: 'flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-lg' },
        ['span', { class: 'text-xs font-bold text-slate-600 dark:text-slate-300' }, `📎 ${node.attrs.title}`],
        ['a', { href: node.attrs.src, target: '_blank', class: 'text-[10px] text-blue-600 hover:underline' }, 'Abrir em nova aba']
      ],
      [
        'iframe', 
        { 
          src: `${node.attrs.src}#toolbar=0`, 
          class: 'w-full h-[500px] border border-slate-200 dark:border-slate-700 rounded-b-lg shadow-sm',
          style: 'background: white;'
        }
      ]
    ];
  },

  addCommands() {
    return {
      setPdf: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});
