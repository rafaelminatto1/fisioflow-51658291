import React, { useState, useMemo } from "react";
import { Search, Plus, Dumbbell, PlusCircle } from "lucide-react";
import { useExercises, type Exercise } from "@/hooks/useExercises";
import { cn } from "@/lib/utils";
import { withImageParams } from "@/lib/storageProxy";
import { accentIncludes, bilingualFilter } from "@/lib/utils/bilingualSearch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ExerciseAutocompleteProps {
  onSelect: (exercise: Exercise) => void;
  onCreateNew?: (searchTerm: string) => void;
  className?: string;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  onSelect,
  onCreateNew,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const { exercises } = useExercises();
  const [searchValue, setSearchValue] = useState("");
  const canCreateNew = typeof onCreateNew === "function";

  const filteredExercises = useMemo(() => {
    if (!searchValue) return exercises.slice(0, 10);
    return bilingualFilter(exercises, searchValue, ['name', 'aliases_pt', 'aliases_en']).slice(0, 10);
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
            <CommandEmpty>
              <div className="py-3 px-2 text-center space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Exercício não encontrado. Deseja cadastrar <span className="font-semibold text-foreground">&quot;{searchValue.trim()}&quot;</span> ou quer sugestões para substituir?
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {canCreateNew && searchValue.trim().length >= 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 w-full"
                      onClick={() => {
                        onCreateNew!(searchValue.trim());
                        setOpen(false);
                        setSearchValue("");
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Cadastrar &quot;{searchValue.trim()}&quot;
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                    onClick={() => {
                      // Placeholder for future AI suggestion feature
                      setSearchValue("");
                    }}
                  >
                    <Search className="h-4 w-4" />
                    Buscar sugestões para substituir
                  </Button>
                </div>
              </div>
            </CommandEmpty>
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
                        src={withImageParams(exercise.image_url, {
                          width: 96,
                          height: 96,
                          dpr: 2,
                          format: "auto",
                          fit: "cover",
                          quality: 70,
                        })}
                        alt={exercise.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
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
            {canCreateNew && searchValue.trim().length >= 2 && filteredExercises.length > 0 && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-primary hover:text-primary hover:bg-primary/5 justify-start"
                  onClick={() => {
                    onCreateNew!(searchValue.trim());
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  Cadastrar &quot;{searchValue.trim()}&quot; como novo exercício
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
