/**
 * PredictiveAnalytics - Análise preditiva de agendamentos
 *
 * Features:
 * - Previsão de comparecimento (no-show prediction)
 * - Recomendação de horários ótimos
 * - Detecção de padrões de cancelamento
 * - Análise de duração de sessões
 * - Sugestão de preenchimento de horários
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Zap,
  Target,
} from 'lucide-react';
import { format, differenceInDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface AttendancePrediction {
  appointmentId: string;
  patientId: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  factors: {
    historyNoShow?: number;
    daysSinceLastBooking?: number;
    timeOfDay?: string;
    weatherCondition?: string;
    dayOfWeek?: string;
  };
  recommendation: 'confirm' | 'reminder' | 'double-book' | 'cancel';
}

export interface TimeSlotRecommendation {
  date: Date;
  time: string;
  score: number;
  fillRate: number;
  predictedOccupancy: number;
  reasons: string[];
}

export interface CancellationPattern {
  patientId: string;
  cancellationRate: number;
  commonReasons: string[];
  commonCancellationTime: string;
  typicalNoticeHours: number;
}

export interface DurationAnalysis {
  service: string;
  avgDuration: number;
  medianDuration: number;
  stdDev: number;
  recommendedDuration: number;
}

// ============================================================================
// COMPONENTE DE PREVISÃO DE COMPARECIMENTO
// ============================================================================

interface AttendancePredictorProps {
  appointments: Appointment[];
  date?: Date;
}

const AttendancePredictor: React.FC<AttendancePredictorProps> = ({
  appointments,
  date = new Date(),
}) => {
  const predictions = useMemo(() => {
    // Agrupar por paciente
    const patientAppointments = appointments.reduce((acc, apt) => {
      const patientId = apt.patientId || apt.patient?.id || '';
      if (!acc[patientId]) {
        acc[patientId] = [];
      }
      acc[patientId].push(apt);
      return acc;
    }, {} as Record<string, Appointment[]>);

    return Object.entries(patientAppointments).map(([patientId, apts]) => {
      // Calcular taxa de no-show histórico
      const completed = apts.filter((a) => a.status === 'completed').length;
      const noShows = apts.filter((a) => a.status === 'no-show').length;
      const total = completed + noShows;
      const historyNoShow = total > 0 ? noShows / total : 0;

      // Calcular dias desde último agendamento
      const sortedByDate = [...apts].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      const lastBooking = sortedByDate[0];
      const daysSinceLast = lastBooking
        ? differenceInDays(date, new Date(lastBooking.startTime))
        : 999;

      // Encontrar horário preferido do paciente
      const hourCounts: Record<string, number> = {};
      apts.forEach((a) => {
        const hour = new Date(a.startTime).getHours().toString();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const preferredHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      // Calcular probabilidade
      let probability = 0.1; // Base de 10% chance de no-show

      // Fator: Histórico de no-show (pesado negativamente)
      if (historyNoShow > 0) {
        probability += historyNoShow * 0.6;
      }

      // Fator: Dias desde último agendamento
      // Pacientes recentes tendem a ir mais
      if (daysSinceLast < 7) {
        probability -= 0.1;
      } else if (daysSinceLast > 30) {
        probability += 0.15;
      }

      // Fator: Horário
      // Manhã tem menor taxa de no-show
      const appointmentHour = date.getHours();
      if (appointmentHour < 12) {
        probability -= 0.05;
      } else if (appointmentHour >= 18) {
        probability += 0.1;
      }

      // Fator: Dia da semana
      // Segunda-feira tem mais no-show
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 1) { // Segunda
        probability += 0.1;
      } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta/Sexta
        probability -= 0.05;
      }

      probability = Math.max(0, Math.min(1, probability));

      // Calcular confiança da predição
      const confidence = Math.min(1, 0.5 + (total * 0.05));

      // Recomendação
      let recommendation: AttendancePrediction['recommendation'] = 'confirm';
      if (probability > 0.6) {
        recommendation = 'double-book';
      } else if (probability > 0.4) {
        recommendation = 'reminder';
      } else if (probability > 0.8) {
        recommendation = 'cancel';
      }

      return {
        appointmentId: '',
        patientId,
        probability: 1 - probability, // Probabilidade de comparecimento
        confidence,
        factors: {
          historyNoShow,
          daysSinceLastBooking,
          timeOfDay: preferredHour,
          dayOfWeek: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek],
        },
        recommendation,
      };
    });
  }, [appointments, date]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = predictions.length;
    const highRisk = predictions.filter((p) => p.probability < 0.5).length;
    const mediumRisk = predictions.filter((p) => p.probability >= 0.5 && p.probability < 0.7).length;
    const lowRisk = predictions.filter((p) => p.probability >= 0.7).length;

    return { total, highRisk, mediumRisk, lowRisk };
  }, [predictions]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Análise Preditiva</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(date, "dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">Alto risco</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">
            {stats.highRisk}
          </div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Médio risco</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {stats.mediumRisk}
          </div>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">Baixo risco</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {stats.lowRisk}
          </div>
        </div>
        <div className="p-3 bg-muted/30 border rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Total pacientes</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
      </div>

      {/* Lista de predições */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Predições de Comparecimento
        </h3>

        {predictions.map((prediction) => (
          <div
            key={prediction.patientId}
            className={cn(
              'p-4 border rounded-lg',
              prediction.probability < 0.5 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
              prediction.probability < 0.7 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
              'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {prediction.probability < 0.5 && (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                {prediction.probability >= 0.7 && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="font-medium">
                  Paciente {prediction.patientId.slice(0, 8)}...
                </span>
              </div>
              <div className="text-right">
                <div className={cn(
                  'text-lg font-bold',
                  prediction.probability < 0.5 ? 'text-red-600' :
                  prediction.probability < 0.7 ? 'text-amber-600' :
                  'text-green-600'
                )}>
                  {Math.round(prediction.probability * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  chance de comparecer
                </div>
              </div>
            </div>

            {/* Fatores */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Horário pref:</span>
                <span className="font-medium">{prediction.factors.timeOfDay || 'N/A'}h</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Dia sem:</span>
                <span className="font-medium">{prediction.factors.dayOfWeek}</span>
              </div>
              {prediction.factors.historyNoShow !== undefined && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Histórico no-show:</span>
                  <span className="font-medium">{Math.round(prediction.factors.historyNoShow * 100)}%</span>
                </div>
              )}
              {prediction.factors.daysSinceLastBooking !== undefined && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Última consulta:</span>
                  <span className="font-medium">{prediction.factors.daysSinceLastBooking} dias</span>
                </div>
              )}
            </div>

            {/* Recomendação */}
            <div className={cn(
              'mt-3 pt-3 border-t flex items-center gap-2',
              prediction.recommendation === 'double-book' && 'border-red-200 dark:border-red-800',
              prediction.recommendation === 'reminder' && 'border-amber-200 dark:border-amber-800',
              prediction.recommendation === 'cancel' && 'border-red-300 dark:border-red-700',
              prediction.recommendation === 'confirm' && 'border-green-200 dark:border-green-800'
            )}>
              {prediction.recommendation === 'double-book' && (
                <>
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">
                    Sugestão: Considerar double-booking para este horário
                  </span>
                </>
              )}
              {prediction.recommendation === 'reminder' && (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">
                    Sugestão: Enviar lembrete 24h antes
                  </span>
                </>
              )}
              {prediction.recommendation === 'cancel' && (
                <>
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm">
                    Sugestão: Considerar cancelamento preventivo
                  </span>
                </>
              )}
              {prediction.recommendation === 'confirm' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Paciente com alta probabilidade de comparecimento
                  </span>
                </>
              )}
            </div>

            {/* Confiança da predição */}
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>Confiança da IA: {Math.round(prediction.confidence * 100)}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    prediction.confidence > 0.8 ? 'bg-green-500' :
                    prediction.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${prediction.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE DE RECOMENDAÇÃO DE HORÁRIOS
// ============================================================================

interface SlotRecommenderProps {
  appointments: Appointment[];
  startDate: Date;
  endDate: Date;
}

export const SlotRecommender: React.FC<SlotRecommenderProps> = ({
  appointments,
  startDate,
  endDate,
}) => {
  const recommendations = useMemo(() => {
    const days = Math.ceil(differenceInDays(endDate, startDate));
    const result: TimeSlotRecommendation[] = [];

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Calcular ocupação por hora
      const hourOccupancy: Record<string, { total: number; filled: number }> = {};

      appointments.forEach((apt) => {
        const aptDate = new Date(apt.startTime);
        if (differenceInDays(aptDate, currentDate) === 0) {
          const hour = aptDate.getHours().toString();
          if (!hourOccupancy[hour]) {
            hourOccupancy[hour] = { total: 1, filled: 0 };
          }
          hourOccupancy[hour].total++;
          if (apt.status !== 'cancelled' && apt.status !== 'no-show') {
            hourOccupancy[hour].filled++;
          }
        }
      });

      // Gerar recomendações por hora
      for (let hour = 6; hour <= 21; hour++) {
        const hourKey = hour.toString();
        const occupancy = hourOccupancy[hourKey] || { total: 1, filled: 0 };

        // Calcular score
        let score = 100;
        const fillRate = occupancy.total > 0 ? occupancy.filled / occupancy.total : 0;

        // Horários com baixa ocupação têm score mais alto
        score -= fillRate * 50;

        // Horários de manhã têm leve preferência
        if (hour < 12) {
          score += 10;
        }

        // Horários no meio da manhã ou fim da tarde têm preferência
        if (hour >= 9 && hour <= 11) {
          score += 15;
        } else if (hour >= 14 && hour <= 17) {
          score += 10;
        }

        // Evitar horários de almoço
        if (hour >= 12 && hour <= 13) {
          score -= 30;
        }

        const reasons: string[] = [];
        if (fillRate < 0.3) reasons.push('Baixa ocupação');
        if (hour >= 9 && hour <= 11) reasons.push('Horário preferido');
        if (fillRate === 0) reasons.push('Vago');

        result.push({
          date: currentDate,
          time: `${String(hour).padStart(2, '0')}:00`,
          score: Math.max(0, score),
          fillRate,
          predictedOccupancy: fillRate,
          reasons: reasons.length > 0 ? reasons : ['Disponível'],
        });
      }
    }

    // Retornar top 20 recomendações
    return result
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [appointments, startDate, endDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Horários Recomendados</h3>
      </div>

      {/* Lista de recomendações */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {recommendations.map((rec, i) => (
          <button
            key={i}
            className={cn(
              'p-3 border rounded-lg text-left transition-all hover:shadow-md',
              rec.score >= 70 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              rec.score >= 50 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
              rec.score >= 30 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
              'bg-muted/30'
            )}
          >
            <div className="font-semibold mb-1">
              {rec.time}
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              {format(rec.date, 'EEE, dd MMM', { locale: ptBR })}
            </div>
            <div className="text-xs">
              {rec.reasons.slice(0, 2).map((r, j) => (
                <span key={j} className="inline-block">
                  <span className="text-primary">{r}</span>
                  {j < rec.reasons.length - 1 && j < 1 && ', '}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${rec.fillRate * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(rec.fillRate * 100)}%
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-sm mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Muito recomendado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Recomendado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded" />
          <span>Disponível</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT DO COMPONENTE PRINCIPAL
// ============================================================================

export const PredictiveAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'slots'>('attendance');

  // Dados de exemplo (substituir por dados reais)
  const mockAppointments: Appointment[] = [];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeTab === 'attendance'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          Previsão de Comparecimento
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeTab === 'slots'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          Recomendação de Horários
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'attendance' && (
        <AttendancePredictor appointments={mockAppointments} />
      )}

      {activeTab === 'slots' && (
        <SlotRecommender
          appointments={mockAppointments}
          startDate={new Date()}
          endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        />
      )}
    </div>
  );
};

PredictiveAnalytics.displayName = 'PredictiveAnalytics';
