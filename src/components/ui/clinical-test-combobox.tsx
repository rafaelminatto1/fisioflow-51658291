import * as React from "react";
import { Check, ChevronsUpDown, Search, Plus, Info } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { getFirebaseDb } from "@/integrations/firebase/app";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ClinicalTest {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose?: string;
    tags?: string[];
    type?: string;
    fields_definition?: Array<{
        id: string;
        label: string;
        unit?: string;
        type: string;
        required?: boolean;
        description?: string;
    }>;
}

interface ClinicalTestComboboxProps {
    value?: string;
    onValueChange: (value: string, test?: ClinicalTest) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function ClinicalTestCombobox({
    value,
    onValueChange,
    disabled = false,
    className,
    placeholder = "Buscar teste clínico...",
}: ClinicalTestComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    const { data: tests = [], isLoading } = useQuery({
        queryKey: ['clinical-tests-combobox'],
        queryFn: async () => {
            const q = query(
                collection(db, 'clinical_test_templates'),
                orderBy('name')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ClinicalTest));
        }
    });

    const selectedTest = tests.find((test) => test.id === value);

    const filteredTests = React.useMemo(() => {
        if (!searchTerm) return tests;

        const query = searchTerm.toLowerCase();
        return tests.filter((test) =>
            test.name.toLowerCase().includes(query) ||
            (test.name_en && test.name_en.toLowerCase().includes(query)) ||
            (test.category && test.category.toLowerCase().includes(query)) ||
            (test.target_joint && test.target_joint.toLowerCase().includes(query)) ||
            (test.tags && test.tags.some((t) => t.toLowerCase().includes(query)))
        );
    }, [tests, searchTerm]);

    // Group tests by category
    const groupedTests = React.useMemo(() => {
        const groups: Record<string, ClinicalTest[]> = {};
        filteredTests.forEach((test) => {
            const category = test.category || 'Outros';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(test);
        });
        return groups;
    }, [filteredTests]);

    const handleSelect = (testId: string) => {
        const test = tests.find((t) => t.id === testId);
        onValueChange(testId === value ? "" : testId, test);
        setOpen(false);
        setSearchTerm("");
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Esportiva': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Pós-Operatório': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Ortopedia': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-background h-11 border-teal-100 hover:border-teal-300 hover:bg-teal-50/30 transition-all", className)}
                    disabled={disabled}
                >
                    {selectedTest ? (
                        <div className="flex items-center gap-2 truncate">
                            <Search className="h-4 w-4 text-teal-500 shrink-0" />
                            <span className="font-medium truncate text-slate-700">{selectedTest.name}</span>
                            {selectedTest.category && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 shrink-0 font-bold uppercase tracking-wider border", getCategoryColor(selectedTest.category))}>
                                    {selectedTest.category}
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 flex items-center gap-2 font-medium">
                            <Search className="h-4 w-4 text-slate-300" />
                            {placeholder}
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 shadow-2xl border-teal-100 rounded-xl overflow-hidden" align="start">
                <Command shouldFilter={false} className="rounded-none">
                    <div className="flex items-center border-b px-3 bg-slate-50/50" cmdk-input-wrapper="">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-teal-600 opacity-70" />
                        <CommandInput
                            placeholder="Buscar por nome, categoria ou articulação..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            className="h-12 border-0 bg-transparent focus:ring-0"
                        />
                    </div>
                    <CommandList className="max-h-[350px]">
                        {isLoading ? (
                            <div className="py-12 text-center animate-pulse">
                                <div className="flex justify-center mb-3">
                                    <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5"></div>
                                    <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5 delay-150"></div>
                                    <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5 delay-300"></div>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">Carregando testes...</p>
                            </div>
                        ) : filteredTests.length === 0 ? (
                            <CommandEmpty>
                                <div className="py-12 text-center px-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <Search className="h-5 w-5 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-600 font-bold mb-1">
                                        Nenhum teste encontrado para "{searchTerm}"
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Tente termos mais genéricos ou verifique a ortografia.
                                    </p>
                                </div>
                            </CommandEmpty>
                        ) : (
                            <TooltipProvider delayDuration={300}>
                                {Object.entries(groupedTests).map(([category, categoryTests]) => (
                                    <CommandGroup key={category} heading={category} className="px-2">
                                        {categoryTests.map((test) => (
                                            <Tooltip key={test.id}>
                                                <TooltipTrigger asChild>
                                                    <CommandItem
                                                        value={test.id}
                                                        onSelect={() => handleSelect(test.id)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-teal-50 transition-colors group mb-1 border border-transparent aria-selected:border-teal-100"
                                                    >
                                                        <div className={cn(
                                                            "flex h-8 w-8 items-center justify-center rounded-lg border transition-all shrink-0",
                                                            value === test.id
                                                                ? "bg-teal-600 border-teal-600 text-white"
                                                                : "bg-white border-slate-100 text-slate-400 group-hover:border-teal-200 group-hover:text-teal-600"
                                                        )}>
                                                            {value === test.id ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                                                        </div>

                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "font-bold truncate text-sm transition-colors",
                                                                    value === test.id ? "text-teal-900" : "text-slate-700 group-hover:text-teal-800"
                                                                )}>
                                                                    {test.name}
                                                                </span>
                                                                {test.target_joint && (
                                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 opacity-80 shrink-0 font-bold">
                                                                        {test.target_joint}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {test.name_en && (
                                                                <span className="text-[10px] text-slate-400 italic truncate font-medium">
                                                                    {test.name_en}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                </TooltipTrigger>
                                                {test.purpose && (
                                                    <TooltipContent side="right" className="max-w-xs p-3 shadow-xl border-slate-100 bg-white/95 backdrop-blur-sm" sideOffset={10}>
                                                        <div className="space-y-1.5">
                                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{test.name}</p>
                                                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                                                <span className="text-teal-600 font-bold mr-1">Propósito:</span>
                                                                {test.purpose}
                                                            </p>
                                                            {test.tags && test.tags.length > 0 && (
                                                                <div className="flex gap-1 pt-1">
                                                                    {test.tags.slice(0, 3).map(tag => (
                                                                        <span key={tag} className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">#{tag}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        ))}
                                    </CommandGroup>
                                ))}
                            </TooltipProvider>
                        )}
                        <CommandSeparator className="my-1" />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-2 h-9 font-bold text-xs"
                                onClick={() => {
                                    setOpen(false);
                                    // Podéria emitir um evento para "Novo Teste"
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Deseja criar um teste personalizado?
                            </Button>
                        </div>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
