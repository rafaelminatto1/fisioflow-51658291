import React from 'react';
import { FileText, Target, TrendingUp, Activity, BarChart3, CheckCircle2 } from 'lucide-react';

interface EvolutionStatsProps {
    stats: {
        totalEvolutions: number;
        completedGoals: number;
        totalGoals: number;
        avgGoalProgress: number;
        activePathologiesCount: number;
        totalMeasurements: number;
        completionRate: number;
    };
}

export function EvolutionStats({ stats }: EvolutionStatsProps) {
    return (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
            {[
                { label: 'Evoluções', value: stats.totalEvolutions, icon: FileText, color: 'blue' },
                { label: 'Metas', value: `${stats.completedGoals}/${stats.totalGoals}`, icon: Target, color: 'green' },
                { label: 'Progresso', value: `${stats.avgGoalProgress}%`, icon: TrendingUp, color: 'purple' },
                { label: 'Patologias', value: stats.activePathologiesCount, icon: Activity, color: 'orange' },
                { label: 'Medições', value: stats.totalMeasurements, icon: BarChart3, color: 'cyan' },
                { label: 'Sucesso', value: `${stats.completionRate}%`, icon: CheckCircle2, color: 'emerald' },
            ].map((stat, idx) => (
                <div
                    key={idx}
                    className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 hover:bg-card/80 hover:shadow-md transition-all cursor-default"
                >
                    <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{stat.label}</p>
                            <p className={`text-sm sm:text-lg font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mt-0.5 truncate`}>{stat.value}</p>
                        </div>
                        <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${stat.color}-500/40 group-hover:text-${stat.color}-500/60 transition-colors flex-shrink-0`} />
                    </div>
                </div>
            ))}
        </div>
    );
}
