import React, { memo } from 'react';
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

const STAT_CONFIG = [
    { label: 'Evoluções', getVal: (s: EvolutionStatsProps['stats']) => s.totalEvolutions, icon: FileText, colorClasses: { bg: 'from-blue-500/5', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500/40 group-hover:text-blue-500/60' } },
    { label: 'Metas', getVal: (s: EvolutionStatsProps['stats']) => `${s.completedGoals}/${s.totalGoals}`, icon: Target, colorClasses: { bg: 'from-green-500/5', text: 'text-green-600 dark:text-green-400', icon: 'text-green-500/40 group-hover:text-green-500/60' } },
    { label: 'Progresso', getVal: (s: EvolutionStatsProps['stats']) => `${s.avgGoalProgress}%`, icon: TrendingUp, colorClasses: { bg: 'from-purple-500/5', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500/40 group-hover:text-purple-500/60' } },
    { label: 'Patologias', getVal: (s: EvolutionStatsProps['stats']) => s.activePathologiesCount, icon: Activity, colorClasses: { bg: 'from-orange-500/5', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500/40 group-hover:text-orange-500/60' } },
    { label: 'Medições', getVal: (s: EvolutionStatsProps['stats']) => s.totalMeasurements, icon: BarChart3, colorClasses: { bg: 'from-cyan-500/5', text: 'text-cyan-600 dark:text-cyan-400', icon: 'text-cyan-500/40 group-hover:text-cyan-500/60' } },
    { label: 'Sucesso', getVal: (s: EvolutionStatsProps['stats']) => `${s.completionRate}%`, icon: CheckCircle2, colorClasses: { bg: 'from-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500/40 group-hover:text-emerald-500/60' } },
] as const;

export const EvolutionStats = memo(({ stats }: EvolutionStatsProps) => {
    return (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
            {STAT_CONFIG.map((config, idx) => (
                <div
                    key={idx}
                    className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 hover:bg-card/80 hover:shadow-md transition-all cursor-default"
                >
                    <div className={ `absolute inset-0 bg-gradient-to-br ${config.colorClasses.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity` } />
                    <div className="relative flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{config.label}</p>
                            <p className={`text-sm sm:text-lg font-bold ${config.colorClasses.text} mt-0.5 truncate`}>{config.getVal(stats)}</p>
                        </div>
                        <config.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${config.colorClasses.icon} transition-colors flex-shrink-0`} />
                    </div>
                </div>
            ))}
        </div>
    );
});

EvolutionStats.displayName = 'EvolutionStats';
