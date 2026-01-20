import React from 'react';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    AlertTriangle,
    Timer,
    CalendarX,
    HeartPulse,
    TrendingUp,
    Brain,
    Clock,
    FileText
} from 'lucide-react';

interface EvolutionAlertsProps {
    overdueGoals: any[];
    painScale: { level: number; location?: string; character?: string };
    painTrend: 'worsening' | 'improving' | 'stable' | 'fluctuating' | null;
    upcomingGoals: any[];
    daysSinceLastEvolution: number | null;
    sessionDurationMinutes: number;
    sessionLongAlertShown: boolean;
    activePathologies: any[];
    previousEvolutionsCount: number;
    onTabChange: (tab: string) => void;
}

export const EvolutionAlerts: React.FC<EvolutionAlertsProps> = ({
    overdueGoals,
    painScale,
    painTrend,
    upcomingGoals,
    daysSinceLastEvolution,
    sessionDurationMinutes,
    sessionLongAlertShown,
    activePathologies,
    previousEvolutionsCount,
    onTabChange,
}) => {
    return (
        <div className="space-y-4">
            {/* Alerta CRÍTICO: Metas Vencidas */}
            {overdueGoals.length > 0 && (
                <Alert variant="destructive" className="animate-pulse border-red-600">
                    <CalendarX className="h-4 w-4" />
                    <AlertTitle className="text-sm font-semibold">Metas Vencidas</AlertTitle>
                    <AlertDescription className="text-xs">
                        {overdueGoals.length} meta(s) vencida(s). Reavalie o plano de tratamento e ajuste as datas na aba Tratamento.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Nível de Dor Alto */}
            {painScale.level >= 7 && (
                <Alert variant="destructive" className="animate-pulse">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm font-semibold">Nível de Dor Elevado</AlertTitle>
                    <AlertDescription className="text-xs">
                        Paciente reportando dor {painScale.level}/10.
                        {painTrend === 'worsening' && ' ⚠️ Tendência de PIORA nas últimas sessões.'}
                        {painTrend === 'improving' && ' ✓ Tendência de MELHORA nas últimas sessões.'}
                        Considere revisar o plano de tratamento.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Nível de Dor Moderado com Tendência de Piora */}
            {painScale.level >= 4 && painScale.level < 7 && painTrend === 'worsening' && (
                <Alert className="border-rose-500/50 bg-rose-50 dark:bg-rose-950/20">
                    <HeartPulse className="h-4 w-4 text-rose-600" />
                    <AlertTitle className="text-sm font-semibold text-rose-800 dark:text-rose-200">Tendência de Aumento da Dor</AlertTitle>
                    <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
                        Dor atual: {painScale.level}/10. A tendência nas últimas sessões é de PIORA. Avalie a necessidade de ajustar o tratamento.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Metas Próximas do Vencimento */}
            {upcomingGoals.length > 0 && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">Metas Próximas do Vencimento</AlertTitle>
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        {upcomingGoals.length} meta(s) venc(em) em até 3 dias.{' '}
                        <button
                            onClick={() => onTabChange('tratamento')}
                            className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                        >
                            Acompanhe o progresso →
                        </button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Muito Tempo Desde Última Evolução */}
            {daysSinceLastEvolution !== null && daysSinceLastEvolution > 21 && (
                <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
                    <FileText className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-sm font-semibold text-red-800 dark:text-red-200">Longo Período Sem Evolução</AlertTitle>
                    <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                        A última evolução foi registrada há {daysSinceLastEvolution} dias.{' '}
                        <button
                            onClick={() => onTabChange('historico')}
                            className="underline font-medium hover:text-red-900 dark:hover:text-red-100"
                        >
                            Revise o histórico completo →
                        </button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Sessão Prolongada */}
            {sessionDurationMinutes > 60 && sessionDurationMinutes <= 90 && !sessionLongAlertShown && (
                <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                    <Timer className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-sm font-semibold text-blue-800 dark:text-blue-200">Sessão em Andamento</AlertTitle>
                    <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                        Tempo de sessão: {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Sessão Muito Prolongada */}
            {sessionDurationMinutes > 90 && !sessionLongAlertShown && (
                <Alert className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/20 animate-pulse">
                    <Timer className="h-4 w-4 text-purple-600" />
                    <AlertTitle className="text-sm font-semibold text-purple-800 dark:text-purple-200">Sessão Prolongada</AlertTitle>
                    <AlertDescription className="text-xs text-purple-700 dark:text-purple-300">
                        Esta sessão já dura {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min. Considere fazer uma pausa ou concluir o atendimento.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Complexidade Clínica Elevada */}
            {activePathologies.length >= 3 && (
                <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-sm font-semibold text-orange-800 dark:text-orange-200">Complexidade Clínica Elevada</AlertTitle>
                    <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
                        Paciente com {activePathologies.length} patologia(s) ativa(s). Requer atenção especial e planejamento cuidadoso do tratamento.
                        <button
                            onClick={() => onTabChange('tratamento')}
                            className="underline font-medium hover:text-orange-900 dark:hover:text-orange-100 ml-1"
                        >
                            Ver detalhes →
                        </button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Boa Notícia - Tendência de Melhora */}
            {painTrend === 'improving' && painScale.level < 4 && previousEvolutionsCount >= 2 && (
                <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Progresso Positivo!</AlertTitle>
                    <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-300">
                        Excelente! O paciente mostra tendência de melhora na última sessão. Continue com o tratamento atual.
                    </AlertDescription>
                </Alert>
            )}

            {/* Alerta: Primeira Evolução do Paciente */}
            {previousEvolutionsCount === 0 && (
                <Alert className="border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/20">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    <AlertTitle className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Primeira Evolução</AlertTitle>
                    <AlertDescription className="text-xs text-indigo-700 dark:text-indigo-300">
                        Esta é a primeira evolução do paciente. Registre um SOAP completo para estabelecer uma linha de base sólida.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};
