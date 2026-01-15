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

  const selectedPatient = patients.find((patient) => patient.id === value);

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  const handleCreateNew = () => {
    const searchTerm = inputRef.current?.value || "";
    setOpen(false);
    onCreateNew(searchTerm);
  };

  return (
    <Popover open={open} onOpenChange={(open) => {
      setOpen(open);
      // Clear input when closing popover
      if (!open && inputRef.current) {
        inputRef.current.value = "";
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
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder="Buscar ou criar paciente..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = inputRef.current?.value || "";
                if (searchTerm && !patients.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))) {
                  handleCreateNew();
                }
              }
            }}
          />
          <CommandList>
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
            <CommandGroup heading="Pacientes">
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.name}
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
