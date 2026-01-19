import Fuse from 'fuse.js';
import * as React from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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


interface Patient {
  id: string;
  name: string;
  incomplete_registration?: boolean;
}

interface PatientComboboxProps {
  patients: Patient[];
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew: (searchTerm: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PatientCombobox({
  patients,
  value,
  onValueChange,
  onCreateNew,
  disabled = false,
  className,
}: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");

  const selectedPatient = patients.find((patient) => patient.id === value);

  // Initialize Fuse instance with permissive settings for better fuzzy matching
  const fuse = React.useMemo(() => {
    return new Fuse(patients, {
      keys: ['name'],
      threshold: 0.4, // More permissive threshold for fuzzy matching
      ignoreLocation: true,
      minMatchCharLength: 1, // Allow single character matches
      includeScore: true,
      isCaseSensitive: false,
      findAllMatches: true,
    });
  }, [patients]);

  const filteredPatients = React.useMemo(() => {
    if (!inputValue || inputValue.trim() === '') return patients;

    const searchTerm = inputValue.trim().toLowerCase();
    const results = fuse.search(searchTerm);

    // Sort by score (lower is better) and return items
    return results
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .map(result => result.item);
  }, [fuse, inputValue, patients]);

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setOpen(false);
    onCreateNew(inputValue);
  };

  return (
    <Popover open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) {
        setInputValue("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-background", className)}
          disabled={disabled}
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedPatient.name}</span>
              {selectedPatient.incomplete_registration && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                  ⚠️
                </span>
              )}
            </div>
          ) : (
            "Selecione ou digite o nome do paciente..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Buscar ou criar paciente..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // If user presses enter and there are no matches, allow creation
                if (inputValue && filteredPatients.length === 0) {
                  e.preventDefault();
                  handleCreateNew();
                }
                // If there are matches, standard behavior handles selection usually.
              }
            }}
          />
          <CommandList>
            {filteredPatients.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Paciente não encontrado
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateNew}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Criar Novo Paciente
                  </Button>
                </div>
              </CommandEmpty>
            )}
            <CommandGroup heading="Pacientes">
              {filteredPatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => handleSelect(patient.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === patient.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span>{patient.name}</span>
                    {patient.incomplete_registration && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                        ⚠️ Cadastro incompleto
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
