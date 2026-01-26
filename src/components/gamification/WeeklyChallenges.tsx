import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, Trophy, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays, differenceInHours, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyChallenge {
    id: string;
    title: string;
    description: string | null;
    xp_reward: number;
    point_reward: number;
    start_date: string;
    end_date: string;
    target: { type: string; count: number };
    icon: string | null;
}

interface PatientChallenge {
    challenge_id: string;
    progress: number;
    completed: boolean;
}

interface WeeklyChallengesProps {
    patientId: string;
}

export default function WeeklyChallenges({ patientId }: WeeklyChallengesProps) {
    // Fetch active challenges
    const { data: challenges = [], isLoading } = useQuery({
        queryKey: ['active-challenges'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('weekly_challenges')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .order('end_date', { ascending: true });

            if (error) throw error;
            return data as WeeklyChallenge[];
        }
    });

    // Fetch patient's progress on challenges
    const { data: patientProgress = [] } = useQuery({
        queryKey: ['patient-challenges', patientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patient_challenges')
                .select('challenge_id, progress, completed')
                .eq('patient_id', patientId);

            if (error) throw error;
            return data as PatientChallenge[];
        },
        enabled: !!patientId
    });

    const getProgress = (challengeId: string) => {
        return patientProgress.find(p => p.challenge_id === challengeId);
    };

    const getTimeRemaining = (endDate: string) => {
        const end = parseISO(endDate);
        const now = new Date();
        const daysLeft = differenceInDays(end, now);
        const hoursLeft = differenceInHours(end, now) % 24;

        if (daysLeft > 0) {
            return `${daysLeft}d ${hoursLeft}h restantes`;
        } else if (hoursLeft > 0) {
            return `${hoursLeft}h restantes`;
        }
        return 'Último dia!';
    };

    if (isLoading) {
        return (
            <Card className="border-none shadow-sm">
                <CardContent className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                </CardContent>
            </Card>
        );
    }

    if (challenges.length === 0) {
        return null; // Don't show if no active challenges
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-yellow-50">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-5 w-5 text-orange-500" />
                    Desafios da Semana
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                {challenges.map((challenge, index) => {
                    const progress = getProgress(challenge.id);
                    const progressPercent = progress
                        ? Math.min((progress.progress / challenge.target.count) * 100, 100)
                        : 0;
                    const isCompleted = progress?.completed || false;

                    return (
                        <motion.div
                            key={challenge.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                                p-4 rounded-xl border transition-all
                                ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white hover:border-orange-200'}
                            `}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-semibold text-sm ${isCompleted && 'text-green-700'}`}>
                                            {challenge.title}
                                        </h4>
                                        {isCompleted && (
                                            <Trophy className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>

                                    {/* Progress Bar */}
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                {progress?.progress || 0} / {challenge.target.count}
                                            </span>
                                            <span className={isCompleted ? 'text-green-600 font-medium' : 'text-orange-600'}>
                                                {isCompleted ? 'Concluído!' : `${Math.round(progressPercent)}%`}
                                            </span>
                                        </div>
                                        <Progress
                                            value={progressPercent}
                                            className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                                            +{challenge.xp_reward} XP
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px]">
                                            +{challenge.point_reward} pts
                                        </Badge>
                                    </div>
                                    {!isCompleted && (
                                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {getTimeRemaining(challenge.end_date)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
