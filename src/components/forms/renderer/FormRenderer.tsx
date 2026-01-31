import React, { useState } from 'react';
import { EvaluationForm, EvaluationFormField } from '@/types/clinical-forms';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateFormSuggestions } from '@/services/ai/clinicalAnalysisService';

interface FormRendererProps {
    form: EvaluationForm;
    fields: EvaluationFormField[];
    initialData?: Record<string, unknown>;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    isSubmitting?: boolean;
    readOnly?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
    form,
    fields,
    initialData = {},
    onSubmit,
    isSubmitting = false,
    readOnly = false
}) => {
    const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { toast } = useToast();

    const handleInputChange = (fieldId: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
        // Clear error if exists
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        fields.forEach(field => {
            if (field.obrigatorio && field.tipo_campo !== 'info') {
                const value = formData[field.id];
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                    newErrors[field.id] = 'Este campo é obrigatório';
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            toast({
                title: "Erro de validação",
                description: "Por favor, preencha todos os campos obrigatórios.",
                variant: "destructive"
            });
            return;
        }

        try {
            await onSubmit(formData);
        } catch (error) {
            logger.error('Erro ao submeter formulário', error, 'FormRenderer');
            toast({
                title: "Erro ao salvar",
                description: "Ocorreu um erro ao salvar a avaliação. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const handleGenerateSuggestions = async (fieldId: string) => {
        setIsGeneratingAI(true);
        try {
            const suggestion = await generateFormSuggestions(formData, fields);
            handleInputChange(fieldId, suggestion);
            toast({
                title: "Sugestões Geradas",
                description: "O campo foi preenchido com sugestões baseadas na avaliação.",
            });
        } catch {
            toast({
                title: "Erro na IA",
                description: "Não foi possível gerar sugestões agora.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const renderField = (field: EvaluationFormField) => {
        const value = formData[field.id];
        const error = errors[field.id];

        // Check if this field is eligible for AI suggestions
        const isAISuggestionField = field.label.includes("Sugestões de Conduta") || field.label.includes("IA/Protocolos");

        switch (field.tipo_campo) {
            case 'texto_curto':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        disabled={readOnly}
                        className={error ? 'border-destructive' : ''}
                    />
                );

            case 'texto_longo':
                return (
                    <div className="space-y-2">
                        {isAISuggestionField && !readOnly && (
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateSuggestions(field.id)}
                                    disabled={isGeneratingAI}
                                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                >
                                    {isGeneratingAI ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                                    Gerar Sugestões com IA
                                </Button>
                            </div>
                        )}
                        <Textarea
                            value={value || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || ''}
                            disabled={readOnly}
                            className={`min-h-[100px] ${error ? 'border-destructive' : ''}`}
                        />
                    </div>
                );

            case 'opcao_unica': // Radio
                return (
                    <RadioGroup
                        value={value || ''}
                        onValueChange={(val) => !readOnly && handleInputChange(field.id, val)}
                        disabled={readOnly}
                    >
                        <div className="flex flex-col gap-2">
                            {field.opcoes?.map((opt, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt} id={`${field.id}-${idx}`} />
                                    <Label htmlFor={`${field.id}-${idx}`} className="font-normal">{opt}</Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                );

            case 'selecao': { // Checkboxes (Multi-select)
                const currentSelection = Array.isArray(value) ? value : [];
                return (
                    <div className="flex flex-col gap-2">
                        {field.opcoes?.map((opt, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${field.id}-${idx}`}
                                    checked={currentSelection.includes(opt)}
                                    disabled={readOnly}
                                    onCheckedChange={(checked) => {
                                        if (readOnly) return;
                                        if (checked) {
                                            handleInputChange(field.id, [...currentSelection, opt]);
                                        } else {
                                            handleInputChange(field.id, currentSelection.filter((v: string) => v !== opt));
                                        }
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'lista': // Select dropdown
                // Using native select for simplicity or could use Select component
                // Let's use standard select for now to avoid complexity with Select Portal in modals if needed, 
                // but shadcn Select is better UI. Let's try native first for robustness.
                return (
                    <select
                        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive' : ''}`}
                        value={value || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        disabled={readOnly}
                    >
                        <option value="">Selecione...</option>
                        {field.opcoes?.map((opt, idx) => (
                            <option key={idx} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'escala':
                return (
                    <RadioGroup
                        value={value?.toString() || ''}
                        onValueChange={(val) => !readOnly && handleInputChange(field.id, parseInt(val))}
                        disabled={readOnly}
                        className="flex gap-4"
                    >
                        {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="flex flex-col items-center gap-1">
                                <RadioGroupItem value={num.toString()} id={`${field.id}-${num}`} className="h-6 w-6" />
                                <Label htmlFor={`${field.id}-${num}`} className="text-xs">{num}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case 'data':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !value && "text-muted-foreground",
                                    error && "border-destructive"
                                )}
                                disabled={readOnly}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value ? format(new Date(value), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                        </PopoverTrigger>
                        {!readOnly && (
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={value ? new Date(value) : undefined}
                                    onSelect={(date) => handleInputChange(field.id, date?.toISOString())}
                                    initialFocus
                                />
                            </PopoverContent>
                        )}
                    </Popover>
                );

            case 'info':
                return null; // Information only, no input

            default:
                return <p className="text-sm text-muted-foreground">Tipo de campo não suportado: {field.tipo_campo}</p>;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>{form.nome}</CardTitle>
                    {form.descricao && <CardDescription>{form.descricao}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                            {field.tipo_campo !== 'info' ? (
                                <>
                                    <Label className="text-base">
                                        {field.label} {field.obrigatorio && <span className="text-destructive">*</span>}
                                    </Label>
                                    {field.placeholder && <p className="text-sm text-muted-foreground mb-2">{field.placeholder}</p>}
                                    {renderField(field)}
                                    {errors[field.id] && (
                                        <p className="text-sm font-medium text-destructive">{errors[field.id]}</p>
                                    )}
                                </>
                            ) : (
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <h4 className="font-semibold text-primary mb-1">{field.label}</h4>
                                    {field.placeholder && <p className="text-sm text-muted-foreground">{field.placeholder}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {!readOnly && (
                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Avaliação
                    </Button>
                </div>
            )}
        </form>
    );
};
