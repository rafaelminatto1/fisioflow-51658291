import Fuse from 'fuse.js';
import * as React from 'react';
import { Check, ChevronsUpDown, Search, User, UserPlus } from 'lucide-react';
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

interface PatientComboboxProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'value' | 'onChange' | 'children'> {
  patients: Patient[];
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew?: (searchTerm: string) => void;
  /** Nome a exibir quando value está setado mas o paciente ainda não está na lista (ex.: recém-criado) */
  fallbackDisplayName?: string;
  /** Descrição opcional para o fallback (ex.: "Recém-cadastrado") */
  fallbackDescription?: string;
  disabled?: boolean;
  className?: string;
}

export function PatientCombobox({
  patients,
  value,
  onValueChange,
  onCreateNew,
  fallbackDisplayName,
  fallbackDescription,
  disabled = false,
  className,
  ...buttonProps
}: PatientComboboxProps) {
  React.useEffect(() => {
    logger.debug('PatientCombobox mounted', { patientsLength: patients?.length }, 'PatientCombobox');
  }, [patients]);

  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const canCreateNew = typeof onCreateNew === 'function';
  const hasFallbackDisplay = Boolean(fallbackDisplayName && (value || disabled));

  const selectedPatient = React.useMemo(() =>
    patients.find((patient) => patient.id === value),
    [patients, value]
  );

  const getPatientName = (patient?: Patient | null) =>
    patient?.name || patient?.full_name || 'Paciente sem nome';

  const getPatientMeta = (patient?: Patient | null, description?: string) => {
    if (!patient) {
      return description || 'Busque por nome, CPF ou telefone';
    }

    const details = [
      patient.phone,
      patient.cpf ? `CPF ${patient.cpf}` : null,
    ].filter(Boolean) as string[];

    if (patient.incomplete_registration) {
      details.unshift('Cadastro incompleto');
    }

    return details.slice(0, 2).join(' • ') || description || 'Paciente selecionado';
  };

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
          type="button"
          variant="outline"
          role="combobox"
          data-testid="patient-select"
          aria-expanded={open}
          aria-label={
            selectedPatient
              ? `Paciente selecionado: ${getPatientName(selectedPatient)}`
              : hasFallbackDisplay
                ? `Paciente selecionado: ${fallbackDisplayName}`
                : 'Selecionar paciente'
          }
          className={cn(
            "h-auto min-h-12 w-full justify-between rounded-xl border-border/70 bg-background px-3 py-2.5 text-left font-normal shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-primary/30 data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)] disabled:bg-muted/40 disabled:text-muted-foreground",
            className
          )}
          disabled={disabled}
          {...buttonProps}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              selectedPatient || hasFallbackDisplay
                ? "border-primary/15 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/50 text-muted-foreground"
            )}>
              <User className="h-4 w-4" />
            </div>

            {selectedPatient ? (
              <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">
                  {getPatientName(selectedPatient)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {getPatientMeta(selectedPatient)}
                </span>
              </div>
            ) : hasFallbackDisplay ? (
              <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">{fallbackDisplayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {getPatientMeta(undefined, fallbackDescription)}
                </span>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
                <span className="truncate text-sm font-medium text-foreground">Selecione o paciente</span>
                <span className="truncate text-xs text-muted-foreground">
                  Busque por nome, CPF ou telefone
                </span>
              </div>
            )}
          </div>

          <ChevronsUpDown className={cn(
            "ml-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/70 bg-popover p-0 shadow-2xl"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command shouldFilter={false} loop className="rounded-[inherit] bg-background">
          <div className="border-b border-border/60 bg-muted/20 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Buscar paciente
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Nome, CPF ou telefone
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>

          <CommandInput
            ref={inputRef}
            data-testid="patient-search"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={inputValue}
            onValueChange={setInputValue}
            autoFocus
            wrapperClassName="mx-0 mt-0 rounded-xl border border-border/70 bg-background px-3 shadow-sm"
            iconClassName="text-muted-foreground/70"
            className="h-11 py-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (canCreateNew && inputValue && filteredPatients.length === 0) {
                  e.preventDefault();
                  handleCreateNew();
                }
              }
            }}
          />
          </div>

          <CommandList className="max-h-[22rem] overflow-y-auto p-2">
            {filteredPatients.length === 0 && (
              <CommandEmpty className="py-0">
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Nenhum paciente encontrado</p>
                    <p className="text-xs text-muted-foreground">
                      {inputValue ? `Nenhum resultado para "${inputValue}".` : 'Digite para buscar um paciente.'}
                    </p>
                  </div>
                  {canCreateNew && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleCreateNew}
                      className="mt-1 w-full gap-2 rounded-xl"
                    >
                      <UserPlus className="w-4 h-4" />
                      Cadastrar novo paciente
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}

            {filteredPatients.length > 0 && (
              <CommandGroup
                heading="Pacientes encontrados"
                className="px-1 pt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-0 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em]"
              >
                {filteredPatients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.name || patient.full_name || ''} ${patient.cpf || ''} ${patient.id}`}
                    onSelect={() => handleSelect(patient.id)}
                    className="mb-1 cursor-pointer rounded-xl border border-transparent px-3 py-3 transition-colors data-[selected=true]:border-primary/15 data-[selected=true]:bg-primary/5"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        value === patient.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-muted/50 text-muted-foreground"
                      )}>
                        {value === patient.id ? <Check className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {getPatientName(patient)}
                          </span>
                          {value === patient.id && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Selecionado
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {patient.phone && (
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              {patient.phone}
                            </span>
                          )}
                          {patient.cpf && (
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              CPF {patient.cpf}
                            </span>
                          )}
                          {!patient.phone && !patient.cpf && (
                            <span>Sem telefone ou CPF cadastrado</span>
                          )}
                        </div>

                        {patient.incomplete_registration && (
                          <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Cadastro incompleto
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Always show create option at bottom if there is input */}
            {canCreateNew && inputValue.length > 0 && filteredPatients.length > 0 && (
              <div className="border-t border-border/60 p-2">
                <CommandGroup className="p-0">
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="cursor-pointer rounded-xl px-3 py-3 text-primary data-[selected=true]:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-semibold">Cadastrar novo paciente</span>
                        <span className="text-xs text-muted-foreground">
                          Usar "{inputValue}" como nome inicial
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
