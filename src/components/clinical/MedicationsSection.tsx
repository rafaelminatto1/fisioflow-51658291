import React, { useState } from "react";
import { Pill, Search, Plus, Trash2 } from "lucide-react";
import { useDictionary, DictionaryTerm } from "@/hooks/useDictionary";
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
import { Input } from "@/components/ui/input";

export interface MedicationEntry {
  id: string; // unique local ID or dictionary ID
  name: string;
  dosage?: string;
  frequency?: string;
  dictionaryTermId?: string;
}

export function MedicationsSection({
  medications = [],
  onChange,
}: {
  medications?: MedicationEntry[];
  onChange?: (meds: MedicationEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<DictionaryTerm | null>(null);

  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");

  const { terms, createTerm, isCreating } = useDictionary(search, "medicament");

  const handleAdd = () => {
    if (!search.trim()) return;

    if (selectedTerm && selectedTerm.pt === search) {
      // Use selected term
      const newMed: MedicationEntry = {
        id: crypto.randomUUID(),
        name: selectedTerm.pt,
        dictionaryTermId: selectedTerm.id,
        dosage,
        frequency,
      };
      onChange?.([...medications, newMed]);
      resetForm();
    } else {
      // Create new term on the fly
      createTerm(
        {
          pt: search.trim(),
          en: search.trim(),
          category: "medicament",
          isGlobal: true,
        },
        {
          onSuccess: (data: any) => {
            const newMed: MedicationEntry = {
              id: crypto.randomUUID(),
              name: search.trim(),
              dictionaryTermId: data?.id,
              dosage,
              frequency,
            };
            onChange?.([...medications, newMed]);
            resetForm();
          },
        }
      );
    }
  };

  const resetForm = () => {
    setOpen(false);
    setSearch("");
    setSelectedTerm(null);
    setDosage("");
    setFrequency("");
  };

  const handleRemove = (id: string) => {
    onChange?.(medications.filter((m) => m.id !== id));
  };

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          Medicamentos em uso
        </h3>
      </div>

      {medications.length > 0 && (
        <div className="mb-4 space-y-2">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">{med.name}</span>
                {(med.dosage || med.frequency) && (
                  <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                    {med.dosage && <span>Dosagem: {med.dosage}</span>}
                    {med.dosage && med.frequency && <span> • </span>}
                    {med.frequency && <span>Freq: {med.frequency}</span>}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(med.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 p-3 bg-muted/10 rounded-xl border border-border/50">
        <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="justify-between text-xs h-9 bg-card font-normal text-muted-foreground px-3 truncate"
              >
                <span className="truncate">{search || "Nome do medicamento..."}</span>
                <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Procurar no dicionário..."
                  value={search}
                  onValueChange={(val) => {
                    setSearch(val);
                    if (selectedTerm && selectedTerm.pt !== val) {
                      setSelectedTerm(null);
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty className="py-3 px-2 flex flex-col items-start gap-1">
                    <span className="text-xs text-muted-foreground">Não encontrado.</span>
                    <span className="text-[10px] font-medium text-foreground/80">
                      Será salvo automaticamente no dicionário ao adicionar.
                    </span>
                  </CommandEmpty>
                  {terms.length > 0 && (
                    <CommandGroup heading="Dicionário Clínico">
                      {terms.map((term) => (
                        <CommandItem
                          key={term.id}
                          onSelect={() => {
                            setSearch(term.pt);
                            setSelectedTerm(term);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Pill className="mr-2 h-3.5 w-3.5 opacity-50" />
                          <span className="text-xs font-semibold">{term.pt}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Input
            placeholder="Dosagem"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="h-9 text-xs bg-card"
          />
          <Input
            placeholder="Frequência"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="h-9 text-xs bg-card"
          />
          <Button
            size="icon"
            onClick={handleAdd}
            disabled={!search.trim() || isCreating}
            className="h-9 w-9 bg-primary text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
