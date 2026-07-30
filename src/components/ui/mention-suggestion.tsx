import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { AtSign, CalendarDays, CheckSquare, FileText, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentionSuggestionItem {
  id: string;
  label: string;
  type: string;
  subtitle?: string;
}

const typeLabels: Record<string, string> = {
  patient: "Paciente",
  profile: "Pessoa",
  team: "Equipe",
  task: "Tarefa",
  appointment: "Agenda",
  session: "Evolução",
  note: "Nota",
};

const typeIcons: Record<string, typeof AtSign> = {
  patient: UserRound,
  profile: UserRound,
  team: UsersRound,
  task: CheckSquare,
  appointment: CalendarDays,
  session: FileText,
  note: FileText,
};

export const MentionSuggestionList = forwardRef(function MentionSuggestionList(
  props: { items: MentionSuggestionItem[]; command: (item: MentionSuggestionItem) => void },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!props.items.length) return event.key === "Escape";
      if (event.key === "ArrowUp") {
        setSelectedIndex((current) => (current + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((current) => (current + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }), [props.items, selectedIndex]);

  return (
    <div className="w-80 overflow-hidden rounded-xl border border-border/70 bg-card p-1.5 shadow-xl">
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        <AtSign className="size-3.5" /> Mencionar uma entidade
      </div>
      {props.items.length ? props.items.map((item, index) => {
        const Icon = typeIcons[item.type] ?? AtSign;
        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectItem(index)}
            className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition", index === selectedIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{item.subtitle ?? typeLabels[item.type] ?? "Entidade relacionada"}</span>
            </span>
          </button>
        );
      }) : <p className="px-2 py-5 text-center text-xs text-muted-foreground">Nenhum resultado autorizado.</p>}
    </div>
  );
});

MentionSuggestionList.displayName = "MentionSuggestionList";

export function mentionSuggestionConfig(
  items: (query: string, signal: AbortSignal) => Promise<MentionSuggestionItem[]>,
  onSelected?: (item: MentionSuggestionItem) => void,
) {
  return {
    char: "@",
    allowSpaces: false,
    items: ({ query, signal }: { query: string; signal: AbortSignal }) => items(query, signal),
    command: ({ editor, range, props }: { editor: any; range: { from: number; to: number }; props: MentionSuggestionItem }) => {
      editor.chain().focus().insertContentAt(range, {
        type: "mention",
        attrs: { id: props.id, label: props.label, mentionType: props.type },
      }).insertContent(" ").run();
      onSelected?.(props);
    },
    render: () => {
      let component: ReactRenderer<any> | undefined;
      let popup: Instance[] | undefined;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionSuggestionList as any, { props, editor: props.editor });
          if (!props.clientRect) return;
          popup = tippy("body", {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            zIndex: 10000,
            offset: [0, 8],
          });
        },
        onUpdate: (props: any) => {
          component?.updateProps(props);
          if (props.clientRect && popup?.[0]) popup[0].setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
          popup = undefined;
          component = undefined;
        },
      };
    },
  };
}
