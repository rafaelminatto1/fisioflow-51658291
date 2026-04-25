import type React from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SlashMenuCommand = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function WikiEditorSlashBar({
  slashInput,
  slashInputRef,
  filteredCommands,
  insertAfterBlockId,
  onSlashInputChange,
  onSlashEnter,
  onInsertParagraph,
  onSelectCommand,
}: {
  slashInput: string;
  slashInputRef: React.RefObject<HTMLInputElement | null>;
  filteredCommands: SlashMenuCommand[];
  insertAfterBlockId: string | null;
  onSlashInputChange: (value: string) => void;
  onSlashEnter: () => void;
  onInsertParagraph: () => void;
  onSelectCommand: (commandId: string) => void;
}) {
  const slashMenuOpen = slashInput.trim().startsWith("/");

  return (
    <div className="relative border-b bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={slashInputRef}
          value={slashInput}
          onChange={(event) => onSlashInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && slashMenuOpen) {
              event.preventDefault();
              onSlashEnter();
            }
          }}
          placeholder="Digite / para inserir blocos com busca"
          className="max-w-xl"
        />
        <Badge variant="secondary" className="h-9 px-3">
          Inserção: {insertAfterBlockId ? "após bloco selecionado" : "no final"}
        </Badge>
        <Button variant="outline" size="sm" onClick={onInsertParagraph}>
          <Plus className="mr-2 h-4 w-4" />
          Novo parágrafo
        </Button>
      </div>

      {slashMenuOpen && (
        <div className="absolute left-4 top-[56px] z-20 w-[520px] max-w-[calc(100%-2rem)] rounded-lg border bg-popover p-2 shadow-lg">
          {filteredCommands.length > 0 ? (
            <div className="max-h-72 overflow-auto">
              {filteredCommands.map((command) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    type="button"
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                    onClick={() => onSelectCommand(command.id)}
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{command.label}</div>
                      <div className="text-xs text-muted-foreground">{command.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum bloco encontrado para essa busca.
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Slash menu visual ativo. Arraste e solte blocos para reordenar.
      </p>
    </div>
  );
}
