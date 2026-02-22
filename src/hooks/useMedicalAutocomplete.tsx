/**
 * useMedicalAutocomplete - Autocomplete for clinical terminology
 *
 * Features:
 * - Keyboard shortcut (Ctrl+Space) to trigger
 * - Suggests based on patient pathology
 * - Definitions in tooltips
 * - Supports common PT abbreviations
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  value: string;
  category: 'abbreviation' | 'measurement' | 'procedure' | 'pain' | 'observation';
  definition?: string;
  example?: string;
}

export interface UseMedicalAutocompleteProps {
  pathology?: string;
  triggerShortcut?: string; // e.g., 'Ctrl+Space'
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  disabled?: boolean;
}

// Medical abbreviations and terms
const MEDICAL_ABBREVIATIONS: Record<string, AutocompleteSuggestion> = {
  EVA: {
    id: 'eva',
    label: 'EVA (Escala Visual Analógica)',
    value: 'EVA',
    category: 'pain',
    definition: 'Escala Visual Analógica para avaliação de dor (0-10)',
    example: 'Paciente refere dor EVA 7/10',
  },
  'Escala Visual Analógica': {
    id: 'eva-full',
    label: 'Escala Visual Analógica',
    value: 'EVA',
    category: 'pain',
    definition: 'Escala Visual Analógica para avaliação de dor (0-10)',
    example: 'Paciente refere dor EVA 7/10',
  },
  ADM: {
    id: 'adm',
    label: 'ADM (Amplitude de Movimento)',
    value: 'ADM',
    category: 'measurement',
    definition: 'Amplitude de Movimento - range of motion (ROM)',
    example: 'ADM de flexão de joelho: 0-120°',
  },
  'Amplitude de Movimento': {
    id: 'adm-full',
    label: 'Amplitude de Movimento',
    value: 'ADM',
    category: 'measurement',
    definition: 'Amplitude de Movimento - range of motion (ROM)',
    example: 'ADM de flexão de joelho: 0-120°',
  },
  ROM: {
    id: 'rom',
    label: 'ROM (Range of Motion)',
    value: 'ROM',
    category: 'measurement',
    definition: 'Range of Motion - Amplitude de Movimento',
    example: 'ROM de flexão de ombro: 0-160°',
  },
  'Range of Motion': {
    id: 'rom-full',
    label: 'Range of Motion',
    value: 'ROM',
    category: 'measurement',
    definition: 'Range of Motion - Amplitude de Movimento',
    example: 'ROM de flexão de ombro: 0-160°',
  },
  CREFITO: {
    id: 'crefito',
    label: 'CREFITO',
    value: 'CREFITO',
    category: 'observation',
    definition: 'Conselho Regional de Fisioterapia e Terapia Ocupacional',
  },
  FC: {
    id: 'fc',
    label: 'FC (Frequência Cardíaca)',
    value: 'FC',
    category: 'measurement',
    definition: 'Frequência Cardíaca em batimentos por minuto',
    example: 'FC: 72 bpm',
  },
  'Frequência Cardíaca': {
    id: 'fc-full',
    label: 'Frequência Cardíaca',
    value: 'FC',
    category: 'measurement',
    definition: 'Frequência Cardíaca em batimentos por minuto',
    example: 'FC: 72 bpm',
  },
  PA: {
    id: 'pa',
    label: 'PA (Pressão Arterial)',
    value: 'PA',
    category: 'measurement',
    definition: 'Pressão Arterial sistólica/diastólica',
    example: 'PA: 120/80 mmHg',
  },
  'Pressão Arterial': {
    id: 'pa-full',
    label: 'Pressão Arterial',
    value: 'PA',
    category: 'measurement',
    definition: 'Pressão Arterial sistólica/diastólica',
    example: 'PA: 120/80 mmHg',
  },
  'SatO2': {
    id: 'sato2',
    label: 'SatO2 (Saturação de O2)',
    value: 'SatO2',
    category: 'measurement',
    definition: 'Saturação de oxigênio no sangue',
    example: 'SatO2: 98%',
  },
  'Saturação de O2': {
    id: 'sato2-full',
    label: 'Saturação de O2',
    value: 'SatO2',
    category: 'measurement',
    definition: 'Saturação de oxigênio no sangue',
    example: 'SatO2: 98%',
  },
  VO: {
    id: 'vo',
    label: 'VO (Vital Objetiva)',
    value: 'VO',
    category: 'procedure',
    definition: 'Vital Objetiva - avaliação dos sinais vitais',
    example: 'VO: PA 120/80, FC 72, SatO2 98%',
  },
  SLR: {
    id: 'slr',
    label: 'SLR (Straight Leg Raise)',
    value: 'SLR',
    category: 'measurement',
    definition: 'Teste de elevação da perna reta para compressão radicular',
    example: 'SLR positivo a 30° à direita',
  },
  'Straight Leg Raise': {
    id: 'slr-full',
    label: 'Straight Leg Raise',
    value: 'SLR',
    category: 'measurement',
    definition: 'Teste de elevação da perna reta para compressão radicular',
    example: 'SLR positivo a 30° à direita',
  },
  MI: {
    id: 'mi',
    label: 'MI (Membro Inferior)',
    value: 'MI',
    category: 'observation',
    definition: 'Membro Inferior - pernas',
  },
  MS: {
    id: 'ms',
    label: 'MS (Membro Superior)',
    value: 'MS',
    category: 'observation',
    definition: 'Membro Superior - braços',
  },
  VHS: {
    id: 'vhs',
    label: 'VHS (Velocidade de Hemossedimentação)',
    value: 'VHS',
    category: 'measurement',
    definition: 'Velocidade de Hemossedimentação - exame laboratorial',
    example: 'VHS: 15 mm/h (elevado)',
  },
  CRP: {
    id: 'crp',
    label: 'CRP (Proteína C Reativa)',
    value: 'CRP',
    category: 'measurement',
    definition: 'Proteína C Reativa - marcador inflamatório',
    example: 'CRP: 5 mg/L (leve inflamação)',
  },
  NRS: {
    id: 'nrs',
    label: 'NRS (Numeric Rating Scale)',
    value: 'NRS',
    category: 'pain',
    definition: 'Escala Numérica de Avaliação de Dor (0-10)',
    example: 'Dor NRS 7/10',
  },
};

// Measurements by pathology
const PATHOLOGY_MEASUREMENTS: Record<string, string[]> = {
  lombalgia: ['rom_lombar', 'forca_muscular', 'teste_slr', 'teste_thomas'],
  'lesao_ombro': ['rom_ombro', 'teste_speed', 'teste_yergason', 'teste_empty_can'],
  'lesao_acl': ['rom_joelho', 'teste_lachman', 'teste_pivot_shift', 'y_balance'],
  'lesao_tornozelo': ['rom_tornozelo', 'teste_garrau', 'teste_cajado'],
};

// All suggestions as array
const ALL_SUGGESTIONS = Object.values(MEDICAL_ABBREVIATIONS);

export const useMedicalAutocomplete = ({
  pathology,
  triggerShortcut = 'Ctrl+Space',
  onSelect,
  disabled = false,
}: UseMedicalAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Filter suggestions based on query and pathology
  const filteredSuggestions = useMemo(() => {
    let suggestions = ALL_SUGGESTIONS;

    // Add pathology-specific measurements
    if (pathology && PATHOLOGY_MEASUREMENTS[pathology]) {
      const pathologySuggestions = PATHOLOGY_MEASUREMENTS[pathology].map(
        (measurement) => ({
          id: measurement,
          label: measurement.replace(/_/g, ' ').toUpperCase(),
          value: measurement,
          category: 'measurement' as const,
          definition: `Mensuração recomendada para ${pathology.replace(/_/g, ' ')}`,
        })
      );
      suggestions = [...suggestions, ...pathologySuggestions];
    }

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      suggestions = suggestions.filter((s) =>
        s.label.toLowerCase().includes(lowerQuery) ||
        s.value.toLowerCase().includes(lowerQuery)
      );
    }

    return suggestions;
  }, [query, pathology]);

  // Handle keyboard shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const isShortcut =
        (e.ctrlKey || e.metaKey) && e.code === 'Space';

      if (isShortcut) {
        e.preventDefault();
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;

        // Only trigger in textarea/input
        if (
          target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && target.type === 'text')
        ) {
          inputRef.current = target;
          const rect = target.getBoundingClientRect();
          setPosition({
            x: rect.left,
            y: rect.bottom + 4,
          });

          // Get current text before cursor
          const text = target.value.substring(0, target.selectionStart);
          const lastWord = text.split(/\s+/).pop() || '';
          setQuery(lastWord);
          setSelectedIndex(0);
          setIsOpen(true);
        }
      }
    },
    [disabled]
  );

  // Handle keyboard navigation
  const handleSuggestionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredSuggestions.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          handleSelect(filteredSuggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, filteredSuggestions, selectedIndex]
  );

  const handleSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      onSelect?.(suggestion);
      setIsOpen(false);
      setQuery('');

      // Replace the word before cursor with the selected value
      if (inputRef.current) {
        const start = inputRef.current.selectionStart || 0;
        const text = inputRef.current.value;
        const beforeCursor = text.substring(0, start);
        const afterCursor = text.substring(start);

        const lastWordEnd = beforeCursor.search(/\s+$/);
        const newText =
          beforeCursor.substring(0, lastWordEnd === -1 ? 0 : lastWordEnd) +
          suggestion.value +
          ' ' +
          afterCursor;

        inputRef.current.value = newText;
        const newPosition = (beforeCursor.substring(0, lastWordEnd === -1 ? 0 : lastWordEnd) + suggestion.value + ' ').length;
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    },
    [onSelect]
  );

  // Set up keyboard shortcut listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return {
    isOpen,
    query,
    setQuery,
    selectedIndex,
    filteredSuggestions,
    position,
    handleSelect,
    handleSuggestionKeyDown,
    close: () => setIsOpen(false),
  };
};

// Helper component for autocomplete menu
export const MedicalAutocompleteMenu: React.FC<{
  isOpen: boolean;
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  position: { x: number; y: number };
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onClose: () => void;
}> = ({ isOpen, suggestions, selectedIndex, position, onSelect, onClose }) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      className="fixed z-50 w-72 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
      style={{ left: position.x, top: position.y }}
      role="listbox"
      aria-label="Sugestões médicas"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => {
            onSelect(suggestion);
            onClose();
          }}
          className={cn(
            'px-3 py-2 cursor-pointer transition-colors',
            'hover:bg-muted/50',
            index === selectedIndex && 'bg-muted/100'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-sm text-foreground">
                {suggestion.label}
              </span>
              {suggestion.definition && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {suggestion.definition}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase">
              {suggestion.category}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
