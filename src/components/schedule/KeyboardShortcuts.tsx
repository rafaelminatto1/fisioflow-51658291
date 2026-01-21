import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Keyboard as KeyboardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItemProps {
  keys: string[];
  description: string;
}

const ShortcutItem = memo(({ keys, description }: ShortcutItemProps) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-muted-foreground">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-xs text-muted-foreground mx-1">+</span>}
          <kbd
            className={cn(
              "min-w-[24px] px-2 py-1 text-xs font-medium",
              "bg-muted border border-border rounded-md",
              "text-foreground shadow-sm"
            )}
          >
            {key}
          </kbd>
        </span>
      ))}
    </div>
  </div>
));

ShortcutItem.displayName = 'ShortcutItem';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts: ShortcutItemProps[] = [
  { keys: ['N'], description: 'Novo agendamento' },
  { keys: ['F'], description: 'Buscar paciente' },
  { keys: ['D', 'W', 'M'], description: 'Mudar visualização (Dia/Semana/Mês)' },
  { keys: ['T'], description: 'Ir para hoje' },
  { keys: ['←', '→'], description: 'Navegar dias' },
  { keys: ['Esc'], description: 'Fechar modal' },
  { keys: ['/'], description: 'Mostrar atalhos' },
];

export const KeyboardShortcuts = memo(({ open, onOpenChange }: KeyboardShortcutsProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <KeyboardIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Atalhos de Teclado</DialogTitle>
              <DialogDescription>
                Ações rápidas para navegação e edição
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-1 mt-4">
          {shortcuts.map((shortcut, index) => (
            <ShortcutItem
              key={index}
              keys={shortcut.keys}
              description={shortcut.description}
            />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Dica: Pressione <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">?</kbd> ou <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">/</kbd> em qualquer lugar para abrir esta ajuda.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

KeyboardShortcuts.displayName = 'KeyboardShortcuts';

export type { KeyboardShortcutsProps, ShortcutItemProps };
