import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Label } from '@/components/shared/ui/label';
import { Input } from '@/components/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
    Settings2,
    GripVertical,
    Type,
    Hash,
    AlignLeft,
    Layers,
    ToggleLeft,
    Thermometer,
    RotateCcw,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    unit?: string;
    required: boolean;
    enabled: boolean;
    options?: string[]; // For select type
    description?: string;
    category?: 'basic' | 'advanced';
}

export const DEFAULT_MEASUREMENT_FIELDS: CustomField[] = [
    {
        id: 'measurement_name',
        label: 'Nome da Medição',
        type: 'text',
        required: true,
        enabled: true,
        description: 'Ex: Flexão do joelho direito',
        category: 'basic'
    },
    {
        id: 'value',
        label: 'Valor',
        type: 'number',
        required: true,
        enabled: true,
        description: 'Valor numérico da medição',
        category: 'basic'
    },
    {
        id: 'unit',
        label: 'Unidade',
        type: 'text',
        required: false,
        enabled: true,
        description: 'Ex: graus, cm, kg',
        category: 'basic'
    },
    {
        id: 'side',
        label: 'Lado',
        type: 'select',
        required: false,
        enabled: false,
        options: ['Esquerdo', 'Direito', 'Bilateral'],
        description: 'Lado do corpo avaliado',
        category: 'basic'
    },
    {
        id: 'comparison_value',
        label: 'Valor de Comparação',
        type: 'number',
        required: false,
        enabled: false,
        description: 'Para comparar com outro lado',
        category: 'advanced'
    },
    {
        id: 'notes',
        label: 'Observações',
        type: 'textarea',
        required: false,
        enabled: true,
        description: 'Anotações adicionais',
        category: 'basic'
    },
    {
        id: 'pain_level',
        label: 'Nível de Dor (EVA)',
        type: 'number',
        required: false,
        enabled: false,
        unit: '0-10',
        description: 'Escala Visual Analógica',
        category: 'advanced'
    },
    {
        id: 'repetitions',
        label: 'Repetições',
        type: 'number',
        required: false,
        enabled: false,
        description: 'Número de repetições realizadas',
        category: 'advanced'
    },
];

const getFieldIcon = (id: string) => {
    switch (id) {
        case 'measurement_name': return <Type className="h-4 w-4" />;
        case 'value': return <Hash className="h-4 w-4" />;
        case 'unit': return <Layers className="h-4 w-4" />;
        case 'side': return <ToggleLeft className="h-4 w-4" />;
        case 'notes': return <AlignLeft className="h-4 w-4" />;
        case 'pain_level': return <Thermometer className="h-4 w-4" />;
        case 'repetitions': return <RotateCcw className="h-4 w-4" />;
        default: return <Settings2 className="h-4 w-4" />;
    }
};

interface CustomFieldsConfigProps {
    fields: CustomField[];
    onChange: (fields: CustomField[]) => void;
    compact?: boolean;
}

export const CustomFieldsConfig: React.FC<CustomFieldsConfigProps> = ({
    fields,
    onChange,
    compact = false,
}) => {
    const handleToggleField = (fieldId: string) => {
        const updated = fields.map((f) =>
            f.id === fieldId ? { ...f, enabled: !f.enabled } : f
        );
        onChange(updated);
    };

    const handleToggleRequired = (fieldId: string) => {
        const updated = fields.map((f) =>
            f.id === fieldId ? { ...f, required: !f.required } : f
        );
        onChange(updated);
    };

    const handleUpdateUnit = (fieldId: string, unit: string) => {
        const updated = fields.map((f) =>
            f.id === fieldId ? { ...f, unit } : f
        );
        onChange(updated);
    };

    const enabledCount = fields.filter((f) => f.enabled).length;

    const basicFields = fields.filter(f => f.category === 'basic');
    const advancedFields = fields.filter(f => f.category === 'advanced');

    if (compact) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
                        <Settings2 className="h-3.5 w-3.5 text-teal-600" />
                        <span>Estrutura do Formulário</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-teal-50 text-teal-700 border-teal-100 italic">
                        {enabledCount} campos ativos
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                    {fields.map((field) => (
                        <motion.button
                            key={field.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleField(field.id)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                field.enabled
                                    ? 'bg-teal-600 border-teal-600 text-white shadow-teal-100'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-teal-200 hover:bg-teal-50/50'
                            )}
                        >
                            <div className={cn("shrink-0", field.enabled ? "text-teal-100" : "text-slate-300")}>
                                {getFieldIcon(field.id)}
                            </div>
                            {field.label}
                            {field.required && field.enabled && (
                                <AlertCircle className="h-3 w-3 text-red-200" />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    const renderFieldRow = (field: CustomField) => (
        <motion.div
            layout
            key={field.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
                field.enabled
                    ? 'bg-white border-teal-100 shadow-md shadow-teal-900/5'
                    : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
            )}
        >
            <div className="cursor-grab p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-300">
                <GripVertical className="h-4 w-4" />
            </div>

            <div
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-all shrink-0",
                    field.enabled ? "bg-teal-50 border-teal-100 text-teal-600" : "bg-white border-slate-100"
                )}
            >
                {getFieldIcon(field.id)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Label
                        htmlFor={`field-${field.id}`}
                        className={cn(
                            "cursor-pointer text-sm font-bold transition-colors",
                            field.enabled ? 'text-slate-800' : 'text-slate-400'
                        )}
                    >
                        {field.label}
                    </Label>
                    <Checkbox
                        id={`field-${field.id}`}
                        checked={field.enabled}
                        onCheckedChange={() => handleToggleField(field.id)}
                        className="h-4 w-4 rounded-md border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                </div>
                {field.description && field.enabled && (
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {field.description}
                    </p>
                )}
            </div>

            <AnimatePresence>
                {field.enabled && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-4 border-l pl-4 border-slate-100"
                    >
                        {field.type === 'number' && (
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Unidade</Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: cm"
                                    value={field.unit || ''}
                                    onChange={(e) => handleUpdateUnit(field.id, e.target.value)}
                                    className="w-20 h-8 text-xs font-bold bg-slate-50 border-slate-100 focus:bg-white focus:border-teal-300 transition-all px-2"
                                />
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-1">
                            <Label
                                htmlFor={`required-${field.id}`}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-tight cursor-pointer"
                            >
                                Obrigatório
                            </Label>
                            <Checkbox
                                id={`required-${field.id}`}
                                checked={field.required}
                                onCheckedChange={() => handleToggleRequired(field.id)}
                                className="h-4 w-4 rounded-md border-slate-300 data-[state=checked]:bg-teal-600"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    return (
        <Card className="border-0 shadow-lg bg-slate-50/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-100/50">
            <CardHeader className="py-4 px-6 bg-white border-b border-slate-100">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-800 uppercase tracking-wider">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                            <Settings2 className="h-5 w-5" />
                        </div>
                        <span>Configurar Estrutura</span>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-0 h-6 px-3">
                        {enabledCount} campos selecionados
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="py-5 px-6">
                <div className="space-y-6">
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Campos Principais</h4>
                        <div className="space-y-2.5">
                            {basicFields.map(renderFieldRow)}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Campos Avançados</h4>
                        <div className="space-y-2.5">
                            {advancedFields.map(renderFieldRow)}
                        </div>
                    </section>
                </div>
            </CardContent>
        </Card>
    );
};

export default CustomFieldsConfig;
