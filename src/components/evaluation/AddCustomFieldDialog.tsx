import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Type, Hash, AlignLeft, List, ToggleLeft, Calendar, Clock, Ruler } from 'lucide-react';
import type { TemplateField } from './EvaluationTemplateSelector';

interface AddCustomFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddField: (field: Omit<TemplateField, 'id' | 'ordem'>) => void;
}

const FIELD_TYPES = [
    { value: 'texto_curto', label: 'Texto Curto', icon: Type, description: 'Uma linha de texto' },
    { value: 'texto_longo', label: 'Texto Longo', icon: AlignLeft, description: 'Múltiplas linhas' },
    { value: 'numero', label: 'Número', icon: Hash, description: 'Valor numérico' },
    { value: 'escala', label: 'Escala (0-10)', icon: Ruler, description: 'Escala visual de dor' },
    { value: 'opcao_unica', label: 'Opção Única', icon: ToggleLeft, description: 'Radio buttons' },
    { value: 'selecao', label: 'Seleção', icon: List, description: 'Dropdown de opções' },
    { value: 'lista', label: 'Múltipla Escolha', icon: List, description: 'Checkboxes' },
    { value: 'checkbox', label: 'Sim/Não', icon: ToggleLeft, description: 'Checkbox único' },
    { value: 'data', label: 'Data', icon: Calendar, description: 'Seletor de data' },
    { value: 'hora', label: 'Hora', icon: Clock, description: 'Seletor de horário' },
    { value: 'goniometry', label: 'Goniometria', icon: Ruler, description: 'Flexão/Extensão' },
    { value: 'muscle_test', label: 'Teste Muscular', icon: Ruler, description: 'Grau 0-5' },
];

const SECTIONS = [
    'Informações Gerais',
    'Queixa e Histórico',
    'Avaliação Funcional',
    'Exame Físico',
    'Testes Especiais',
    'Medidas e Escalas',
    'Plano de Tratamento',
    'Observações',
];

export function AddCustomFieldDialog({
    open,
    onOpenChange,
    onAddField,
}: AddCustomFieldDialogProps) {
    const [formData, setFormData] = useState({
        label: '',
        tipo_campo: 'texto_curto',
        placeholder: '',
        section: 'Informações Gerais',
        obrigatorio: false,
        opcoes: '',
        min: 0,
        max: 10,
        unit: '',
    });

    const needsOptions = ['opcao_unica', 'selecao', 'lista'].includes(formData.tipo_campo);
    const needsMinMax = ['escala', 'numero'].includes(formData.tipo_campo);
    const needsUnit = formData.tipo_campo === 'numero';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const field: Omit<TemplateField, 'id' | 'ordem'> = {
            label: formData.label,
            tipo_campo: formData.tipo_campo,
            placeholder: formData.placeholder || null,
            section: formData.section,
            obrigatorio: formData.obrigatorio,
            opcoes: needsOptions
                ? formData.opcoes.split('\n').map(o => o.trim()).filter(Boolean)
                : null,
            min: needsMinMax ? formData.min : undefined,
            max: needsMinMax ? formData.max : undefined,
            unit: needsUnit ? formData.unit : undefined,
        };

        onAddField(field);

        // Reset form
        setFormData({
            label: '',
            tipo_campo: 'texto_curto',
            placeholder: '',
            section: 'Informações Gerais',
            obrigatorio: false,
            opcoes: '',
            min: 0,
            max: 10,
            unit: '',
        });
        onOpenChange(false);
    };

    const selectedType = FIELD_TYPES.find(t => t.value === formData.tipo_campo);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Adicionar Campo Personalizado
                    </DialogTitle>
                    <DialogDescription>
                        Adicione um novo campo à avaliação atual.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="label">Nome do Campo *</Label>
                        <Input
                            id="label"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="Ex: Amplitude de Movimento"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Campo</Label>
                            <Select
                                value={formData.tipo_campo}
                                onValueChange={(v) => setFormData({ ...formData, tipo_campo: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="h-4 w-4" />
                                                <span>{type.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedType && (
                                <p className="text-xs text-muted-foreground">{selectedType.description}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Seção</Label>
                            <Select
                                value={formData.section}
                                onValueChange={(v) => setFormData({ ...formData, section: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SECTIONS.map((section) => (
                                        <SelectItem key={section} value={section}>
                                            {section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="placeholder">Placeholder / Dica</Label>
                        <Input
                            id="placeholder"
                            value={formData.placeholder}
                            onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                            placeholder="Texto de ajuda para o campo"
                        />
                    </div>

                    {needsOptions && (
                        <div className="space-y-2">
                            <Label htmlFor="opcoes">Opções (uma por linha) *</Label>
                            <Textarea
                                id="opcoes"
                                value={formData.opcoes}
                                onChange={(e) => setFormData({ ...formData, opcoes: e.target.value })}
                                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                rows={4}
                                required
                            />
                        </div>
                    )}

                    {needsMinMax && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="min">Valor Mínimo</Label>
                                <Input
                                    id="min"
                                    type="number"
                                    value={formData.min}
                                    onChange={(e) => setFormData({ ...formData, min: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max">Valor Máximo</Label>
                                <Input
                                    id="max"
                                    type="number"
                                    value={formData.max}
                                    onChange={(e) => setFormData({ ...formData, max: parseInt(e.target.value) || 10 })}
                                />
                            </div>
                        </div>
                    )}

                    {needsUnit && (
                        <div className="space-y-2">
                            <Label htmlFor="unit">Unidade de Medida</Label>
                            <Input
                                id="unit"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="Ex: cm, kg, graus"
                            />
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="obrigatorio"
                            checked={formData.obrigatorio}
                            onCheckedChange={(c) => setFormData({ ...formData, obrigatorio: !!c })}
                        />
                        <Label htmlFor="obrigatorio" className="text-sm font-normal cursor-pointer">
                            Campo obrigatório
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!formData.label}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Campo
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default AddCustomFieldDialog;
