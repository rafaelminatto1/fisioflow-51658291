import React, { useState, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppointmentSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  resultsCount?: number;
  placeholder?: string;
  className?: string;
}

export const AppointmentSearch: React.FC<AppointmentSearchProps> = ({
  searchTerm,
  onSearchChange,
  resultsCount,
  placeholder = 'Buscar paciente...',
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const hasValue = searchTerm.length > 0;

  return (
    <div className={cn("relative", className)}>
      <motion.div
        animate={{
          scale: isFocused ? 1.01 : 1,
          boxShadow: isFocused
            ? "0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)"
            : "0 1px 3px rgba(0, 0, 0, 0.1)"
        }}
        transition={{ duration: 0.2 }}
        className="relative flex items-center"
      >
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
          strokeWidth={2.5}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          aria-label="Buscar agendamentos por nome do paciente"
          className={cn(
            'w-full pl-10 pr-20 py-2.5 rounded-lg',
            'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none transition-all duration-200',
            'placeholder:font-normal'
          )}
        />
        <AnimatePresence mode="wait">
          {hasValue && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                aria-label="Limpar busca"
                className="h-7 px-2 text-xs font-medium"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results indicator */}
        {resultsCount !== undefined && hasValue && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-6 right-0 text-xs text-muted-foreground"
          >
            {resultsCount} {resultsCount === 1 ? 'resultado' : 'resultados'}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
