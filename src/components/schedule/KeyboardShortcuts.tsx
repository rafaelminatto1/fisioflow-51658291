import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard as KeyboardIcon, Command, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItemProps {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

const ShortcutItem = memo(({ keys, description, icon }: ShortcutItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.2 }}
    className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
  >
    <div className="flex items-center gap-3">
      {icon && (
        <div className="text-muted-foreground group-hover:text-foreground transition-colors">
          {icon}
        </div>
      )}
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        {description}
      </span>
    </div>
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <span className="text-xs text-muted-foreground/60 mx-0.5">+</span>
          )}
          <kbd
            className={cn(
              "min-w-[28px] px-2.5 py-1.5 text-xs font-semibold",
              "bg-background dark:bg-slate-800 border-2 border-border rounded-lg",
              "text-foreground shadow-sm",
              "group-hover:border-primary/50 group-hover:shadow-md transition-all",
              "select-none"
            )}
          >
            {key === 'Cmd' ? (
              <Command className="h-3 w-3" />
            ) : key === '←' ? (
              <ArrowLeft className="h-3 w-3" />
            ) : key === '→' ? (
              <ArrowRight className="h-3 w-3" />
            ) : (
              key
            )}
          </kbd>
        </span>
      ))}
    </div>
  </motion.div>
));

ShortcutItem.displayName = 'ShortcutItem';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ['N'], description: 'Novo agendamento', icon: '➕' },
  { keys: ['F'], description: 'Buscar paciente', icon: '🔍' },
  { keys: ['A'], description: 'Ativar modo seleção', icon: '☑' },
  { keys: ['D', 'W', 'M'], description: 'Mudar visualização', icon: '📅' },
  { keys: ['T'], description: 'Ir para hoje', icon: '📆' },
  { keys: ['←', '→'], description: 'Navegar dias', icon: '⬅️' },
  { keys: ['Esc'], description: 'Fechar modal', icon: '✕' },
  { keys: ['/', '?'], description: 'Mostrar atalhos', icon: '⌨️' },
] as const;

export const KeyboardShortcuts = memo(({ open, onOpenChange }: KeyboardShortcutsProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader>
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/10">
                <KeyboardIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Atalhos de Teclado</DialogTitle>
                <DialogDescription className="text-sm">
                  Ações rápidas para navegação e edição
                </DialogDescription>
              </div>
            </motion.div>
          </DialogHeader>

          <div className="space-y-0.5 mt-6">
            {shortcuts.map((shortcut, index) => (
              <ShortcutItem
                key={index}
                keys={shortcut.keys}
                description={shortcut.description}
                icon={<span className="text-base">{shortcut.icon}</span>}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 pt-4 border-t border-border bg-muted/30 rounded-lg p-3"
          >
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>
                Pressione{' '}
                <kbd className="mx-1 px-1.5 py-0.5 bg-background dark:bg-slate-800 border border-border rounded text-[11px] font-semibold">
                  ?
                </kbd>{' '}
                ou{' '}
                <kbd className="mx-1 px-1.5 py-0.5 bg-background dark:bg-slate-800 border border-border rounded text-[11px] font-semibold">
                  /
                </kbd>{' '}
                em qualquer lugar para abrir esta ajuda
              </span>
            </p>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
});

KeyboardShortcuts.displayName = 'KeyboardShortcuts';

export type { KeyboardShortcutsProps, ShortcutItemProps };
