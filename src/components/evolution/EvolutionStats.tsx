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
    /** Layout compacto para cards em linha - 2 colunas, fontes maiores, dados visíveis */
    compact?: boolean;
    /** Layout vertical para card grande - stats em lista com progress indicators */
    vertical?: boolean;
}

const STAT_CONFIG = [
    { label: 'Evoluções', getVal: (s: EvolutionStatsProps['stats']) => s.totalEvolutions, icon: FileText, color: 'blue' },
    { label: 'Metas', getVal: (s: EvolutionStatsProps['stats']) => `${s.completedGoals}/${s.totalGoals}`, icon: Target, color: 'green' },
    { label: 'Progresso', getVal: (s: EvolutionStatsProps['stats']) => `${s.avgGoalProgress}%`, icon: TrendingUp, color: 'purple' },
    { label: 'Patologias', getVal: (s: EvolutionStatsProps['stats']) => s.activePathologiesCount, icon: Activity, color: 'orange' },
    { label: 'Medições', getVal: (s: EvolutionStatsProps['stats']) => s.totalMeasurements, icon: BarChart3, color: 'cyan' },
    { label: 'Sucesso', getVal: (s: EvolutionStatsProps['stats']) => `${s.completionRate}%`, icon: CheckCircle2, color: 'emerald' },
] as const;

const COLOR_CLASSES: Record<string, {
    bg: string;
    text: string;
    icon: string;
    border: string;
    progress: string;
}> = {
    blue: { bg: 'from-blue-500/5', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500/30 group-hover:text-blue-500/50', border: 'border-blue-500/20', progress: 'bg-blue-500' },
    green: { bg: 'from-green-500/5', text: 'text-green-600 dark:text-green-400', icon: 'text-green-500/30 group-hover:text-green-500/50', border: 'border-green-500/20', progress: 'bg-green-500' },
    purple: { bg: 'from-purple-500/5', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500/30 group-hover:text-purple-500/50', border: 'border-purple-500/20', progress: 'bg-purple-500' },
    orange: { bg: 'from-orange-500/5', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500/30 group-hover:text-orange-500/50', border: 'border-orange-500/20', progress: 'bg-orange-500' },
    cyan: { bg: 'from-cyan-500/5', text: 'text-cyan-600 dark:text-cyan-400', icon: 'text-cyan-500/30 group-hover:text-cyan-500/50', border: 'border-cyan-500/20', progress: 'bg-cyan-500' },
    emerald: { bg: 'from-emerald-500/5', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500/30 group-hover:text-emerald-500/50', border: 'border-emerald-500/20', progress: 'bg-emerald-500' },
};

export const EvolutionStats = memo(({ stats, compact = false, vertical = false }: EvolutionStatsProps) => {
    // Layout vertical para o card grande de Resumo - 2 linhas com 3 itens cada
    if (vertical) {
        return (
            <div className="grid grid-cols-3 gap-3">
                {STAT_CONFIG.map((config, idx) => {
                    const colors = COLOR_CLASSES[config.color];
                    const rawValue = config.getVal(stats);
                    const isPercent = typeof rawValue === 'string' && rawValue.includes('%');
                    const numValue = isPercent ? parseInt(rawValue) : typeof rawValue === 'number' ? rawValue : 0;

                    return (
                        <div
                            key={idx}
                            className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-card/30 backdrop-blur-sm p-3 hover:bg-card/50 transition-all`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-xl bg-gradient-to-br ${colors.bg}`}>
                                        <config.icon className={`h-4 w-4 ${colors.text}`} />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
                                </div>
                                <span className={`text-xl font-bold ${colors.text}`}>{rawValue}</span>
                            </div>
                            {isPercent && (
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${colors.progress} rounded-full transition-all duration-500`}
                                        style={{ width: `${Math.min(100, Math.max(0, numValue))}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Layout compacto (grid pequeno)
    return (
        <div className={compact
            ? 'grid grid-cols-2 gap-2'
            : 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4'
        }>
            {STAT_CONFIG.map((config, idx) => {
                const colors = COLOR_CLASSES[config.color];
                return (
                    <div
                        key={idx}
                        className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 hover:bg-card/80 hover:shadow-md transition-all cursor-default"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className="relative flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className={
                                    compact
                                        ? 'text-[11px] uppercase tracking-wider text-muted-foreground font-medium'
                                        : 'text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate'
                                }>{config.label}</p>
                                <p className={
                                    compact
                                        ? `text-base font-bold ${colors.text} mt-0.5`
                                        : `text-sm sm:text-lg font-bold ${colors.text} mt-0.5 truncate`
                                }>{config.getVal(stats)}</p>
                            </div>
                            <config.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon} transition-colors flex-shrink-0`} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

EvolutionStats.displayName = 'EvolutionStats';
