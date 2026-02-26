import { TaskItem as TiptapTaskItem } from '@tiptap/extension-task-item';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const TaskItemView = (props: any) => {
  const { node, updateAttributes, editor, selected } = props;
  const isChecked = node.attrs.checked;

  return (
    <NodeViewWrapper className={cn(
      "notion-task-item flex items-start gap-2 group relative py-1 my-0.5 rounded-sm transition-colors",
      selected && "bg-slate-50/50"
    )}>
      <label contentEditable={false} className="mt-1 flex-shrink-0 flex items-center justify-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => updateAttributes({ checked: e.target.checked })}
          className="cursor-pointer w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
      </label>
      <div className="flex-1 min-w-0">
        <NodeViewContent className={cn(
          "outline-none text-slate-700 min-h-[1.5em]",
          isChecked && "line-through opacity-50 text-slate-400"
        )} />
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all ml-2 self-start mt-0.5" contentEditable={false}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Global signal for RichTextEditor
            (window as any).__OPEN_EXERCISE_LIBRARY = true;
            // Force editor focus to ensure signal is picked up
            editor.commands.focus();
          }}
          className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-[9px] font-bold border border-blue-200 transition-all shadow-sm whitespace-nowrap active:scale-95"
          title="Abrir Biblioteca de Exercícios"
        >
          <Dumbbell className="w-3 h-3" />
          BIBLIOTECA
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export const CustomTaskItem = TiptapTaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemView);
  },
});
