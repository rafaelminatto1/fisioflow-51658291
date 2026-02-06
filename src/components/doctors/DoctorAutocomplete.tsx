import React, { useState, useEffect, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Stethoscope, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchDoctors } from '@/hooks/useDoctors';
import type { Doctor } from '@/types/doctor';

interface DoctorAutocompleteProps {
    value?: string; // Doctor name
    onSelect: (doctor: Doctor | null) => void;
    onCreateNew?: (searchTerm: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DoctorAutocomplete({
    value = '',
    onSelect,
    onCreateNew,
    placeholder = 'Selecione ou digite o nome do médico...',
    disabled = false,
    className,
}: DoctorAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: doctors = [], isLoading } = useSearchDoctors(searchTerm, searchTerm.length >= 2);

    // Update search term when value changes externally
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    const normalizedSearchTerm = searchTerm.trim();
    const hasExactMatch = doctors.some(
        (doctor) => doctor.name?.trim().toLowerCase() === normalizedSearchTerm.toLowerCase()
    );
    const shouldShowCreateOption = Boolean(
        onCreateNew && normalizedSearchTerm.length >= 2 && !hasExactMatch
    );

    const handleSelect = (doctor: Doctor) => {
        setSearchTerm(doctor.name);
        onSelect(doctor);
        setOpen(false);
    };

    const handleInputChange = (newValue: string) => {
        setSearchTerm(newValue);

        // If user clears the input, clear the selection
        if (!newValue) {
            onSelect(null);
        }
    };

    const handleCreateNew = () => {
        if (!shouldShowCreateOption) return;
        setOpen(false);
        onCreateNew?.(normalizedSearchTerm);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', className)}
                    disabled={disabled}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Stethoscope className="h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">{searchTerm || placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onValueChange={handleInputChange}
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Buscando médicos...
                            </div>
                        ) : doctors.length === 0 && searchTerm.length >= 2 ? (
                            <CommandEmpty>
                                <div className="py-4 text-center">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Nenhum médico encontrado
                                    </p>
                                    {shouldShowCreateOption && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCreateNew}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Cadastrar novo médico
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                        ) : doctors.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Digite pelo menos 2 caracteres para buscar
                            </div>
                        ) : (
                            <>
                                <CommandGroup>
                                    {doctors.map((doctor) => (
                                        <CommandItem
                                            key={doctor.id}
                                            value={doctor.id}
                                            onSelect={() => handleSelect(doctor)}
                                            className="flex items-center justify-between gap-2 cursor-pointer"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Check
                                                        className={cn(
                                                            'h-4 w-4 shrink-0',
                                                            searchTerm === doctor.name ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium truncate">{doctor.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {doctor.specialty && <span>{doctor.specialty}</span>}
                                                            {doctor.specialty && doctor.phone && <span>•</span>}
                                                            {doctor.phone && <span>{doctor.phone}</span>}
                                                        </div>
                                                        {doctor.clinic_name && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {doctor.clinic_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>

                                {shouldShowCreateOption && (
                                    <>
                                        <div className="h-px bg-border mx-2 my-1" />
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={handleCreateNew}
                                                className="cursor-pointer text-primary"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                <span>Cadastrar novo: "{normalizedSearchTerm}"</span>
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
