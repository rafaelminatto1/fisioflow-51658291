import React, { useState, useMemo, useCallback } from 'react';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { usePrescribedExercises } from '@/hooks/usePrescribedExercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, House, Search, Send, Library, CheckCircle2, Dumbbell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExerciseLibraryModal } from '../exercises/ExerciseLibraryModal';
import { Card } from '@/components/ui/card';
import { withImageParams } from '@/lib/storageProxy';

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

    const filteredExercises = useMemo(() =>
        availableExercises.filter(ex =>
            ex.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [availableExercises, searchTerm]
    );

    // Get IDs of exercises already prescribed (for showing as added in modal)
    const prescribedExerciseIds = useMemo(() => {
        return prescriptions?.map(p => p.exercise_id) || [];
    }, [prescriptions]);

    const handleAddExercise = useCallback((exerciseId: string) => {
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
    }, [availableExercises, addPrescription]);

    const handleAddExerciseFromLibrary = useCallback((exercise: Exercise) => {
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
    }, [prescribedExerciseIds, addPrescription]);

    const handleWhatsAppShare = useCallback(() => {
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
    }, [patientPhone, prescriptions]);

    return (
        <>
            <TooltipProvider>
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

                    {/* WhatsApp Share Button */}
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
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {isLoading ? (
                            <div className="col-span-full space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
                            </div>
                        ) : prescriptions?.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                                <House className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">Nenhum exercício domiciliar</p>
                                <p className="text-xs mt-1">Use a biblioteca ou busca acima para prescrever</p>
                            </div>
                        ) : (
                            prescriptions?.map((p, index) => (
                                <Card
                                    key={p.id}
                                    className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md hover:border-green-500/50 relative border-2 border-border/50 bg-card"
                                >
                                    {/* Header / Thumbnail Area */}
                                    <div className="relative aspect-video w-full bg-muted overflow-hidden shrink-0">
                                        {p.exercise?.image_url ? (
                                            <img
                                                src={withImageParams(p.exercise.image_url, { width: 640, height: 360, dpr: 2, format: 'auto', fit: 'cover' })}
                                                alt={p.exercise.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                                                <Dumbbell className="h-10 w-10" />
                                            </div>
                                        )}

                                        {/* Overlay with index and remove button */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                            <div className="flex justify-between items-start">
                                                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white text-[10px] font-bold">
                                                    {index + 1}
                                                </span>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full shadow-lg"
                                                    onClick={() => removePrescription.mutate(p.id)}
                                                    disabled={disabled}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-2 left-2">
                                            <Badge className="bg-white/90 text-green-700 hover:bg-white text-[9px] font-bold border-none shadow-sm">
                                                HOME CARE
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-3 space-y-3 flex-1 flex flex-col">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm leading-tight line-clamp-2 min-h-[2.5rem]" title={p.exercise?.name}>
                                                {p.exercise?.name}
                                            </h4>
                                        </div>

                                        {/* Inputs Grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Séries</Label>
                                                <Input
                                                    type="number"
                                                    value={p.sets}
                                                    onChange={(e) => updatePrescription.mutate({ id: p.id, sets: parseInt(e.target.value) || 0 })}
                                                    className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                                                    disabled={disabled}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Reps</Label>
                                                <Input
                                                    type="number"
                                                    value={p.reps}
                                                    onChange={(e) => updatePrescription.mutate({ id: p.id, reps: parseInt(e.target.value) || 0 })}
                                                    className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                                                    disabled={disabled}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Freq</Label>
                                                <Input
                                                    value={p.frequency || ''}
                                                    onChange={(e) => updatePrescription.mutate({ id: p.id, frequency: e.target.value })}
                                                    placeholder="1x/dia"
                                                    className="h-7 text-xs px-2 font-bold bg-muted/30 focus:bg-background border-none ring-1 ring-border/50"
                                                    disabled={disabled}
                                                />
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-1 mt-auto pt-2 border-t border-dashed">
                                            <Label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Orientações</Label>
                                            <textarea
                                                value={p.notes || ''}
                                                onChange={(e) => updatePrescription.mutate({ id: p.id, notes: e.target.value })}
                                                placeholder="Orientações para o paciente..."
                                                className="w-full text-[10px] p-2 rounded bg-muted/30 focus:bg-background border-none ring-1 ring-border/50 outline-none min-h-[40px] resize-none italic"
                                                disabled={disabled}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </ScrollArea>
                </div>
            </TooltipProvider>

            {/* Exercise Library Modal - Outside TooltipProvider */}
            <ExerciseLibraryModal
                open={isLibraryModalOpen}
                onOpenChange={setIsLibraryModalOpen}
                onSelectExercise={handleAddExerciseFromLibrary}
                addedExerciseIds={prescribedExerciseIds}
            />
        </>
    );
};
