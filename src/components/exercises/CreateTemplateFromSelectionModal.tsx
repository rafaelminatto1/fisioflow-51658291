import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExerciseTemplates, useTemplateItems } from '@/hooks/useExerciseTemplates';
import { toast } from 'sonner';

interface CreateTemplateFromSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedExerciseIds: string[];
    onSuccess?: () => void;
}

export function CreateTemplateFromSelectionModal({
    open,
    onOpenChange,
    selectedExerciseIds,
    onSuccess
}: CreateTemplateFromSelectionModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'patologia' | 'pos_operatorio'>('patologia');
    const [conditionName, setConditionName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { createTemplateAsync } = useExerciseTemplates();
    const { addItem } = useTemplateItems(); // We need a way to add items, but hook requires templateId.
    // Actually, useTemplateItems hook depends on templateId query key.
    // We can't really use it easily here without mounting it for the new template ID.
    // Better approach: Create a specialized service function or use direct supabase call here for efficiency.
    // OR: Refactor useTemplateItems to not require templateId for the mutation itself, or use a separate hook.
    // For simplicity and speed given constraints: I'll use direct supabase call for batch insert of items.

    // Actually, looking at useExerciseTemplates structure, I can just use supabase client directly for items 
    // to avoid complex hook orchestration in this modal.
    // Let's import supabase.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !conditionName) return;

        try {
            setIsSubmitting(true);

            // 1. Create Template
            const newTemplate = await createTemplateAsync({
                name,
                description,
                category,
                condition_name: conditionName,
                template_variant: 'Personalizado'
            });

            if (newTemplate?.id) {
                // 2. Add Selected Exercises to Template
                // We need to import supabase here.
                const { supabase } = await import('@/integrations/supabase/client');

                const items = selectedExerciseIds.map((exerciseId, index) => ({
                    template_id: newTemplate.id,
                    exercise_id: exerciseId,
                    order_index: index,
                    sets: 3, // Default values
                    repetitions: 10
                }));

                const { error } = await supabase
                    .from('exercise_template_items')
                    .insert(items);

                if (error) throw error;

                toast.success('Template criado com sucesso!');
                onOpenChange(false);
                if (onSuccess) onSuccess();

                // Reset form
                setName('');
                setDescription('');
                setConditionName('');
            }

        } catch (error) {
            console.error(error);
            toast.error('Erro ao criar template');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Template da Seleção</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Template</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Reabilitação de Joelho Básico"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="condition">Condição / Patologia</Label>
                        <Input
                            id="condition"
                            value={conditionName}
                            onChange={(e) => setConditionName(e.target.value)}
                            placeholder="Ex: Condromalácia, LCA..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="patologia">Patologia</SelectItem>
                                <SelectItem value="pos_operatorio">Pós-Operatório</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição (Opcional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o objetivo deste template..."
                        />
                    </div>

                    <div className="pt-2 text-sm text-muted-foreground">
                        {selectedExerciseIds.length} exercícios selecionados serão adicionados.
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Criando...' : 'Criar Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
