import { cn } from '@/lib/utils';

interface EvaScaleBarProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  showLabels?: boolean;
  disabled?: boolean;
}

// Cores da escala EVA (0-10)
const EVA_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: '#9ca3af', text: '#ffffff', label: 'Sem Dor' },
  1: { bg: '#bef264', text: '#1f2937', label: 'Muito Leve' },
  2: { bg: '#84cc16', text: '#ffffff', label: 'Leve' },
  3: { bg: '#fde047', text: '#1f2937', label: 'Desconfortável' },
  4: { bg: '#facc15', text: '#1f2937', label: 'Desconfortável' },
  5: { bg: '#fdba74', text: '#1f2937', label: 'Moderada' },
  6: { bg: '#fb923c', text: '#ffffff', label: 'Moderada' },
  7: { bg: '#f87171', text: '#ffffff', label: 'Forte' },
  8: { bg: '#ef4444', text: '#ffffff', label: 'Muito Forte' },
  9: { bg: '#b91c1c', text: '#ffffff', label: 'Intensa' },
  10: { bg: '#7f1d1d', text: '#ffffff', label: 'Insuportável' },
};

export function EvaScaleBar({
  value,
  onChange,
  className,
  showLabels = true,
  disabled = false
}: EvaScaleBarProps) {
  const handleClick = (newValue: number) => {
    if (!disabled) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Scale Bar */}
      <div className="flex w-full h-9 sm:h-10 rounded-xl overflow-hidden shadow-sm ring-1 ring-border">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
          const isSelected = value === level;
          const colors = EVA_COLORS[level];

          return (
            <button
              key={level}
              type="button"
              onClick={() => handleClick(level)}
              disabled={disabled}
              className={cn(
                'flex-1 h-full flex items-center justify-center text-[10px] font-bold transition-all duration-200',
                'border-r border-white/20 last:border-r-0',
                'hover:brightness-110 active:scale-95',
                disabled && 'cursor-not-allowed opacity-50',
                !disabled && 'cursor-pointer'
              )}
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                zIndex: isSelected ? 10 : 1,
                boxShadow: isSelected
                  ? `0 0 0 2px ${colors.bg}, 0 0 8px ${colors.bg}80`
                  : 'none',
              }}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>Sem Dor</span>
          <span className="text-xs font-medium text-foreground">
            {value !== undefined && EVA_COLORS[value]?.label}
          </span>
          <span>Insuportável</span>
        </div>
      )}

      {/* Selected Value Indicator */}
      {!showLabels && value !== undefined && (
        <div className="text-center">
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
            Selecionado: {value} - {EVA_COLORS[value]?.label}
          </span>
        </div>
      )}
    </div>
  );
}
