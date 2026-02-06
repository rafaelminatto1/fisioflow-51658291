import { useCallback, useEffect, useState } from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette';

// Hook to use command palette
export function useCommandPalette(patientId?: string, patientName?: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const CommandPaletteComponent = useCallback(() => {
    return (
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        patientId={patientId}
        patientName={patientName}
      />
    );
  }, [open, patientId, patientName]);

  return {
    open,
    setOpen,
    CommandPaletteComponent
  };
}
