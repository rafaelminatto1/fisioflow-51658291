import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { cn } from '@/lib/utils';
import { Map, Flag, Star, Trophy, CheckCircle2 } from 'lucide-react';

interface JourneyMapProps {
    totalSessions: number;
    currentLevel: number;
}

interface Milestone {
    id: number;
    sessionsRequired: number;
    title: string;
    description: string;
    icon: React.ElementType<{ className?: string }>;
    position: 'left' | 'right' | 'center';
}

export function JourneyMap({ totalSessions, _currentLevel }: JourneyMapProps) {
    // Define milestones (could be fetched from DB later)
    const milestones: Milestone[] = useMemo(() => [
        { id: 1, sessionsRequired: 0, title: "O Início", description: "Sua jornada começa aqui", icon: Map, position: 'center' },
        { id: 2, sessionsRequired: 1, title: "Primeiro Passo", description: "1ª Sessão concluída", icon: Flag, position: 'left' },
        { id: 3, sessionsRequired: 5, title: "Pegando Ritmo", description: "5 Sessões realizadas", icon: Star, position: 'right' },
        { id: 4, sessionsRequired: 10, title: "Consistência", description: "10 Sessões - Hábito formado", icon: CheckCircle2, position: 'left' },
        { id: 5, sessionsRequired: 20, title: "Dedicação Total", description: "20 Sessões - Resultados visíveis", icon: Trophy, position: 'center' },
    ], []);

    // Calculate progress between nodes for visual path logic could be complex
    // For MVP, we'll list them in a vertical winding path.

    return (
        <Card className="border-border/60 shadow-sm overflow-hidden bg-gradient-to-b from-background to-muted/20">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Map className="h-5 w-5 text-primary" />
                    Sua Jornada
                </CardTitle>
            </CardHeader>
            <CardContent className="relative py-10 px-4">
                {/* Connecting Line (Dotted Path) */}
                <div className="absolute left-1/2 top-4 bottom-4 w-1 -translate-x-1/2 md:block hidden">
                    <div className="h-full w-full border-l-2 border-dashed border-primary/20" />
                </div>

                <div className="flex flex-col gap-12 relative max-w-2xl mx-auto">
                    {milestones.map((milestone, index) => {
                        const isUnlocked = totalSessions >= milestone.sessionsRequired;
                        const isNext = !isUnlocked && (index === 0 || totalSessions >= milestones[index - 1].sessionsRequired);

                        // Layout alternations for desktop
                        const justifyClass = milestone.position === 'center'
                            ? 'md:justify-center'
                            : milestone.position === 'left'
                                ? 'md:justify-start'
                                : 'md:justify-end';

                        const Icon = milestone.icon;

                        return (
                            <div
                                key={milestone.id}
                                className={cn(
                                    "flex items-center gap-4 relative md:w-full",
                                    justifyClass
                                )}
                            >
                                {/* Mobile Trace Line Fix: Only show simpler layout on mobile */}

                                <div className={cn(
                                    "relative z-10 p-4 rounded-full border-4 transition-all duration-500 flex items-center justify-center shrink-0 w-16 h-16 shadow-lg",
                                    isUnlocked
                                        ? "bg-primary text-primary-foreground border-primary cursor-pointer hover:scale-110"
                                        : isNext
                                            ? "bg-background text-primary border-primary animate-pulse"
                                            : "bg-muted text-muted-foreground border-border grayscale"
                                )}>
                                    <Icon className="h-6 w-6" />
                                    {isUnlocked && <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1"><CheckCircle2 className="h-3 w-3" /></div>}
                                </div>

                                <div className={cn(
                                    "flex flex-col p-4 rounded-xl border max-w-[200px] transition-all",
                                    isUnlocked
                                        ? "bg-card border-primary/20 shadow-md"
                                        : "bg-muted/50 border-transparent opacity-60"
                                )}>
                                    <h4 className="font-bold text-sm">{milestone.title}</h4>
                                    <p className="text-xs text-muted-foreground">{milestone.description}</p>
                                    {isUnlocked ? (
                                        <span className="text-[10px] font-bold text-green-600 mt-2 block">Concluído</span>
                                    ) : (
                                        <span className="text-[10px] font-medium text-muted-foreground mt-2 block">Necessário: {milestone.sessionsRequired} sessões</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
