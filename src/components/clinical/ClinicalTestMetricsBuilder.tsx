import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface MetricField {
    id: string;
    label: string;
    type: 'number' | 'select' | 'text' | 'range';
    unit?: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    step?: string;
    description?: string;
}

interface ClinicalTestMetricsBuilderProps {
    fields: MetricField[];
    onChange: (fields: MetricField[]) => void;
}

const FIELD_TYPES = [
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Seleção' },
    { value: 'text', label: 'Texto' },
    { value: 'range', label: 'Faixa' },
];

const COMMON_UNITS = ['cm', 'mm', 's', 'kg', 'graus', '%', 'rep'];

export function ClinicalTestMetricsBuilder({
    fields,
    onChange,
}: ClinicalTestMetricsBuilderProps) {
    const addField = () => {
        const newField: MetricField = {
            id: `field_${Date.now()}`,
            label: '',
            type: 'number',
            required: true,
        };
        onChange([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<MetricField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const addOption = (index: number) => {
        const field = fields[index];
        const options = field.options || [];
        updateField(index, { options: [...options, ''] });
    };

    const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
        const field = fields[fieldIndex];
        const options = [...(field.options || [])];
        options[optionIndex] = value;
        updateField(fieldIndex, { options });
    };

    const removeOption = (fieldIndex: number, optionIndex: number) => {
        const field = fields[fieldIndex];
        const options = (field.options || []).filter((_, i) => i !== optionIndex);
        updateField(fieldIndex, { options });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">
                    Métricas de Medição
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addField}
                    className="gap-1.5 text-xs"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Métrica
                </Button>
            </div>

            {fields.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-slate-500">
                        Nenhuma métrica definida. Adicione campos para coletar dados durante a execução do teste.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3"
                    >
                        <div className="flex items-start gap-2">
                            <GripVertical className="h-5 w-5 text-slate-300 mt-2 cursor-grab" />

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Label */}
                                <div className="col-span-2">
                                    <Label className="text-xs text-slate-500">Nome da Métrica</Label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => updateField(index, { label: e.target.value })}
                                        placeholder="Ex: Distância, Tempo..."
                                        className="h-9 text-sm"
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <Label className="text-xs text-slate-500">Tipo</Label>
                                    <Select
                                        value={field.type}
                                        onValueChange={(value: MetricField['type']) => updateField(index, { type: value })}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FIELD_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Unit (for number type) */}
                                {field.type === 'number' && (
                                    <div>
                                        <Label className="text-xs text-slate-500">Unidade</Label>
                                        <Select
                                            value={field.unit || ''}
                                            onValueChange={(value) => updateField(index, { unit: value })}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Unidade" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMMON_UNITS.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>
                                                        {unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Options for select type */}
                        {field.type === 'select' && (
                            <div className="ml-7 space-y-2">
                                <Label className="text-xs text-slate-500">Opções</Label>
                                <div className="space-y-1.5">
                                    {(field.options || []).map((option, optIndex) => (
                                        <div key={optIndex} className="flex gap-2">
                                            <Input
                                                value={option}
                                                onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                                placeholder={`Opção ${optIndex + 1}`}
                                                className="h-8 text-sm"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeOption(index, optIndex)}
                                                className="text-slate-400 hover:text-red-500 p-1"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addOption(index)}
                                        className="text-xs text-teal-600 hover:text-teal-700"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Adicionar Opção
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Range fields */}
                        {field.type === 'range' && (
                            <div className="ml-7 grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs text-slate-500">Mínimo</Label>
                                    <Input
                                        type="number"
                                        value={field.min || ''}
                                        onChange={(e) => updateField(index, { min: Number(e.target.value) })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Máximo</Label>
                                    <Input
                                        type="number"
                                        value={field.max || ''}
                                        onChange={(e) => updateField(index, { max: Number(e.target.value) })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Unidade</Label>
                                    <Input
                                        value={field.unit || ''}
                                        onChange={(e) => updateField(index, { unit: e.target.value })}
                                        className="h-8 text-sm"
                                        placeholder="Ex: cm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Required toggle */}
                        <div className="ml-7 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={`required-${field.id}`}
                                checked={field.required ?? true}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                className="rounded border-slate-300"
                            />
                            <Label htmlFor={`required-${field.id}`} className="text-xs text-slate-500 cursor-pointer">
                                Campo obrigatório
                            </Label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
