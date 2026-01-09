import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, CheckCircle2, X } from 'lucide-react';
import { PatientService } from '@/lib/services/PatientService';
import { useToast } from '@/hooks/use-toast';

interface ExercisePlayerProps {
    prescription: any;
    patientId: string;
    onClose: () => void;
    onComplete: () => void;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({ prescription, patientId, onClose, onComplete }) => {
    const [step, setStep] = useState<'video' | 'feedback'>('video');
    const [difficulty, setDifficulty] = useState('medium');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleComplete = async () => {
        try {
            setLoading(true);
            await PatientService.logExercise(patientId, prescription.id, difficulty, notes);
            toast({
                title: "Parabéns!",
                description: "Exercício concluído com sucesso. Continue assim!",
            });
            onComplete();
            onClose();
        } catch (error) {
            console.error('Error logging exercise:', error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível registrar a conclusão do exercício.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const exercise = prescription.exercise;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="absolute top-4 right-4 z-10">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/20 hover:bg-white/40 text-black md:text-white">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {step === 'video' ? (
                    <>
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                            {exercise.video_url ? (
                                <iframe
                                    src={exercise.video_url}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="text-center text-white p-8">
                                    <Play className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                    <p>Vídeo demonstrativo para "{exercise.name}" indisponível.</p>
                                    <p className="text-sm opacity-60">Siga as orientações descritas abaixo.</p>
                                </div>
                            )}
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{exercise.name}</CardTitle>
                                    <CardDescription>Objetivo: {exercise.category}</CardDescription>
                                </div>
                                <Badge variant="outline">{exercise.difficulty}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-primary/5 p-3 rounded-lg flex justify-around text-center">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Séries</p>
                                    <p className="font-bold text-lg">{prescription.sets}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Repetições</p>
                                    <p className="font-bold text-lg">{prescription.reps}</p>
                                </div>
                                {prescription.duration_seconds && (
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Duração</p>
                                        <p className="font-bold text-lg">{prescription.duration_seconds}s</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Instruções</p>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {exercise.description}
                                    {prescription.notes && (
                                        <div className="mt-2 p-2 border-l-2 border-primary bg-muted/50 font-medium">
                                            Obs do Fisio: {prescription.notes}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button className="w-full" onClick={() => setStep('feedback')}>
                                Marcar como Concluído
                            </Button>
                        </CardContent>
                    </>
                ) : (
                    <>
                        <CardHeader>
                            <CardTitle>Como foi o exercício?</CardTitle>
                            <CardDescription>Seu feedback ajuda o fisioterapeuta a ajustar seu nível de esforço.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <p className="text-sm font-medium">Nível de Dificuldade</p>
                                <RadioGroup value={difficulty} onValueChange={setDifficulty} className="grid grid-cols-3 gap-4">
                                    <div>
                                        <RadioGroupItem value="easy" id="easy" className="peer sr-only" />
                                        <Label
                                            htmlFor="easy"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                            <span className="text-lg mb-1">😃</span>
                                            <span className="text-xs font-semibold">Fácil</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                                        <Label
                                            htmlFor="medium"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                            <span className="text-lg mb-1">😐</span>
                                            <span className="text-xs font-semibold">Médio</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="hard" id="hard" className="peer sr-only" />
                                        <Label
                                            htmlFor="hard"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                        >
                                            <span className="text-lg mb-1">😫</span>
                                            <span className="text-xs font-semibold">Difícil</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Observações ou Sinais de Dor</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Sentiu alguma pontada? O exercício foi muito produtivo? Conte-nos."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" className="flex-1" onClick={() => setStep('video')}>
                                    Voltar
                                </Button>
                                <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                                    {loading ? "Salvando..." : "Confirmar Conclusão"}
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
};
