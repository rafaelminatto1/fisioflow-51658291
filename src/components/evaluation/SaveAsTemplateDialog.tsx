import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateField } from './EvaluationTemplateSelector';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db, collection, addDoc, doc, setDoc } from '@/integrations/firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';

interface SaveAsTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fields: TemplateField[];
    onSuccess?: (templateId: string) => void;
}

const CATEGORIES = [
    { value: 'padrao', label: 'Avaliação Padrão' },
    { value: 'esportiva', label: 'Fisioterapia Esportiva' },
    { value: 'ortopedica', label: 'Fisioterapia Ortopédica' },
    { value: 'neurologica', label: 'Fisioterapia Neurológica' },
    { value: 'respiratoria', label: 'Fisioterapia Respiratória' },
    { value: 'pediatrica', label: 'Fisioterapia Pediátrica' },
    { value: 'geriatrica', label: 'Fisioterapia Geriátrica' },
    { value: 'aquatica', label: 'Fisioterapia Aquática' },
    { value: 'uroginecologica', label: 'Fisioterapia Uroginecológica' },
    { value: 'geral', label: 'Avaliação Geral' },
];

export function SaveAsTemplateDialog({
    open,
    onOpenChange,
    fields,
    onSuccess,
}: SaveAsTemplateDialogProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        tipo: 'geral',
    });

    const saveTemplateMutation = useMutation({
        mutationFn: async () => {
            // Use Firebase callable function to create evaluation template
            const saveTemplateFn = httpsCallable(getFirebaseFunctions(), 'saveEvaluationTemplate');
            const result = await saveTemplateFn({
                nome: formData.nome,
                descricao: formData.descricao || null,
                tipo: formData.tipo,
                campos: fields.map((field, index) => ({
                    label: field.label,
                    tipo_campo: field.tipo_campo,
                    placeholder: field.placeholder,
                    opcoes: field.opcoes || null,
                    ordem: index + 1,
                    obrigatorio: field.obrigatorio,
                })),
            });

            if (result.data?.error) {
                throw new Error(result.data.error);
            }

            return result.data;
        },
        onSuccess: (form) => {
            queryClient.invalidateQueries({ queryKey: ['evaluation-templates-with-fields'] });
            queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
            toast.success(`Template "${formData.nome}" salvo com sucesso!`);

            // Reset form
            setFormData({ nome: '', descricao: '', tipo: 'geral' });
            onOpenChange(false);

            if (onSuccess && form?.id) {
                onSuccess(form.id);
            }
        },
        onError: (error) => {
            logger.error('Error saving template', error, 'SaveAsTemplateDialog');
            toast.error('Erro ao salvar template. Tente novamente.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveTemplateMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Salvar como Template
                    </DialogTitle>
                    <DialogDescription>
                        Salve a configuração atual como um novo template de avaliação reutilizável.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome do Template *</Label>
                        <Input
                            id="nome"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Ex: Avaliação de Ombro Completa"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea
                            id="descricao"
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            placeholder="Breve descrição do template e sua aplicação..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                            value={formData.tipo}
                            onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Campos incluídos:</span>
                            <span className="font-medium">{fields.length} campos</span>
                        </div>
                        {fields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {fields.slice(0, 5).map((field, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs"
                                    >
                                        {field.label}
                                    </span>
                                ))}
                                {fields.length > 5 && (
                                    <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                        +{fields.length - 5} mais
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saveTemplateMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!formData.nome || saveTemplateMutation.isPending}
                        >
                            {saveTemplateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Salvar Template
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default SaveAsTemplateDialog;
