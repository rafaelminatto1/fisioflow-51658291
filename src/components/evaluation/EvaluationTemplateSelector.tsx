import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, collection, getDocs, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { Check, ChevronsUpDown, FileText, Search, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {

    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface EvaluationTemplate {
    id: string;
    nome: string;
    descricao?: string | null;
    tipo: string;
    referencias?: string | null;
    category?: string;
    fields?: TemplateField[];
}

export interface TemplateField {
    id: string;
    label: string;
    tipo_campo: string;
    placeholder?: string | null;
    opcoes?: string[] | null;
    ordem: number;
    obrigatorio: boolean;
    section?: string;
    defaultValue?: string | number | boolean;
    min?: number;
    max?: number;
    unit?: string;
    description?: string | null;
}

interface EvaluationTemplateSelectorProps {
    selectedTemplateId?: string;
    onTemplateSelect: (template: EvaluationTemplate | null) => void;
    category?: string;
    autoLoadDefault?: boolean;
    initialTemplateId?: string; // Template ID from URL to auto-select
}

const CATEGORY_LABELS: Record<string, string> = {
    'esportiva': 'Fisioterapia Esportiva',
    'ortopedica': 'Fisioterapia Ortopédica',
    'neurologica': 'Fisioterapia Neurológica',
    'respiratoria': 'Fisioterapia Respiratória',
    'padrao': 'Avaliação Padrão',
    'geral': 'Avaliação Geral',
};

const CATEGORY_COLORS: Record<string, string> = {
    'esportiva': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'ortopedica': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'neurologica': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'respiratoria': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'padrao': 'bg-primary/10 text-primary',
    'geral': 'bg-muted text-muted-foreground',
};

export function EvaluationTemplateSelector({
    selectedTemplateId,
    onTemplateSelect,
    category,
    autoLoadDefault = true,
    initialTemplateId,
}: EvaluationTemplateSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch all active templates with their fields
    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['evaluation-templates-with-fields', category],
        queryFn: async () => {
            const q = firestoreQuery(
                collection(db, 'evaluation_forms'),
                where('ativo', '==', true),
                orderBy('nome')
            );

            // Note: Firebase doesn't support multiple where clauses with different fields in a single query
            // If category filtering is needed, we'll need to filter client-side or use a different approach
            const snapshot = await getDocs(q);

            const templatesWithFields = await Promise.all(
                snapshot.docs.map(async (formDoc) => {
                    const form = { id: formDoc.id, ...formDoc.data() } as { id: string; nome: string; descricao?: string; tipo: string; referencias?: string[] };

                    // Skip if category is specified and doesn't match
                    if (category && form.tipo !== category) {
                        return null;
                    }

                    // Fetch fields for this form
                    const fieldsQuery = firestoreQuery(
                        collection(db, 'evaluation_form_fields'),
                        where('form_id', '==', form.id),
                        orderBy('ordem')
                    );
                    const fieldsSnapshot = await getDocs(fieldsQuery);

                    const fields = fieldsSnapshot.docs.map(fieldDoc => {
                        const field = fieldDoc.data();
                        return {
                            ...field,
                            section: field.grupo,
                            min: field.minimo,
                            max: field.maximo,
                            description: field.descricao,
                            opcoes: typeof field.opcoes === 'string' ? JSON.parse(field.opcoes) : field.opcoes,
                        } as TemplateField;
                    });

                    return {
                        id: form.id,
                        nome: form.nome,
                        descricao: form.descricao,
                        tipo: form.tipo,
                        referencias: form.referencias,
                        category: form.tipo,
                        fields: fields.sort((a, b) => a.ordem - b.ordem),
                    } as EvaluationTemplate;
                })
            );

            return templatesWithFields.filter((t): t is EvaluationTemplate => t !== null);
        },
    });

    // Auto-load default template on first render
    React.useEffect(() => {
        if (templates.length > 0 && !selectedTemplateId) {
            // If initialTemplateId is provided, find and select it
            if (initialTemplateId) {
                const template = templates.find(t => t.id === initialTemplateId);
                if (template) {
                    onTemplateSelect(template);
                    return;
                }
            }

            // Otherwise use autoLoadDefault behavior
            if (autoLoadDefault) {
                // Find "Avaliação Padrão" or the first template
                const defaultTemplate = templates.find(t =>
                    t.nome.toLowerCase().includes('padrão') ||
                    t.tipo === 'padrao'
                ) || templates[0];

                if (defaultTemplate) {
                    onTemplateSelect(defaultTemplate);
                }
            }
        }
    }, [templates, autoLoadDefault, selectedTemplateId, initialTemplateId, onTemplateSelect]);

    // Filter templates based on search
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return templates;

        const searchLower = searchQuery.toLowerCase();
        return templates.filter(t =>
            t.nome.toLowerCase().includes(searchLower) ||
            t.descricao?.toLowerCase().includes(searchLower) ||
            t.tipo?.toLowerCase().includes(searchLower)
        );
    }, [templates, searchQuery]);

    // Group templates by category
    const groupedTemplates = useMemo(() => {
        const groups: Record<string, EvaluationTemplate[]> = {};

        filteredTemplates.forEach(t => {
            const cat = t.tipo || 'geral';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(t);
        });

        return groups;
    }, [filteredTemplates]);

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    const handleSelect = useCallback((templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        onTemplateSelect(template || null);
        setOpen(false);
    }, [templates, onTemplateSelect]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-[42px] py-2"
                >
                    <div className="flex items-center gap-2 text-left">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {selectedTemplate ? (
                            <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{selectedTemplate.nome}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                    {selectedTemplate.descricao}
                                </span>

                                {selectedTemplate.referencias && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-sm w-fit" title={selectedTemplate.referencias}>
                                        <BookOpen className="h-3 w-3" />
                                        <span className="font-medium">Referência Científica</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">
                                Selecione um template de avaliação...
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedTemplate && (
                            <Badge
                                variant="secondary"
                                className={cn("text-xs", CATEGORY_COLORS[selectedTemplate.tipo] || '')}
                            >
                                {CATEGORY_LABELS[selectedTemplate.tipo] || selectedTemplate.tipo}
                            </Badge>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            placeholder="Buscar template..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <CommandEmpty>Nenhum template encontrado.</CommandEmpty>
                        ) : (
                            <ScrollArea className="max-h-[300px]">
                                {Object.entries(groupedTemplates).map(([cat, catTemplates]) => (
                                    <CommandGroup key={cat} heading={CATEGORY_LABELS[cat] || cat}>
                                        {catTemplates.map((template) => (
                                            <CommandItem
                                                key={template.id}
                                                value={template.id}
                                                onSelect={() => handleSelect(template.id)}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4",
                                                        selectedTemplateId === template.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-medium truncate">{template.nome}</span>
                                                    {template.descricao && (
                                                        <span className="text-xs text-muted-foreground truncate">
                                                            {template.descricao}
                                                        </span>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                    {template.fields?.length || 0} campos
                                                </Badge>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ))}
                            </ScrollArea>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default EvaluationTemplateSelector;
