import React, { useState } from 'react';
import {

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dumbbell, ArrowRight, AlertTriangle, Check, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/types';
import { withImageParams } from '@/lib/storageProxy';

interface MergeExercisesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exercises: Exercise[];
    onMerge: (keepId: string, mergeIds: string[]) => Promise<void>;
}

export function MergeExercisesModal({
    open,
    onOpenChange,
    exercises,
    onMerge,
}: MergeExercisesModalProps) {
    const [selectedKeepId, setSelectedKeepId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Reset selection when modal opens
    React.useEffect(() => {
        if (open && exercises.length > 0) {
            setSelectedKeepId(exercises[0].id);
        } else {
            setSelectedKeepId(null);
        }
    }, [open, exercises]);

    const handleMerge = async () => {
        if (!selectedKeepId) return;

        setIsLoading(true);
        try {
            const mergeIds = exercises.filter(e => e.id !== selectedKeepId).map(e => e.id);
            await onMerge(selectedKeepId, mergeIds);
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedExercise = exercises.find(e => e.id === selectedKeepId);
    const exercisesToMerge = exercises.filter(e => e.id !== selectedKeepId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        Unir Exercícios Duplicados
                    </DialogTitle>
                    <DialogDescription>
                        Escolha qual exercício manter. Os outros serão mesclados e removidos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Warning */}
                    <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            Esta ação é irreversível. Os exercícios selecionados serão permanentemente mesclados.
                        </AlertDescription>
                    </Alert>

                    {/* Exercise Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Selecione o exercício a manter:</Label>
                        <RadioGroup value={selectedKeepId || ''} onValueChange={setSelectedKeepId}>
                            {exercises.map((exercise) => (
                                <div key={exercise.id} className="relative">
                                    <Label
                                        htmlFor={exercise.id}
                                        className={cn(
                                            'block cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50',
                                            selectedKeepId === exercise.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <RadioGroupItem value={exercise.id} id={exercise.id} className="mt-1" />

                                            {/* Thumbnail */}
                                            <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                                {exercise.image_url ? (
                                                    <img
                                                        src={withImageParams(exercise.image_url, { width: 140, height: 140, format: 'auto', fit: 'cover', quality: 65 })}
                                                        alt={exercise?.name ?? 'Exercício'}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Dumbbell className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{exercise?.name ?? 'Exercício'}</span>
                                                    {selectedKeepId === exercise.id && (
                                                        <Badge className="bg-primary text-primary-foreground">
                                                            <Check className="h-3 w-3 mr-1" />
                                                            Manter
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {exercise.category && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {exercise.category}
                                                        </Badge>
                                                    )}
                                                    {exercise.difficulty && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {exercise.difficulty}
                                                        </Badge>
                                                    )}
                                                    {exercise.video_url ? (
                                                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                                                            <Video className="h-3 w-3 mr-1" />
                                                            Com vídeo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                                            <VideoOff className="h-3 w-3 mr-1" />
                                                            Sem vídeo
                                                        </Badge>
                                                    )}
                                                </div>
                                                {exercise.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                        {exercise.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Preview */}
                    {selectedExercise && exercisesToMerge.length > 0 && (
                        <Card className="p-4 bg-muted/30">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 text-center">
                                    <div className="text-sm text-muted-foreground mb-1">Será removido</div>
                                    <div className="space-y-1">
                                        {exercisesToMerge.map((e) => (
                                            <Badge key={e.id} variant="secondary" className="text-xs block">
                                                {e?.name ?? 'Exercício'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 text-center">
                                    <div className="text-sm text-muted-foreground mb-1">Será mantido</div>
                                    <Badge className="bg-primary text-primary-foreground">
                                        {selectedExercise?.name ?? 'Exercício'}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleMerge}
                        disabled={!selectedKeepId || isLoading || exercises.length < 2}
                        className="bg-primary"
                    >
                        {isLoading ? 'Unindo...' : `Unir ${exercises.length} Exercícios`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
