import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {

    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
    Maximize2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PatientService } from '@/lib/services/PatientService';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Interfaces definindo a estrutura dos dados
interface Exercise {
    id: string;
    name: string;
    description?: string;
    video_url?: string;
    muscle_group?: string;
    equipment?: string[];
    sets: number;
    reps: number;
    duration_seconds?: number; // Para exercícios isométricos ou cardio
    rest_seconds?: number;
    notes?: string;
}

interface Prescription {
    id: string;
    title: string;
    exercises: Exercise[];
}

interface ExercisePlayerProps {
    prescription: Prescription;
    onComplete: () => void;
    onExit: () => void;
}

export function ExercisePlayer({ prescription, onComplete, onExit }: ExercisePlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [difficulty, setDifficulty] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Timer states when exercises have duration
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const currentExercise = prescription.exercises[currentIndex];
    const isLastExercise = currentIndex === prescription.exercises.length - 1;

    useEffect(() => {
        // Reset states when exercise changes
        setProgress(0);
        setIsPlaying(false);
        setFeedback('');
        setDifficulty(0);

        if (currentExercise?.duration_seconds) {
            setTimeLeft(currentExercise.duration_seconds);
        }
    }, [currentIndex, currentExercise]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        setIsPlaying(false);
                        toast.success("Tempo finalizado!");
                        return 0;
                    }
                    return prev - 1;
                });
                // Update progress bar based on time
                if (currentExercise?.duration_seconds) {
                    setProgress(((currentExercise.duration_seconds - timeLeft) / currentExercise.duration_seconds) * 100);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft, currentExercise?.duration_seconds]);

    // Fallback for null/undefined exercise
    if (!currentExercise) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Erro ao carregar exercício</h3>
                <p className="text-muted-foreground mb-6">Não foi possível encontrar os dados deste exercício.</p>
                <Button onClick={onExit}>Voltar</Button>
            </div>
        );
    }


    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                if (currentExercise.duration_seconds) setIsTimerRunning(false);
            } else {
                videoRef.current.play();
                if (currentExercise.duration_seconds && timeLeft > 0) setIsTimerRunning(true);
            }
            setIsPlaying(!isPlaying);
        } else if (currentExercise.duration_seconds) {
            // Timer only logic if no video
            setIsTimerRunning(!isTimerRunning);
            setIsPlaying(!isPlaying);
        }
    };

    const handleNext = async () => {
        try {
            // Log completion
            await PatientService.logExercise({
                exercise_id: currentExercise.id,
                prescription_id: prescription.id,
                difficulty_rating: difficulty || undefined,
                feedback_notes: feedback,
                completed_at: new Date().toISOString()
            });

            if (isLastExercise) {
                onComplete();
                toast.success("Treino concluído! Parabéns!");
            } else {
                setCurrentIndex(prev => prev + 1);
                toast.success("Exercício registrado!");
            }
        } catch (error) {
            logger.error('Error logging exercise', error, 'ExercisePlayer');
            toast.error("Erro ao salvar progresso. Tente novamente.");
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
                    <p className="text-muted-foreground">
                        Exercício {currentIndex + 1} de {prescription.exercises.length}
                    </p>
                </div>
                <Button variant="ghost" onClick={onExit}>
                    Sair do Treino
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Video/Player Area */}
                <div className="md:col-span-2 space-y-4">
                    <Card className="overflow-hidden bg-black aspect-video relative group">
                        {currentExercise.video_url ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={currentExercise.video_url}
                                    className="w-full h-full object-contain"
                                    loop
                                    muted={isMuted}
                                    onTimeUpdate={() => {
                                        if (videoRef.current && !currentExercise.duration_seconds) {
                                            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                                        }
                                    }}
                                />

                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-white/20 rounded-full h-12 w-12"
                                        onClick={() => {
                                            if (videoRef.current) videoRef.current.currentTime -= 10;
                                        }}
                                    >
                                        <SkipBack className="h-6 w-6" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-full border-2 bg-white/10 backdrop-blur hover:bg-white/20 border-white text-white"
                                        onClick={togglePlay}
                                    >
                                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-white hover:bg-white/20 rounded-full h-12 w-12"
                                        onClick={() => {
                                            if (videoRef.current) videoRef.current.currentTime += 10;
                                        }}
                                    >
                                        <SkipForward className="h-6 w-6" />
                                    </Button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white text-sm">
                                            {currentExercise.duration_seconds ? formatTime(timeLeft) : '0:00'}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-white hover:bg-white/20"
                                                onClick={() => setIsMuted(!isMuted)}
                                            >
                                                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-white hover:bg-white/20"
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Progress value={progress} className="h-1" />
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center flex-col bg-muted/20">
                                <Dumbbell className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                                <p className="text-muted-foreground">Sem vídeo disponível</p>
                                {currentExercise.duration_seconds && (
                                    <div className="mt-8 text-center">
                                        <div className="text-5xl font-mono font-bold text-primary mb-6">
                                            {formatTime(timeLeft)}
                                        </div>
                                        <Button
                                            size="lg"
                                            className="rounded-full h-16 w-16"
                                            onClick={togglePlay}
                                        >
                                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Controls Bar */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl">
                        <Button
                            variant="outline"
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                        >
                            <SkipBack className="h-4 w-4 mr-2" />
                            Anterior
                        </Button>

                        <div className="text-center">
                            <p className="font-semibold text-lg">{currentExercise.sets} séries x {currentExercise.reps} reps</p>
                            {currentExercise.rest_seconds && (
                                <p className="text-sm text-muted-foreground">Descanso: {currentExercise.rest_seconds}s</p>
                            )}
                        </div>

                        <Button onClick={handleNext} className="min-w-[120px]">
                            {isLastExercise ? 'Finalizar' : 'Próximo'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Instruções
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {currentExercise.description || "Siga as orientações do vídeo e mantenha a postura correta durante a execução."}
                            </p>
                        </div>

                        {currentExercise.notes && (
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200/50">
                                <h4 className="font-medium text-sm text-yellow-800 dark:text-yellow-400 mb-1 flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" />
                                    Observações
                                </h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    {currentExercise.notes}
                                </p>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <h3 className="font-semibold mb-3">Feedback do Exercício</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Dificuldade</label>
                                    <div className="flex justify-between gap-1">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setDifficulty(level)}
                                                className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                                                    difficulty === level
                                                        ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md"
                                                        : "bg-background hover:bg-muted border-input"
                                                )}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Fácil</span>
                                        <span>Difícil</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Anotações (Opcional)</label>
                                    <Textarea
                                        placeholder="Sentiu dor ou desconforto?"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="h-20 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Equipment list if available */}
                        {currentExercise.equipment && currentExercise.equipment.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-2 text-sm">Equipamentos</h3>
                                <div className="flex flex-wrap gap-2">
                                    {currentExercise.equipment.map((eq, i) => (
                                        <span key={i} className="bg-muted px-2 py-1 rounded text-xs font-medium">
                                            {eq}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Import icons needed
import { ArrowRight, FileText, Dumbbell } from 'lucide-react';
