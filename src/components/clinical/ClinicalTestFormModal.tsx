import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import {
    Dialog,
    DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, BookOpen, Settings, BarChart3 } from 'lucide-react';
import { ClinicalTestMetricsBuilder, MetricField } from './ClinicalTestMetricsBuilder';
import { logger } from '@/lib/errors/logger';

interface ClinicalTest {
    id?: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose: string;
    execution: string;
    positive_sign?: string;
    reference?: string;
    sensitivity_specificity?: string;
    tags?: string[];
    type?: string;
    fields_definition?: MetricField[];
    regularity_sessions?: number | null;
    organization_id?: string;
}

interface ClinicalTestFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    test?: ClinicalTest | null;
    mode: 'create' | 'edit';
}

const CATEGORIES = ['Ortopedia', 'Esportiva', 'Pós-Operatório', 'Neurológico', 'Respiratório'];
const TARGET_JOINTS = ['Ombro', 'Joelho', 'Quadril', 'Tornozelo', 'Coluna', 'Cervical', 'Punho', 'Cotovelo'];
const TEST_TYPES = [
    { value: 'special_test', label: 'Teste Especial' },
    { value: 'functional_test', label: 'Teste Funcional' },
];

export function ClinicalTestFormModal({
    open,
    onOpenChange,
    test,
    mode,
}: ClinicalTestFormModalProps) {
    const { user, organizationId } = useAuth();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<ClinicalTest>({
        name: '',
        name_en: '',
        category: '',
        target_joint: '',
        purpose: '',
        execution: '',
        positive_sign: '',
        reference: '',
        sensitivity_specificity: '',
        tags: [],
        type: 'special_test',
        fields_definition: [],
        regularity_sessions: null,
    });

    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        if (test && mode === 'edit') {
            setFormData({
                ...test,
                fields_definition: Array.isArray(test.fields_definition)
                    ? test.fields_definition
                    : [],
            });
            setTagsInput((test.tags || []).join(', '));
        } else if (mode === 'create') {
            setFormData({
                name: '',
                name_en: '',
                category: '',
                target_joint: '',
                purpose: '',
                execution: '',
                positive_sign: '',
                reference: '',
                sensitivity_specificity: '',
                tags: [],
                type: 'special_test',
                fields_definition: [],
                regularity_sessions: null,
            });
            setTagsInput('');
        }
    }, [test, mode, open]);

    const createMutation = useMutation({
        mutationFn: async (data: ClinicalTest) => {
            await addDoc(collection(db, 'clinical_test_templates'), {
                name: data.name,
                name_en: data.name_en || null,
                category: data.category,
                target_joint: data.target_joint,
                purpose: data.purpose,
                execution: data.execution,
                positive_sign: data.positive_sign || null,
                reference: data.reference || null,
                sensitivity_specificity: data.sensitivity_specificity || null,
                tags: data.tags || [],
                type: data.type || 'special_test',
                fields_definition: data.fields_definition || [],
                regularity_sessions: data.regularity_sessions || null,
                organization_id: organizationId,
                created_by: user?.uid,
                created_at: serverTimestamp(),
            });
        },
        onSuccess: () => {
            toast.success('Teste clínico criado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clinical-tests-library'] });
            onOpenChange(false);
        },
        onError: (error) => {
            logger.error('Error creating test', error, 'ClinicalTestFormModal');
            toast.error('Erro ao criar teste clínico');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: ClinicalTest) => {
            if (!data.id) throw new Error('Test ID is required for update');

            const docRef = doc(db, 'clinical_test_templates', data.id);
            await setDoc(docRef, {
                name: data.name,
                name_en: data.name_en || null,
                category: data.category,
                target_joint: data.target_joint,
                purpose: data.purpose,
                execution: data.execution,
                positive_sign: data.positive_sign || null,
                reference: data.reference || null,
                sensitivity_specificity: data.sensitivity_specificity || null,
                tags: data.tags || [],
                type: data.type || 'special_test',
                fields_definition: data.fields_definition || [],
                regularity_sessions: data.regularity_sessions || null,
                updated_at: serverTimestamp(),
            }, { merge: true });
        },
        onSuccess: () => {
            toast.success('Teste clínico atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clinical-tests-library'] });
            onOpenChange(false);
        },
        onError: (error) => {
            logger.error('Error updating test', error, 'ClinicalTestFormModal');
            toast.error('Erro ao atualizar teste clínico');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const dataToSave = { ...formData, tags };

        if (mode === 'create') {
            createMutation.mutate(dataToSave);
        } else {
            updateMutation.mutate(dataToSave);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
                    <DialogTitle className="text-xl font-bold text-slate-800">
                        {mode === 'create' ? 'Novo Teste Clínico' : 'Editar Teste Clínico'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="mx-6 mt-4 grid w-fit grid-cols-3 shrink-0">
                            <TabsTrigger value="info" className="gap-2">
                                <BookOpen className="h-4 w-4" />
                                Informações
                            </TabsTrigger>
                            <TabsTrigger value="metrics" className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Métricas
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Configurações
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <TabsContent value="info" className="mt-0 space-y-4">
                                {/* Name fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Nome (PT) *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: Teste de Lachman"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="name_en">Nome (EN)</Label>
                                        <Input
                                            id="name_en"
                                            value={formData.name_en || ''}
                                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                            placeholder="Ex: Lachman Test"
                                        />
                                    </div>
                                </div>

                                {/* Category and Joint */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="category">Categoria *</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="target_joint">Articulação Alvo *</Label>
                                        <Select
                                            value={formData.target_joint}
                                            onValueChange={(value) => setFormData({ ...formData, target_joint: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TARGET_JOINTS.map((joint) => (
                                                    <SelectItem key={joint} value={joint}>
                                                        {joint}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Purpose */}
                                <div>
                                    <Label htmlFor="purpose">Objetivo / Propósito *</Label>
                                    <Textarea
                                        id="purpose"
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                        placeholder="Descreva o objetivo clínico do teste..."
                                        rows={2}
                                        required
                                    />
                                </div>

                                {/* Execution */}
                                <div>
                                    <Label htmlFor="execution">Execução *</Label>
                                    <Textarea
                                        id="execution"
                                        value={formData.execution}
                                        onChange={(e) => setFormData({ ...formData, execution: e.target.value })}
                                        placeholder="Descreva passo a passo como realizar o teste..."
                                        rows={3}
                                        required
                                    />
                                </div>

                                {/* Positive Sign */}
                                <div>
                                    <Label htmlFor="positive_sign">Interpretação Positiva</Label>
                                    <Textarea
                                        id="positive_sign"
                                        value={formData.positive_sign || ''}
                                        onChange={(e) => setFormData({ ...formData, positive_sign: e.target.value })}
                                        placeholder="O que indica um resultado positivo..."
                                        rows={2}
                                    />
                                </div>

                                {/* Reference and Sensitivity */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="reference">Referência Bibliográfica</Label>
                                        <Input
                                            id="reference"
                                            value={formData.reference || ''}
                                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                            placeholder="Ex: Magee, 2014"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="sensitivity">Sensibilidade/Especificidade</Label>
                                        <Input
                                            id="sensitivity"
                                            value={formData.sensitivity_specificity || ''}
                                            onChange={(e) => setFormData({ ...formData, sensitivity_specificity: e.target.value })}
                                            placeholder="Ex: 85% sens, 94% espec"
                                        />
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                                    <Input
                                        id="tags"
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                        placeholder="Ex: Ortopedia, Joelho, LCA"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="metrics" className="mt-0">
                                <ClinicalTestMetricsBuilder
                                    fields={formData.fields_definition || []}
                                    onChange={(fields) => setFormData({ ...formData, fields_definition: fields })}
                                />
                            </TabsContent>

                            <TabsContent value="settings" className="mt-0 space-y-6">
                                {/* Test Type */}
                                <div>
                                    <Label htmlFor="type">Tipo de Teste</Label>
                                    <Select
                                        value={formData.type || 'special_test'}
                                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TEST_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Testes Especiais são qualitativos (positivo/negativo). Testes Funcionais são quantitativos (medições).
                                    </p>
                                </div>

                                {/* Regularity */}
                                <div>
                                    <Label htmlFor="regularity">Regularidade (a cada X sessões)</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="regularity"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={formData.regularity_sessions || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                regularity_sessions: e.target.value ? Number(e.target.value) : null
                                            })}
                                            placeholder="Ex: 4"
                                            className="w-32"
                                        />
                                        <span className="text-sm text-slate-500">sessões</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Define a frequência recomendada para reaplicar este teste. Deixe vazio para aplicar apenas quando necessário.
                                    </p>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={isPending || !formData.name || !formData.category || !formData.target_joint}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {mode === 'create' ? 'Criar Teste' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
