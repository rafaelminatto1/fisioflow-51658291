import { motion } from 'framer-motion';
import { Lock, Gift } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/web/ui/scroll-area';

interface LevelJourneyMapProps {
    currentLevel: number;
}

export default function LevelJourneyMap({ currentLevel }: LevelJourneyMapProps) {
    // Generate levels 1-20
    const levels = Array.from({ length: 20 }, (_, i) => i + 1);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    Mapa da Jornada
                </h3>
                <span className="text-xs text-muted-foreground">Próxima recompensa: Nível {Math.ceil((currentLevel + 0.1) / 5) * 5}</span>
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-2xl border bg-card/50 p-4">
                <div className="flex items-center gap-4 px-2 min-w-max">
                    {levels.map((level) => {
                        const isUnlocked = level <= currentLevel;
                        const isCurrent = level === currentLevel;
                        const isMilestone = level % 5 === 0;

                        return (
                            <div key={level} className="relative flex flex-col items-center gap-3 group">
                                {/* Connector Line */}
                                {level < levels.length && (
                                    <div className={`absolute top-6 left-1/2 w-[calc(100%+1rem)] h-1 -z-10
                                    ${isUnlocked ? 'bg-primary/30' : 'bg-muted'}
                                `} />
                                )}

                                <motion.div
                                    className={`
                                    relative w-12 h-12 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-300
                                    ${isCurrent
                                            ? 'bg-primary border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.5)] scale-110'
                                            : isUnlocked
                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                : 'bg-muted text-muted-foreground border-transparent grayscale'
                                        }
                                    ${isMilestone && !isUnlocked ? 'bg-yellow-100 border-yellow-300 text-yellow-600' : ''}
                                `}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    {isUnlocked ? (
                                        <span className="font-bold text-sm">{level}</span>
                                    ) : (
                                        <Lock className="w-4 h-4 opacity-50" />
                                    )}

                                    {isMilestone && !isUnlocked && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 border-2 border-background">
                                            <Gift className="w-3 h-3 text-yellow-900" />
                                        </div>
                                    )}
                                </motion.div>

                                <div className="flex flex-col items-center gap-0.5 opacity-80">
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider
                                    ${isCurrent ? 'text-primary' : 'text-muted-foreground'}
                                `}>
                                        {isCurrent ? 'Atual' : isUnlocked ? 'Feito' : `Nível ${level}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
        </div>
    );
}
