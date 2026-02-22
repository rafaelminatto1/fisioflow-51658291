import Fuse from 'fuse.js';
import * as React from 'react';
import { Check, ChevronsUpDown, UserPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import type { Patient } from "@/types";
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PatientComboboxProps {
  patients: Patient[];
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew?: (searchTerm: string) => void;
  /** Nome a exibir quando value está setado mas o paciente ainda não está na lista (ex.: recém-criado) */
  fallbackDisplayName?: string;
  disabled?: boolean;
  className?: string;
}

export function PatientCombobox({
  patients,
  value,
  onValueChange,
  onCreateNew,
  fallbackDisplayName,
  disabled = false,
  className,
}: PatientComboboxProps) {
  React.useEffect(() => {
    logger.debug('PatientCombobox mounted', { patientsLength: patients?.length }, 'PatientCombobox');
  }, [patients]);

  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const canCreateNew = typeof onCreateNew === 'function';

  const selectedPatient = React.useMemo(() =>
    patients.find((patient) => patient.id === value),
    [patients, value]
  );

  // Initialize Fuse instance with improved settings
  const fuse = React.useMemo(() => {
    return new Fuse(patients, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'full_name', weight: 0.7 },
        { name: 'cpf', weight: 0.3 },
        { name: 'phone', weight: 0.3 }
      ],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 1,
      includeScore: true,
      isCaseSensitive: false,
      findAllMatches: true,
      useExtendedSearch: true,
    });
  }, [patients]);

  const filteredPatients = React.useMemo(() => {
    if (!inputValue || inputValue.trim() === '') return patients;

    const searchTerm = inputValue.trim().toLowerCase();
    const normalizedDigits = searchTerm.replace(/\D/g, '');

    const matchName = (p: Patient) =>
      (p.name && p.name.toLowerCase().includes(searchTerm)) ||
      (p.full_name && p.full_name.toLowerCase().includes(searchTerm));

    const matchCpf = (p: Patient) => {
      if (!p.cpf) return false;
      if (p.cpf.toLowerCase().includes(searchTerm)) return true;
      if (normalizedDigits.length >= 2 && p.cpf.replace(/\D/g, '').includes(normalizedDigits)) return true;
      return false;
    };

    const matchPhone = (p: Patient) => {
      if (!p.phone) return false;
      if (p.phone.includes(searchTerm) || p.phone.replace(/\D/g, '').includes(searchTerm)) return true;
      if (normalizedDigits.length >= 2 && p.phone.replace(/\D/g, '').includes(normalizedDigits)) return true;
      return false;
    };

    const directMatches = patients.filter(p => matchName(p) || matchCpf(p) || matchPhone(p));

    const results = fuse.search(searchTerm);
    const mapped = results
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .map(result => result.item);

    const resultList = directMatches.length > 0 ? directMatches : mapped;
    logger.debug('PatientCombobox filtering', { searchTerm, direct: directMatches.length, fuzzy: mapped.length }, 'PatientCombobox');
    return resultList;
  }, [fuse, inputValue, patients]);

  const handleSelect = (patientId: string) => {
    logger.debug('PatientCombobox handleSelect called', { patientId, callback: !!onValueChange }, 'PatientCombobox');
    console.log('PatientCombobox handleSelect called:', patientId);
    onValueChange(patientId === value ? "" : patientId);
    setOpen(false);
    setInputValue("");
  };

  const handleCreateNew = () => {
    if (!canCreateNew || !onCreateNew) return;
    setOpen(false);
    onCreateNew(inputValue);
    setInputValue("");
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setInputValue("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          data-testid="patient-select"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background text-left font-normal",
            !selectedPatient && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="h-4 w-4 shrink-0 opacity-50" />
              <div className="flex flex-col items-start truncate leading-tight">
                <span className="truncate font-medium">{selectedPatient.name || selectedPatient.full_name}</span>
                {selectedPatient.incomplete_registration && (
                  <span className="text-[10px] text-amber-600 font-normal">Cadastro incompleto</span>
                )}
              </div>
            </div>
          ) : value && fallbackDisplayName ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="h-4 w-4 shrink-0 opacity-50" />
              <div className="flex flex-col items-start truncate leading-tight">
                <span className="truncate font-medium">{fallbackDisplayName}</span>
                <span className="text-[10px] text-amber-600 font-normal">Recém-cadastrado</span>
              </div>
            </div>
          ) : (
            "Selecione o paciente..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[400px] p-2" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            data-testid="patient-search"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (canCreateNew && inputValue && filteredPatients.length === 0) {
                  e.preventDefault();
                  handleCreateNew();
                }
              }
            }}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {filteredPatients.length === 0 && (
              <CommandEmpty>
                <div className="py-4 px-2 flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum paciente encontrado com "{inputValue}"
                  </p>
                  {canCreateNew && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCreateNew}
                      className="w-full mt-2 gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Cadastrar "{inputValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}

            {filteredPatients.length > 0 && (
              <CommandGroup heading="Pacientes Encontrados">
                {filteredPatients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.name || ''} ${patient.cpf || ''} ${patient.id}`} // Helper for cmdk internal keying if needed, though filtered manually
                    onSelect={() => handleSelect(patient.id)}
                    className="cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 py-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        value === patient.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent"
                      )}>
                        {value === patient.id ? <Check className="h-4 w-4" /> : <User className="h-4 w-4 opacity-50" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{patient.name || patient.full_name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {patient.phone && <span>{patient.phone}</span>}
                          {patient.cpf && <span>• CPF: {patient.cpf}</span>}
                        </div>
                      </div>
                    </div>

                    {patient.incomplete_registration && (
                      <div className="shrink-0 flex items-start sm:items-center">
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium whitespace-nowrap">
                          ⚠️ Incompleto
                        </span>
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Always show create option at bottom if there is input */}
            {canCreateNew && inputValue.length > 0 && filteredPatients.length > 0 && (
              <>
                <div className="h-px bg-border mx-2 my-1" />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="cursor-pointer text-primary"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Cadastrar novo: "{inputValue}"</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
