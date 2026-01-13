import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export const AppointmentSearch: React.FC<AppointmentSearchProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar paciente...',
  className
}) => {
  return (
    <div className={cn("relative animate-slide-up-fade", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar agendamentos por nome do paciente"
        className={cn(
          'w-full pl-9 pr-9 py-2.5 rounded-xl',
          'bg-white/80 backdrop-blur-sm border border-white/20',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'focus:bg-white transition-all duration-200'
        )}
      />
      {value && (
        <button
          onClick={onClear}
          aria-label="Limpar busca"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors touch-target"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};
