import React, { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell } from 'lucide-react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import {

    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ExerciseAutocompleteProps {
    onSelect: (exercise: Exercise) => void;
    className?: string;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
    onSelect,
    className
}) => {
    const [open, setOpen] = useState(false);
    const { exercises } = useExercises();
    const [searchValue, setSearchValue] = useState("");

    const filteredExercises = useMemo(() => {
        if (!searchValue) return exercises.slice(0, 10);
        return exercises.filter((ex) =>
            ex.name.toLowerCase().includes(searchValue.toLowerCase())
        ).slice(0, 10);
    }, [exercises, searchValue]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between pl-3 font-normal", className)}
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        <span>Buscar na biblioteca...</span>
                    </div>
                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Pesquisar exercício..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList>
                        <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
                        <CommandGroup>
                            {filteredExercises.map((exercise) => (
                                <CommandItem
                                    key={exercise.id}
                                    value={exercise.id}
                                    onSelect={() => {
                                        onSelect(exercise);
                                        setOpen(false);
                                        setSearchValue("");
                                    }}
                                    className="flex items-center gap-3 p-2 cursor-pointer"
                                >
                                    <div className="h-10 w-10 flex-shrink-0 rounded bg-muted overflow-hidden">
                                        {exercise.image_url ? (
                                            <img
                                                src={exercise.image_url}
                                                alt={exercise.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{exercise.name}</span>
                                        <span className="text-xs text-muted-foreground">{exercise.category}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
