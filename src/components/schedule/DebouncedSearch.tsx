/**
 * DebouncedSearch - Campo de busca com debounce otimizado
 *
 * Performance: Reduz chamadas desnecessárias
 * - Debounce customizável (default 300ms)
 * - Cancelamento de operações pendentes
 * - Loading state visual
 * - Suporte a comandos de busca
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebouncedSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showClearButton?: boolean;
  showCommandHint?: boolean;
  minLength?: number; // Mínimo de caracteres para disparar busca
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const DebouncedSearch = memo(({
  value: controlledValue,
  onChange,
  placeholder = 'Buscar...',
  debounceMs = 300,
  className,
  autoFocus = false,
  disabled = false,
  showClearButton = true,
  showCommandHint = true,
  minLength = 2,
  onSearch,
  onFocus,
  onBlur,
}: DebouncedSearchProps) => {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Usar valor controlado se fornecido
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Função de busca com debounce
  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsDebouncing(query.length >= minLength);

    timeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
      if (query.length >= minLength || query.length === 0) {
        onSearch?.(query);
        onChange?.(query);
      }
    }, debounceMs);
  }, [debounceMs, minLength, onSearch, onChange]);

  // Handler para mudança de valor
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    debouncedSearch(newValue);
  }, [controlledValue, debouncedSearch]);

  // Handler para limpar
  const handleClear = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    debouncedSearch('');
    onChange?.('');
    inputRef.current?.focus();
  }, [controlledValue, onChange, debouncedSearch]);

  // Handler para submissão (Enter)
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDebouncing(false);
    onSearch?.(value);
    onChange?.(value);
  }, [value, onSearch, onChange]);

  // Focar input automaticamente
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Detectar tecla Command/Ctrl para mostrar hint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setShowCommand(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Mostrar hint de comando
  useEffect(() => {
    const handleMetaOrCtrl = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setShowCommand(true);
      }
    };

    if (showCommandHint) {
      window.addEventListener('keydown', handleMetaOrCtrl);
    }

    return () => {
      window.removeEventListener('keydown', handleMetaOrCtrl);
    };
  }, [showCommandHint]);

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <Search
          className={cn(
            'absolute left-3 w-4 h-4 transition-colors',
            isDebouncing ? 'text-primary animate-pulse' : 'text-muted-foreground'
          )}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full h-10 pl-10 pr-20 rounded-lg border border-input bg-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            'placeholder:text-muted-foreground/70'
          )}
          autoComplete="off"
        />

        {/* Command hint */}
        {showCommandHint && showCommand && value.length === 0 && !disabled && (
          <div className="absolute left-3 right-3 flex items-center justify-center pointer-events-none">
            <kbd className="px-2 py-1 text-xs font-medium bg-muted rounded border border-border/30">
              <Command className="w-3 h-3 inline mr-1" />
              K
            </kbd>
          </div>
        )}

        {/* Clear button */}
        {showClearButton && value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute right-2 p-1.5 rounded-md transition-colors',
              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Loading indicator */}
        {isDebouncing && (
          <div className="absolute right-2 w-2 h-2 bg-primary rounded-full animate-ping" />
        )}
      </div>

      {/* Character count */}
      {minLength > 0 && value.length > 0 && value.length < minLength && (
        <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
          Digite pelo menos {minLength} caracteres...
        </div>
      )}
    </form>
  );
});

DebouncedSearch.displayName = 'DebouncedSearch';

// Hook para uso independente
export const useDebouncedSearch = (
  initialValue: string = '',
  debounceMs: number = 300
) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceMs]);

  return { value, setValue, debouncedValue };
};

// Versão avançada com sugestões
interface SearchSuggestion {
  id: string;
  label: string;
  type?: 'recent' | 'suggestion' | 'filter';
  icon?: React.ReactNode;
  action?: () => void;
}

interface DebouncedSearchAdvancedProps extends Omit<DebouncedSearchProps, 'onSearch'> {
  suggestions?: SearchSuggestion[];
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
}

export const DebouncedSearchAdvanced = memo((
  props: DebouncedSearchAdvancedProps
) => {
  const {
    suggestions = [],
    onSuggestionClick,
    showSuggestions = true,
    ...searchProps
  } = props;

  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => {
    if (!showSuggestionsDropdown || searchProps.value === undefined || searchProps.value.length < 1) {
      return [];
    }
    return suggestions.filter(s =>
      s.label.toLowerCase().includes((searchProps.value || '').toLowerCase())
    );
  }, [suggestions, showSuggestionsDropdown, searchProps.value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestionsDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          e.preventDefault();
          onSuggestionClick?.(filteredSuggestions[selectedIndex]);
          setShowSuggestionsDropdown(false);
        }
        break;
      case 'Escape':
        setShowSuggestionsDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showSuggestionsDropdown, selectedIndex, filteredSuggestions, onSuggestionClick]);

  return (
    <div className="relative">
      <DebouncedSearch
        {...searchProps}
        onChange={(val) => {
          searchProps.onChange?.(val);
          setShowSuggestionsDropdown(val.length > 0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestionsDropdown(false), 200)}
      />

      {/* Suggestions dropdown */}
      {showSuggestionsDropdown && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onSuggestionClick?.(suggestion);
                setShowSuggestionsDropdown(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                'hover:bg-muted focus:bg-muted focus:outline-none',
                index === selectedIndex && 'bg-muted'
              )}
            >
              {suggestion.icon}
              <span>{suggestion.label}</span>
              {suggestion.type && (
                <span className="ml-auto text-xs text-muted-foreground capitalize">
                  {suggestion.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

DebouncedSearchAdvanced.displayName = 'DebouncedSearchAdvanced';
