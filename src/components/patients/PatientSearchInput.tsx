import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePatientSearch } from '@/hooks/usePatients';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { PatientSearchResult } from '@/types/agenda';

interface PatientSearchInputProps {
  onPatientSelect: (patient: PatientSearchResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  selectedPatient?: PatientSearchResult | null;
}

export function PatientSearchInput({
  onPatientSelect,
  placeholder = "Buscar paciente...",
  className,
  disabled = false,
  selectedPatient
}: PatientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [], isLoading } = usePatientSearch(searchTerm);

  // Debounced search to avoid too many API calls
  const debouncedSearch = useDebouncedCallback((term: string) => {
    if (term.length >= 2) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
            handlePatientSelect(searchResults[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, searchResults, highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatientSelect = (patient: PatientSearchResult) => {
    onPatientSelect(patient);
    setSearchTerm(patient.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearSelection = () => {
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (selectedPatient && value !== selectedPatient.name) {
      // Clear selection if user is typing something different
      // onPatientSelect(null); // This would need to be handled by parent
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (searchTerm.length >= 2) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((patient, index) => (
                  <PatientSearchItem
                    key={patient.id}
                    patient={patient}
                    isHighlighted={index === highlightedIndex}
                    onClick={() => handlePatientSelect(patient)}
                  />
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="p-4 text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum paciente encontrado</p>
                <p className="text-xs">Tente buscar por nome ou telefone</p>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite pelo menos 2 caracteres para buscar</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual patient search result item
interface PatientSearchItemProps {
  patient: PatientSearchResult;
  isHighlighted: boolean;
  onClick: () => void;
}

function PatientSearchItem({ patient, isHighlighted, onClick }: PatientSearchItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0",
        isHighlighted ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={patient.avatar_url} alt={patient.name} />
        <AvatarFallback>
          {patient.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{patient.name}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {patient.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{patient.phone}</span>
            </div>
          )}
          {patient.session_price && (
            <Badge variant="outline" className="text-xs">
              R$ {patient.session_price.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for patient search with caching
function usePatientSearch(searchTerm: string) {
  return {
    data: [], // This would be implemented with actual search logic
    isLoading: false
  };
}