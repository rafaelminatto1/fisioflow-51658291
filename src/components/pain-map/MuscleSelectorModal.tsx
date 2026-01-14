import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Muscle, getMusclesByRegion } from '@/lib/data/bodyMuscles';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MuscleSelectorModalProps {
  regionCode: string;
  regionName: string;
  view: 'front' | 'back';
  isOpen: boolean;
  onClose: () => void;
  onSelect: (muscle: Muscle) => void;
  onSkip: () => void;
}

export function MuscleSelectorModal({
  regionCode,
  regionName,
  view,
  isOpen,
  onClose,
  onSelect,
  onSkip,
}: MuscleSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);

  if (!isOpen) return null;

  const muscles = getMusclesByRegion(regionCode, view);
  const filteredMuscles = muscles.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedMuscle) {
      onSelect(selectedMuscle);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedMuscle(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Selecione o Músculo</h2>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Região: <span className="font-medium text-foreground">{regionName}</span>
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar músculo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Muscle List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {filteredMuscles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum músculo encontrado
              </div>
            ) : (
              filteredMuscles.map((muscle) => (
                <button
                  key={muscle.code}
                  onClick={() => setSelectedMuscle(muscle)}
                  className={cn(
                    'w-full text-left p-3 rounded-md transition-colors hover:bg-muted',
                    selectedMuscle?.code === muscle.code && 'bg-primary/10 border border-primary/20'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{muscle.name}</div>
                      <div className="text-xs text-muted-foreground">{muscle.nameEn}</div>
                    </div>
                    {selectedMuscle?.code === muscle.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1"
          >
            Pular (Região Geral)
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedMuscle}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
