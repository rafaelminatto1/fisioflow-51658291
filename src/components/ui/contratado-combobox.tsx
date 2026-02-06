import * as React from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {

  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Contratado } from '@/hooks/useContratados';

interface ContratadoComboboxProps {
  contratados: Contratado[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ContratadoCombobox({
  contratados,
  value,
  onValueChange,
  disabled = false,
  className,
}: ContratadoComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const selected = React.useMemo(
    () => contratados.find((c) => c.id === value),
    [contratados, value]
  );

  const filtered = React.useMemo(() => {
    if (!inputValue.trim()) return contratados;
    const term = inputValue.toLowerCase();
    return contratados.filter((c) =>
      [c.nome, c.contato, c.cpf_cnpj, c.especialidade]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [contratados, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between bg-background text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {selected ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="h-4 w-4 shrink-0 opacity-50" />
              <span className="truncate font-medium">{selected.nome}</span>
            </div>
          ) : (
            'Selecione o contratado...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] sm:w-[420px] p-2" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome, contato ou CPF/CNPJ..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filtered.length === 0 && (
              <CommandEmpty>Nenhum contratado encontrado.</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Contratados">
                {filtered.map((contratado) => (
                  <CommandItem
                    key={contratado.id}
                    value={`${contratado.nome} ${contratado.id}`}
                    onSelect={() => {
                      onValueChange(contratado.id === value ? '' : contratado.id);
                      setOpen(false);
                      setInputValue('');
                    }}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                        value === contratado.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-transparent'
                      )}>
                        {value === contratado.id ? <Check className="h-4 w-4" /> : <User className="h-4 w-4 opacity-50" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{contratado.nome}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {[contratado.contato, contratado.especialidade].filter(Boolean).join(' • ') || 'Sem detalhes'}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
