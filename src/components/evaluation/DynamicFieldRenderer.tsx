import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MagicTextarea } from '@/components/ai/MagicTextarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TemplateField } from './EvaluationTemplateSelector';

interface DynamicFieldRendererProps {
    fields: TemplateField[];
    values: Record<string, unknown>;
    onChange: (fieldId: string, value: unknown) => void;
    readOnly?: boolean;
}

// Group fields by section
function groupFieldsBySection(fields: TemplateField[]): Record<string, TemplateField[]> {
    const groups: Record<string, TemplateField[]> = {};

    fields.forEach(field => {
        const section = field.section || 'Informações Gerais';
        if (!groups[section]) groups[section] = [];
        groups[section].push(field);
    });

    return groups;
}

// Render individual field based on type
function renderField(
    field: TemplateField,
    value: unknown,
    onChange: (value: unknown) => void,
    readOnly: boolean
): React.ReactNode {
    const commonProps = {
        id: field.id,
        disabled: readOnly,
    };

    switch (field.tipo_campo) {
        case 'texto_curto':
        case 'text':
            return (
                <Input
                    {...commonProps}
                    type="text"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || ''}
                />
            );

        case 'texto_longo':
        case 'textarea':
            return (
                <MagicTextarea
                    id={field.id}
                    disabled={readOnly}
                    value={(value as string) || ''}
                    onValueChange={(val) => onChange(val)}
                    placeholder={field.placeholder || ''}
                    rows={4}
                    className="resize-none"
                />
            );

        case 'numero':
        case 'number':
            return (
                <div className="flex items-center gap-2">
                    <Input
                        {...commonProps}
                        type="number"
                        value={(value as number) ?? ''}
                        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder={field.placeholder || ''}
                        min={field.min}
                        max={field.max}
                        className="w-32"
                    />
                    {field.unit && (
                        <span className="text-sm text-muted-foreground">{field.unit}</span>
                    )}
                </div>
            );

        case 'escala':
        case 'scale': {
            const scaleValue = (value as number) ?? field.min ?? 0;
            const min = field.min ?? 0;
            const max = field.max ?? 10;
            return (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{min}</span>
                        <Badge variant="secondary" className="text-lg font-bold px-4 py-1">
                            {scaleValue}
                        </Badge>
                        <span className="text-muted-foreground">{max}</span>
                    </div>
                    <Slider
                        value={[scaleValue]}
                        onValueChange={([v]) => onChange(v)}
                        min={min}
                        max={max}
                        step={1}
                        disabled={readOnly}
                        className={cn(
                            scaleValue <= 3 && 'slider-green',
                            scaleValue > 3 && scaleValue <= 6 && 'slider-yellow',
                            scaleValue > 6 && 'slider-red'
                        )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sem dor</span>
                        <span>Dor moderada</span>
                        <span>Dor intensa</span>
                    </div>
                </div>
            );
        }

        case 'opcao_unica':
        case 'radio':
            return (
                <RadioGroup
                    value={(value as string) || ''}
                    onValueChange={onChange}
                    disabled={readOnly}
                    className="grid grid-cols-2 gap-2"
                >
                    {(field.opcoes || []).map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`${field.id}-${idx}`} />
                            <Label htmlFor={`${field.id}-${idx}`} className="text-sm font-normal cursor-pointer">
                                {option}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            );

        case 'selecao':
        case 'select':
            return (
                <Select
                    value={(value as string) || ''}
                    onValueChange={onChange}
                    disabled={readOnly}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Selecione...'} />
                    </SelectTrigger>
                    <SelectContent>
                        {(field.opcoes || []).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );

        case 'checkbox':
        case 'boolean':
            return (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        {...commonProps}
                        checked={(value as boolean) || false}
                        onCheckedChange={onChange}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                        {field.placeholder || 'Sim'}
                    </Label>
                </div>
            );

        case 'lista':
        case 'multiselect': {
            const selectedValues = (value as string[]) || [];
            return (
                <div className="grid grid-cols-2 gap-2">
                    {(field.opcoes || []).map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${field.id}-${idx}`}
                                checked={selectedValues.includes(option)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        onChange([...selectedValues, option]);
                                    } else {
                                        onChange(selectedValues.filter(v => v !== option));
                                    }
                                }}
                                disabled={readOnly}
                            />
                            <Label htmlFor={`${field.id}-${idx}`} className="text-sm font-normal cursor-pointer">
                                {option}
                            </Label>
                        </div>
                    ))}
                </div>
            );
        }

        case 'data':
        case 'date':
            return (
                <Input
                    {...commonProps}
                    type="date"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'hora':
        case 'time':
            return (
                <Input
                    {...commonProps}
                    type="time"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'info':
            return (
                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                    {field.placeholder || field.label}
                </div>
            );

        case 'goniometry':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Flexão</Label>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                value={(value as { flexion?: number })?.flexion ?? ''}
                                onChange={(e) => onChange({
                                    ...(value as object || {}),
                                    flexion: e.target.value ? parseFloat(e.target.value) : null
                                })}
                                disabled={readOnly}
                                className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">°</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Extensão</Label>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                value={(value as { extension?: number })?.extension ?? ''}
                                onChange={(e) => onChange({
                                    ...(value as object || {}),
                                    extension: e.target.value ? parseFloat(e.target.value) : null
                                })}
                                disabled={readOnly}
                                className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">°</span>
                        </div>
                    </div>
                </div>
            );

        case 'muscle_test':
            return (
                <Select
                    value={(value as string) || ''}
                    onValueChange={onChange}
                    disabled={readOnly}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o grau..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">0 - Ausência de contração</SelectItem>
                        <SelectItem value="1">1 - Contração palpável</SelectItem>
                        <SelectItem value="2">2 - Movimento sem gravidade</SelectItem>
                        <SelectItem value="3">3 - Movimento contra gravidade</SelectItem>
                        <SelectItem value="4">4 - Movimento c/ resistência parcial</SelectItem>
                        <SelectItem value="5">5 - Força normal</SelectItem>
                    </SelectContent>
                </Select>
            );

        default:
            return (
                <Input
                    {...commonProps}
                    type="text"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || ''}
                />
            );
    }
}

export function DynamicFieldRenderer({
    fields,
    values,
    onChange,
    readOnly = false,
}: DynamicFieldRendererProps) {
    const groupedFields = groupFieldsBySection(fields);

    if (fields.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum campo configurado para este template.
                    <br />
                    <span className="text-sm">Selecione um template ou adicione campos personalizados.</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedFields).map(([section, sectionFields]) => (
                <Card key={section}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{section}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sectionFields.map((field) => (
                            <div key={field.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={field.id} className="font-medium">
                                        {field.label}
                                    </Label>
                                    {field.obrigatorio && (
                                        <span className="text-xs text-destructive">*</span>
                                    )}
                                </div>
                                {field.description && (
                                    <p className="text-xs text-muted-foreground pb-1">{field.description}</p>
                                )}
                                {renderField(
                                    field,
                                    values[field.id],
                                    (value) => onChange(field.id, value),
                                    readOnly
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default DynamicFieldRenderer;
