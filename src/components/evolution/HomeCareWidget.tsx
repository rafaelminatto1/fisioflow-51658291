import React, { useState, useMemo } from 'react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { usePrescribedExercises, PrescribedExercise } from '@/hooks/usePrescribedExercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, House, Search, Send, Library, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExerciseLibraryModal } from '../exercises/ExerciseLibraryModal';

interface HomeCareWidgetProps {
    patientId: string;
    patientPhone?: string;
    disabled?: boolean;
    className?: string;
}

export const HomeCareWidget: React.FC<HomeCareWidgetProps> = ({
    patientId,
    patientPhone,
    disabled = false,
    className
}) => {
    const { exercises: availableExercises } = useExercises();
    const { prescriptions, isLoading, addPrescription, updatePrescription, removePrescription } = usePrescribedExercises(patientId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    const filteredExercises = availableExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get IDs of exercises already prescribed (for showing as added in modal)
    const prescribedExerciseIds = useMemo(() => {
        return prescriptions?.map(p => p.exercise_id) || [];
    }, [prescriptions]);

    const handleAddExercise = (exerciseId: string) => {
        const exercise = availableExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        addPrescription.mutate({
            exercise_id: exercise.id,
            sets: exercise.sets || 3,
            reps: exercise.repetitions || 10,
            frequency: '1x ao dia',
            notes: ''
        });
        setSelectedExerciseId('');
    };

    const handleAddExerciseFromLibrary = (exercise: Exercise) => {
        // Check if already prescribed
        if (prescribedExerciseIds.includes(exercise.id)) {
            toast({
                title: 'Já prescrito',
                description: 'Este exercício já está na prescrição.',
                variant: 'destructive'
            });
            return;
        }

        addPrescription.mutate({
            exercise_id: exercise.id,
            sets: exercise.sets || 3,
            reps: exercise.repetitions || 10,
            frequency: '1x ao dia',
            notes: ''
        });

        toast({
            title: 'Exercício adicionado',
            description: `${exercise.name} foi adicionado à prescrição.`
        });
    };

    const handleWhatsAppShare = () => {
        if (!patientPhone) {
            toast({
                title: 'Telefone não cadastrado',
                description: 'Adicione um telefone ao paciente para compartilhar.',
                variant: 'destructive'
            });
            return;
        }

        if (!prescriptions || prescriptions.length === 0) {
            toast({
                title: 'Nenhuma prescrição',
                description: 'Adicione exercícios primeiro.',
                variant: 'destructive'
            });
            return;
        }

        const messageHeader = `*Prescrição de Exercícios para Casa - FisioFlow*\n\nOlá! Aqui estão os exercícios recomendados para você fazer em casa:\n\n`;
        const exerciseList = prescriptions.map((p, i) => {
            return `${i + 1}. *${p.exercise?.name}*\n   - ${p.sets} séries de ${p.reps} reps\n   - Frequência: ${p.frequency || 'N/A'}${p.notes ? `\n   - Obs: ${p.notes}` : ''}`;
        }).join('\n\n');

        const messageFooter = `\n\nQualquer dúvida, entre em contato! Boa sorte com os exercícios! 💪`;
        const fullMessage = messageHeader + exerciseList + messageFooter;

        const formattedPhone = patientPhone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(fullMessage)}`;
        window.open(whatsappUrl, '_blank');

        toast({
            title: 'WhatsApp aberto',
            description: 'Prescrição enviada via WhatsApp.',
        });
    };

    return (
        <>
            <div className={cn("flex flex-col h-full", className)}>
                <div className="p-3 border-b flex items-center justify-between gap-2 shrink-0 bg-muted/20">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={selectedExerciseId} onValueChange={handleAddExercise} disabled={disabled || addPrescription.isPending}>
                            <SelectTrigger className="pl-9 h-8 text-xs">
                                <SelectValue placeholder="Prescrever exercício p/ casa..." />
                            </SelectTrigger>
                            <SelectContent>
                                <div className="p-2 border-b">
                                    <Input
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-7 text-xs"
                                        autoFocus
                                    />
                                </div>
                                <ScrollArea className="h-[200px]">
                                    {filteredExercises.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">Nenhum encontrado</div>
                                    ) : (
                                        filteredExercises.map((exercise) => {
                                            const isAdded = prescribedExerciseIds.includes(exercise.id);
                                            return (
                                                <SelectItem
                                                    key={exercise.id}
                                                    value={exercise.id}
                                                    className={cn(
                                                        "text-xs",
                                                        isAdded && "opacity-50"
                                                    )}
                                                    disabled={isAdded}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isAdded && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                                        <span>{exercise.name}</span>
                                                        {isAdded && <span className="text-[10px] text-green-600">(Prescrito)</span>}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })
                                    )}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Library Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsLibraryModalOpen(true)}
                                    className="h-8 px-2 gap-1 text-xs border-dashed border-green-300 hover:border-green-400 hover:bg-green-50 transition-all"
                                    disabled={disabled}
                                >
                                    <Library className="h-3.5 w-3.5 text-green-600" />
                                    <span className="hidden sm:inline">Biblioteca</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir biblioteca de exercícios</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* WhatsApp Share Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleWhatsAppShare}
                                    className="h-8 px-2 gap-1.5 text-xs text-green-600 border-green-200 bg-green-50/50 hover:bg-green-100/50"
                                    disabled={disabled || !prescriptions?.length}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Compartilhar</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Enviar prescrição via WhatsApp</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
                            </div>
                        ) : prescriptions?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed text-muted-foreground">
                                <House className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs">Nenhum exercício domiciliar</p>
                                <p className="text-[10px] mt-1">Use a biblioteca ou busca acima para prescrever</p>
                            </div>
                        ) : (
                            prescriptions?.map((p, index) => (
                                <div key={p.id} className="group border rounded-lg p-2.5 space-y-2.5 bg-card hover:border-green-500/30 transition-colors relative">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 font-medium text-sm">
                                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-600 text-[10px]">
                                                {index + 1}
                                            </span>
                                            <span className="truncate max-w-[180px]" title={p.exercise?.name}>
                                                {p.exercise?.name}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removePrescription.mutate(p.id)}
                                            disabled={disabled}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Séries</Label>
                                            <Input
                                                type="number"
                                                value={p.sets}
                                                onChange={(e) => updatePrescription.mutate({ id: p.id, sets: parseInt(e.target.value) || 0 })}
                                                className="h-7 text-xs px-2"
                                                disabled={disabled}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Reps</Label>
                                            <Input
                                                type="number"
                                                value={p.reps}
                                                onChange={(e) => updatePrescription.mutate({ id: p.id, reps: parseInt(e.target.value) || 0 })}
                                                className="h-7 text-xs px-2"
                                                disabled={disabled}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Frequência</Label>
                                            <Input
                                                value={p.frequency || ''}
                                                onChange={(e) => updatePrescription.mutate({ id: p.id, frequency: e.target.value })}
                                                placeholder="Ex: 2x/dia"
                                                className="h-7 text-xs px-2"
                                                disabled={disabled}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Notas para o Paciente</Label>
                                        <Input
                                            value={p.notes || ''}
                                            onChange={(e) => updatePrescription.mutate({ id: p.id, notes: e.target.value })}
                                            placeholder="Orientações de execução..."
                                            className="h-7 text-xs px-2 italic"
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Exercise Library Modal */}
            <ExerciseLibraryModal
                open={isLibraryModalOpen}
                onOpenChange={setIsLibraryModalOpen}
                onSelectExercise={handleAddExerciseFromLibrary}
                addedExerciseIds={prescribedExerciseIds}
            />
        </>
    );
};
