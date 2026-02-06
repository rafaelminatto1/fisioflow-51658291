/**
 * MetaFormModal - Modal para criar/editar meta
 */

import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import {

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { useCreateGoal, useUpdateGoal } from '@/hooks/usePatientEvolution';
import type { PatientGoal } from '@/types/evolution';
import { format } from 'date-fns';

interface MetaFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string | undefined;
    goal?: PatientGoal | null;
}

const CATEGORIES = [
    { value: 'funcional', label: 'Funcional' },
    { value: 'dor', label: 'Redução de dor' },
    { value: 'mobilidade', label: 'Mobilidade' },
    { value: 'forca', label: 'Força' },
    { value: 'resistencia', label: 'Resistência' },
    { value: 'esportivo', label: 'Esportivo' },
    { value: 'outro', label: 'Outro' },
];

const PRIORITIES = [
    { value: 'baixa', label: 'Baixa', color: 'text-green-600' },
    { value: 'media', label: 'Média', color: 'text-yellow-600' },
    { value: 'alta', label: 'Alta', color: 'text-orange-600' },
    { value: 'critica', label: 'Crítica', color: 'text-red-600' },
];

export function MetaFormModal({ open, onOpenChange, patientId, goal }: MetaFormModalProps) {
    const createGoal = useCreateGoal();
    const updateGoal = useUpdateGoal();

    const isEditing = !!goal;

    const [formData, setFormData] = useState({
        goal_title: '',
        goal_description: '',
        category: '',
        target_date: '',
        target_value: '',
        priority: 'media' as PatientGoal['priority'],
        current_progress: 0,
    });

    // Preencher formulário quando editar
    useEffect(() => {
        if (goal) {
            setFormData({
                goal_title: goal.goal_title || '',
                goal_description: goal.goal_description || '',
                category: goal.category || '',
                target_date: goal.target_date ? format(new Date(goal.target_date), 'yyyy-MM-dd') : '',
                target_value: goal.target_value || '',
                priority: goal.priority || 'media',
                current_progress: goal.current_progress || 0,
            });
        } else {
            setFormData({
                goal_title: '',
                goal_description: '',
                category: '',
                target_date: '',
                target_value: '',
                priority: 'media',
                current_progress: 0,
            });
        }
    }, [goal, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patientId || !formData.goal_title.trim()) return;

        try {
            if (isEditing && goal) {
                await updateGoal.mutateAsync({
                    goalId: goal.id,
                    data: {
                        goal_title: formData.goal_title,
                        goal_description: formData.goal_description || undefined,
                        category: formData.category || undefined,
                        target_date: formData.target_date || undefined,
                        target_value: formData.target_value || undefined,
                        priority: formData.priority,
                        current_progress: formData.current_progress,
                    }
                });
            } else {
                await createGoal.mutateAsync({
                    patient_id: patientId,
                    goal_title: formData.goal_title,
                    goal_description: formData.goal_description || undefined,
                    category: formData.category || undefined,
                    target_date: formData.target_date || undefined,
                    target_value: formData.target_value || undefined,
                    priority: formData.priority,
                    current_progress: formData.current_progress,
                });
            }

            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao salvar meta:', error);
        }
    };

    const isPending = createGoal.isPending || updateGoal.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        {isEditing ? 'Editar Meta' : 'Nova Meta'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Título */}
                    <div className="space-y-2">
                        <Label htmlFor="goal_title">Título *</Label>
                        <Input
                            id="goal_title"
                            placeholder="Ex: Correr 5km sem dor"
                            value={formData.goal_title}
                            onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                            required
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="goal_description">Descrição</Label>
                        <Textarea
                            id="goal_description"
                            placeholder="Detalhes adicionais sobre a meta..."
                            value={formData.goal_description}
                            onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                            rows={2}
                        />
                    </div>

                    {/* Categoria e Prioridade */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Selecione" />
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

                        <div className="space-y-2">
                            <Label htmlFor="priority">Prioridade</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => setFormData({ ...formData, priority: value as PatientGoal['priority'] })}
                            >
                                <SelectTrigger id="priority">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            <span className={p.color}>{p.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Data Alvo e Valor Alvo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="target_date">Data Alvo</Label>
                            <Input
                                id="target_date"
                                type="date"
                                value={formData.target_date}
                                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target_value">Valor Alvo</Label>
                            <Input
                                id="target_value"
                                placeholder="Ex: 5km, 10 reps"
                                value={formData.target_value}
                                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Progresso (só na edição) */}
                    {isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="current_progress">
                                Progresso Atual: {formData.current_progress}%
                            </Label>
                            <Input
                                id="current_progress"
                                type="range"
                                min="0"
                                max="100"
                                value={formData.current_progress}
                                onChange={(e) => setFormData({ ...formData, current_progress: parseInt(e.target.value) })}
                                className="cursor-pointer"
                            />
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending || !formData.goal_title.trim()}>
                            {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Meta'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
