import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import * as Icons from 'lucide-react';
import { DailyQuestItem } from '@/hooks/useGamification';

interface DailyQuestsProps {
    quests: DailyQuestItem[];
    onComplete: (questId: string) => void;
    isLoading?: boolean;
}

export function DailyQuests({ quests, onComplete, isLoading }: DailyQuestsProps) {
    const completedCount = quests.filter(q => q.completed).length;
    const totalQuests = quests.length;
    const progress = totalQuests > 0 ? (completedCount / totalQuests) * 100 : 0;

    if (isLoading) {
        return (
            <Card className="h-full border-border/60 bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Missões Diárias
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-border/60 bg-gradient-to-b from-background to-muted/20 hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Missões Diárias
                    </CardTitle>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full border">
                        {completedCount}/{totalQuests} Completas
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                    <div
                        className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[250px] px-6 pb-4">
                    <div className="space-y-3">
                        {quests.length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground py-8">
                                Nenhuma missão disponível para hoje.
                            </p>
                        ) : (
                            quests.map((quest) => {
                                const IconComponent = (Icons as any)[quest.icon] || Icons.Star;

                                return (
                                    <div
                                        key={quest.id}
                                        className={cn(
                                            "group flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                                            quest.completed
                                                ? "bg-primary/5 border-primary/20"
                                                : "bg-card hover:bg-muted/50 border-border/50 hover:border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-full transition-colors",
                                                quest.completed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                                            )}>
                                                <IconComponent className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className={cn(
                                                    "text-sm font-medium transition-colors",
                                                    quest.completed && "text-muted-foreground line-through"
                                                )}>
                                                    {quest.title}
                                                </p>
                                                {quest.description && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {quest.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full">
                                                +{quest.xp} XP
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={quest.completed}
                                                            onClick={() => onComplete(quest.id)}
                                                            className={cn(
                                                                "h-8 w-8 rounded-full transition-all",
                                                                quest.completed
                                                                    ? "text-primary hover:text-primary hover:bg-transparent"
                                                                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                            )}
                                                        >
                                                            {quest.completed ? (
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            ) : (
                                                                <Circle className="h-5 w-5" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{quest.completed ? "Concluída" : "Completar Missão"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
