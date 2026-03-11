import * as React from 'react';
import { Check, ChevronDown, X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxCount?: number;
  allowCustom?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecionar...',
  className,
  maxCount = 3,
  allowCustom = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const categories = Array.from(new Set(options.map(o => o.category).filter(Boolean))) as string[];

  const handleAddCustom = () => {
    if (!inputValue.trim()) return;
    if (!selected.includes(inputValue.trim())) {
      onChange([...selected, inputValue.trim()]);
    }
    setInputValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between min-h-[40px] h-auto px-3 py-2 text-left font-normal hover:bg-background border-input transition-all',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length > 0 ? (
              <>
                {selected.slice(0, maxCount).map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="rounded-md border-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium px-1.5 py-0 h-6 flex items-center gap-1"
                    >
                      {option?.label || value}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleValue(value);
                        }}
                      />
                    </Badge>
                  );
                })}
                {selected.length > maxCount && (
                  <Badge
                    variant="secondary"
                    className="rounded-md border-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium px-1.5 py-0 h-6"
                  >
                    +{selected.length - maxCount}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
             {selected.length > 0 && (
                <X 
                  className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer transition-colors" 
                  onClick={handleClear}
                />
             )}
             <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command className="w-full" shouldFilter={true}>
          <CommandInput 
            placeholder="Pesquisar ou digitar nova queixa..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto scrollbar-thin">
            <CommandEmpty>
              {allowCustom && inputValue.length > 0 ? (
                <div 
                  className="flex items-center gap-2 w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-md text-sm text-primary font-medium"
                  onClick={handleAddCustom}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar: "{inputValue}"
                </div>
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado.</p>
              )}
            </CommandEmpty>
            
            {categories.length > 0 ? (
              categories.map(category => (
                <CommandGroup key={category} heading={category}>
                  {options
                    .filter(opt => opt.category === category)
                    .map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => toggleValue(option.value)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                            selected.includes(option.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <Check className={cn('h-4 w-4')} />
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleValue(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all',
                        selected.includes(option.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className={cn('h-4 w-4')} />
                    </div>
                    <span className="flex-1">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Opção de adicionar customizado mesmo que existam outros resultados */}
            {allowCustom && inputValue.length > 0 && !options.some(o => o.label.toLowerCase() === inputValue.toLowerCase()) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleAddCustom} className="cursor-pointer text-primary font-medium">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar "{inputValue}"
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
