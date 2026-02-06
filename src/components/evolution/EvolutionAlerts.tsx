import React, { memo } from 'react';
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
    Clock,
    FileText,
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  target_date: string;
  status: string;
}

interface Pathology {
  id: string;
  name: string;
  code?: string;
}

interface EvolutionAlertsProps {
    overdueGoals: Goal[];
    painScale: { level: number; location?: string; character?: string };
    painTrend: 'worsening' | 'improving' | 'stable' | 'fluctuating' | null;
    upcomingGoals: Goal[];
    daysSinceLastEvolution: number | null;
    sessionDurationMinutes: number;
    sessionLongAlertShown: boolean;
    activePathologies: Pathology[];
    previousEvolutionsCount: number;
    onTabChange: (tab: string) => void;
}

export const EvolutionAlerts: React.FC<EvolutionAlertsProps> = memo(({
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

    const criticalAlerts: React.ReactNode[] = [];
    const warningAlerts: React.ReactNode[] = [];
    const infoAlerts: React.ReactNode[] = [];
    const successAlerts: React.ReactNode[] = [];

    // CRÍTICOS
    if (overdueGoals.length > 0) {
        criticalAlerts.push(
            <Alert key="overdue" variant="destructive" className="animate-pulse border-red-600 border-l-4 py-4" role="alert">
                <CalendarX className="h-5 w-5" aria-hidden />
                <AlertTitle className="text-base font-bold">Metas Vencidas</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed mt-1">
                    {overdueGoals.length} meta(s) vencida(s). Reavalie o plano de tratamento e ajuste as datas na aba Tratamento.{' '}
                    <button
                        type="button"
                        onClick={() => onTabChange('tratamento')}
                        className="underline font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Ir para aba Tratamento"
                    >
                        Ir para Tratamento
                    </button>
                </AlertDescription>
            </Alert>
        );
    }
    if (painScale.level >= 7) {
        criticalAlerts.push(
            <Alert key="pain-high" variant="destructive" className="animate-pulse border-l-4 py-4" role="alert">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                <AlertTitle className="text-base font-bold">Nível de Dor Elevado</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed mt-1">
                    Paciente reportando dor {painScale.level}/10.
                    {painTrend === 'worsening' && ' Tendência de PIORA nas últimas sessões.'}
                    {painTrend === 'improving' && ' Tendência de MELHORA nas últimas sessões.'}
                    Considere revisar o plano de tratamento.
                </AlertDescription>
            </Alert>
        );
    }
    if (daysSinceLastEvolution !== null && daysSinceLastEvolution > 21) {
        criticalAlerts.push(
            <Alert key="long-period" className="border-red-500/50 bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 py-4" role="alert">
                <FileText className="h-5 w-5 text-red-600" aria-hidden />
                <AlertTitle className="text-base font-bold text-red-800 dark:text-red-200">Longo Período Sem Evolução</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-red-700 dark:text-red-300 mt-1">
                    A última evolução foi registrada há {daysSinceLastEvolution} dias.{' '}
                    <button
                        type="button"
                        onClick={() => onTabChange('historico')}
                        className="underline font-bold hover:text-red-900 dark:hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Ir para aba Histórico e revisar o histórico completo"
                    >
                        Revise o histórico completo →
                    </button>
                </AlertDescription>
            </Alert>
        );
    }

    // AVISOS
    if (painScale.level >= 4 && painScale.level < 7 && painTrend === 'worsening') {
        warningAlerts.push(
            <Alert key="pain-trend" className="border-rose-500/50 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-l-rose-500 py-4" role="alert">
                <HeartPulse className="h-5 w-5 text-rose-600" />
                <AlertTitle className="text-base font-bold text-rose-800 dark:text-red-200">Tendência de Aumento da Dor</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-rose-700 dark:text-red-300 mt-1">
                    Dor atual: {painScale.level}/10. A tendência nas últimas sessões é de PIORA. Avalie a necessidade de ajustar o tratamento.
                </AlertDescription>
            </Alert>
        );
    }
    if (upcomingGoals.length > 0) {
        warningAlerts.push(
            <Alert key="upcoming" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500 py-4" role="alert">
                <Clock className="h-5 w-5 text-amber-600" aria-hidden />
                <AlertTitle className="text-base font-bold text-amber-800 dark:text-red-200">Metas Próximas do Vencimento</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-amber-700 dark:text-red-300 mt-1">
                    {upcomingGoals.length} meta(s) venc(em) em até 3 dias.{' '}
                    <button
                        type="button"
                        onClick={() => onTabChange('tratamento')}
                        className="underline font-bold hover:text-amber-900 dark:hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Ir para aba Tratamento para acompanhar o progresso"
                    >
                        Acompanhe o progresso →
                    </button>
                </AlertDescription>
            </Alert>
        );
    }

    // INFORMATIVOS
    if (sessionDurationMinutes > 60 && sessionDurationMinutes <= 90 && !sessionLongAlertShown) {
        infoAlerts.push(
            <Alert key="session-60" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500 py-4" role="alert">
                <Timer className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-base font-bold text-blue-800 dark:text-blue-200">Sessão em Andamento</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-blue-700 dark:text-blue-300 mt-1">
                    Tempo de sessão: {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min.
                </AlertDescription>
            </Alert>
        );
    }
    if (sessionDurationMinutes > 90 && !sessionLongAlertShown) {
        infoAlerts.push(
            <Alert key="session-90" className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/20 animate-pulse border-l-4 border-l-purple-500 py-4" role="alert">
                <Timer className="h-5 w-5 text-purple-600" />
                <AlertTitle className="text-base font-bold text-purple-800 dark:text-purple-200">Sessão Prolongada</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-purple-700 dark:text-purple-300 mt-1">
                    Esta sessão já dura {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min. Considere fazer uma pausa ou concluir o atendimento.
                </AlertDescription>
            </Alert>
        );
    }
    if (activePathologies.length >= 3) {
        infoAlerts.push(
            <Alert key="complexity" className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500 py-4" role="alert">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <AlertTitle className="text-base font-bold text-orange-800 dark:text-orange-200">Complexidade Clínica Elevada</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-orange-700 dark:text-orange-300 mt-1">
                    Paciente com {activePathologies.length} patologia(s) ativa(s). Requer atenção especial e planejamento cuidadoso do tratamento.{' '}
                    <button
                        type="button"
                        onClick={() => onTabChange('tratamento')}
                        className="underline font-bold hover:text-orange-900 dark:hover:text-orange-100 ml-1 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Ir para aba Tratamento para ver detalhes"
                    >
                        Ver detalhes →
                    </button>
                </AlertDescription>
            </Alert>
        );
    }

    // POSITIVOS
    if (painTrend === 'improving' && painScale.level < 4 && previousEvolutionsCount >= 2) {
        successAlerts.push(
            <Alert key="progress" className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 py-4" role="alert">
                <HeartPulse className="h-5 w-5 text-emerald-600" />
                <AlertTitle className="text-base font-bold text-emerald-800 dark:text-emerald-200">Progresso Positivo!</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-300 mt-1">
                    Excelente! O paciente mostra tendência de melhora na última sessão. Continue com o tratamento atual.
                </AlertDescription>
            </Alert>
        );
    }

    const allAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts, ...successAlerts];
    if (allAlerts.length === 0) return null;

    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            role="region"
            aria-label="Alertas da evolução"
        >
            {allAlerts}
        </div>
    );
});

EvolutionAlerts.displayName = 'EvolutionAlerts';
