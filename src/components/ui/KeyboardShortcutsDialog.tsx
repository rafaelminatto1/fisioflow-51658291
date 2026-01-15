/**
 * Diálogo de atalhos de teclado
 * @module components/ui/KeyboardShortcutsDialog
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Keyboard, Search, Navigation, Calendar, Users, FileText, Zap } from 'lucide-react';
import { useKeyboardShortcuts, formatShortcut, groupShortcutsByCategory, DEFAULT_SHORTCUTS } from '@/lib/keyboard/shortcuts-manager';

// =====================================================================
// TYPES
// =====================================================================

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customShortcuts?: Record<string, string[]>;
}

// =====================================================================
// CATEGORY ICONS
// =====================================================================

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  global: Keyboard,
  navigation: Navigation,
  actions: Zap,
  schedule: Calendar,
  patients: Users,
  forms: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  global: 'text-slate-600',
  navigation: 'text-blue-600',
  actions: 'text-green-600',
  schedule: 'text-purple-600',
  patients: 'text-orange-600',
  forms: 'text-pink-600',
};

// =====================================================================
// SHORTCUT ITEM COMPONENT
// =====================================================================

interface ShortcutItemProps {
  keys: string;
  description: string;
}

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <span className="text-sm text-slate-700 dark:text-slate-300">{description}</span>
      <div className="flex items-center gap-1">
        {keys.split('+').map((key, i) => (
          <span key={i} className="flex items-center">
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
              {key}
            </kbd>
            {i < keys.split('+').length - 1 && (
              <span className="mx-0.5 text-slate-400">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// CATEGORY TAB COMPONENT
// =====================================================================

interface CategoryTabProps {
  name: string;
  shortcuts: Array<{
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    description: string;
  }>;
}

function CategoryTab({ name, shortcuts }: CategoryTabProps) {
  const Icon = CATEGORY_ICONS[name.toLowerCase()] || Keyboard;
  const colorClass = CATEGORY_COLORS[name.toLowerCase()] || 'text-slate-600';

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <h3 className="font-semibold">{name}</h3>
        <Badge variant="secondary" className="ml-auto">
          {shortcuts.length}
        </Badge>
      </div>

      <div className="space-y-1">
        {shortcuts.map((shortcut, index) => (
          <ShortcutItem
            key={`${shortcut.key}-${index}`}
            keys={formatShortcut(shortcut as any)}
            description={shortcut.description}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  customShortcuts,
}: KeyboardShortcutsDialogProps) {
  const [activeTab, setActiveTab] = useState('global');

  // Flatten all shortcuts
  const allShortcuts = Object.values(DEFAULT_SHORTCUTS).flat();
  const groupedShortcuts = groupShortcutsByCategory(allShortcuts);

  // Register global shortcut to open this dialog
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '?',
        description: 'Mostrar atalhos',
        action: () => onOpenChange(true),
        category: 'global',
        preventDefault: true,
      },
    ],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Pressione <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-slate-100 border border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600">?</kbd> a qualquer momento para abrir este diálogo
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full h-auto flex-wrap">
            {groupedShortcuts.map((group) => {
              const Icon = CATEGORY_ICONS[group.name.toLowerCase()] || Keyboard;
              const isActive = activeTab === group.name.toLowerCase();

              return (
                <TabsTrigger
                  key={group.name}
                  value={group.name.toLowerCase()}
                  className="flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{group.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[60vh] px-1">
            {groupedShortcuts.map((group) => (
              <TabsContent
                key={group.name}
                value={group.name.toLowerCase()}
                className="mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <CategoryTab name={group.name} shortcuts={group.shortcuts} />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <span>
            Dica: Atalhos com <kbd className="px-1 py-0.5 text-xs bg-slate-100 border border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600">⌘</kbd> funcionam com <kbd className="px-1 py-0.5 text-xs bg-slate-100 border border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600">Ctrl</kbd> no Windows/Linux
          </span>
          <span>
            {allShortcuts.length} atalhos disponíveis
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// TRIGGER BUTTON COMPONENT
// =====================================================================

interface KeyboardShortcutsTriggerProps {
  className?: string;
  variant?: 'icon' | 'button' | 'badge';
}

export function KeyboardShortcutsTrigger({
  className,
  variant = 'icon',
}: KeyboardShortcutsTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'icon' && (
        <button
          onClick={() => setOpen(true)}
          className={className}
          title="Mostrar atalhos de teclado (?)"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      )}

      {variant === 'button' && (
        <button
          onClick={() => setOpen(true)}
          className={className}
        >
          <Keyboard className="h-4 w-4 mr-2" />
          Atalhos
        </button>
      )}

      {variant === 'badge' && (
        <Badge
          variant="outline"
          className={className}
          onClick={() => setOpen(true)}
        >
          <kbd className="mr-1">?</kbd>
        </Badge>
      )}

      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export default KeyboardShortcutsDialog;
