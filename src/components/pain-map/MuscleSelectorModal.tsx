import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Muscle, getMusclesByRegion } from '@/lib/data/bodyMuscles';
import { Check, Search, X } from 'lucide-react';
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={cn(
          'bg-background rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col transition-all duration-300',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                💪
              </span>
              Selecione o Músculo
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-all hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            Região: <span className="font-medium text-foreground">{regionName}</span>
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors" />
            <Input
              placeholder="Buscar músculo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </div>

        {/* Muscle List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {filteredMuscles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground animate-in fade-in duration-300">
                <div className="text-4xl mb-3">🔍</div>
                <p>Nenhum músculo encontrado</p>
                <p className="text-xs mt-1">Tente outro termo de busca</p>
              </div>
            ) : (
              filteredMuscles.map((muscle, index) => (
                <button
                  key={muscle.code}
                  onClick={() => setSelectedMuscle(muscle)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all duration-200 group relative overflow-hidden',
                    'hover:scale-[1.02] hover:shadow-md',
                    selectedMuscle?.code === muscle.code
                      ? 'bg-primary/10 border-2 border-primary/30 shadow-md scale-[1.02]'
                      : 'hover:bg-muted border border-transparent'
                  )}
                  style={{
                    animationDelay: `${Math.min(index * 30, 300)}ms`,
                  }}
                >
                  {selectedMuscle?.code === muscle.code && (
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <div className={cn(
                        'font-medium text-sm transition-colors',
                        selectedMuscle?.code === muscle.code ? 'text-primary' : 'group-hover:text-foreground'
                      )}>
                        {muscle.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{muscle.nameEn}</div>
                    </div>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200',
                      selectedMuscle?.code === muscle.code
                        ? 'bg-primary text-primary-foreground scale-100'
                        : 'bg-muted text-muted-foreground scale-0 group-hover:scale-100'
                    )}>
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-gradient-to-r from-muted/30 to-transparent flex gap-2">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 transition-all hover:scale-[1.02]"
          >
            Pular (Região Geral)
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedMuscle}
            className={cn(
              'flex-1 transition-all',
              selectedMuscle ? 'hover:scale-[1.02] shadow-lg' : 'opacity-50'
            )}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
