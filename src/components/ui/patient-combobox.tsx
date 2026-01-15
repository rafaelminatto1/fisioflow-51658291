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
  CommandSeparator,
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
  const [searchTerm, setSearchTerm] = React.useState("");

  const selectedPatient = patients.find((patient) => patient.id === value);

  // Normalization function to remove accents
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const filteredPatients = React.useMemo(() => {
    if (!searchTerm) return patients;

    const normalizedSearch = normalize(searchTerm);

    return patients.filter((patient) =>
      normalize(patient.name).includes(normalizedSearch)
    );
  }, [patients, searchTerm]);

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setSearchTerm("");
  };

  const handleCreateNew = () => {
    setOpen(false);
    onCreateNew(searchTerm);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            placeholder="Buscar ou criar paciente..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm && filteredPatients.length === 0) {
                e.preventDefault();
                handleCreateNew();
              }
            }}
          />
          <CommandList>
            {filteredPatients.length === 0 && searchTerm ? (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Paciente "{searchTerm}" não encontrado
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
            ) : (
              <>
                <CommandGroup heading="Pacientes">
                  {filteredPatients.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={patient.id}
                      keywords={[patient.name]}
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
                {searchTerm && filteredPatients.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="cursor-pointer"
                        value={`create-${searchTerm}`}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Criar novo paciente "{searchTerm}"</span>
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
