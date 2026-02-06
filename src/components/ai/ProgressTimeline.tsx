/**
 * ProgressTimeline - Componente de timeline de progresso do paciente
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

interface TimelineEntry {
  date: Date;
  type: 'assessment' | 'session' | 'milestone' | 'report';
  title: string;
  description?: string;
  score?: number;
  improvement?: number; // percentage
}

interface ProgressTimelineProps {
  className?: string;
}

export function ProgressTimeline({ className }: ProgressTimelineProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '180d' | 'all'>('90d');

  // Mock data - em produção viria do backend
  const timelineData: TimelineEntry[] = [
    {
      date: new Date(2026, 1, 5),
      type: 'assessment',
      title: 'Avaliação Inicial',
      description: 'ROM: Limitado em flexão de joelho esquerdo',
      score: 45,
    },
    {
      date: new Date(2026, 1, 10),
      type: 'session',
      title: 'Sessão 1',
      description: 'Exercícios de mobilização patelar',
    },
    {
      date: new Date(2026, 1, 15),
      type: 'milestone',
      title: 'Ganho de 10° na flexão',
      description: 'Paciente conseguiu flexionar a 55°',
      improvement: 22,
    },
    {
      date: new Date(2026, 1, 20),
      type: 'session',
      title: 'Sessão 5',
      description: 'Início de fortalecimento de quadríceps',
    },
    {
      date: new Date(2026, 1, 25),
      type: 'assessment',
      title: 'Reavaliação',
      description: 'ROM: Flexão de 85°, ainda com deficit',
      score: 65,
      improvement: 44,
    },
    {
      date: new Date(2026, 2, 1),
      type: 'milestone',
      title: 'Início da fase 2',
      description: 'Exercícios funcionais iniciados',
    },
    {
      date: new Date(2026, 2, 5),
      type: 'report',
      title: 'Relatório de Evolução',
      description: 'Melhora significativa documentada',
    },
  ];

  const getTypeColor = (type: TimelineEntry['type']) => {
    switch (type) {
      case 'assessment':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'session':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'milestone':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'report':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: TimelineEntry['type']) => {
    switch (type) {
      case 'assessment':
        return '📋';
      case 'session':
        return '🏃';
      case 'milestone':
        return '🏆';
      case 'report':
        return '📄';
      default:
        return '•';
    }
  };

  const calculateProgress = () => {
    const assessments = timelineData.filter((e) => e.type === 'assessment');
    if (assessments.length < 2) return null;

    const first = assessments[0].score || 0;
    const last = assessments[assessments.length - 1].score || 0;
    const improvement = ((last - first) / first) * 100;

    return { first, last, improvement };
  };

  const progress = calculateProgress();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Linha do Tempo - {patientName}</span>
          <div className="flex gap-1">
            {(['30d', '90d', '180d', 'all'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'all' ? 'Tudo' : period}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Summary */}
        {progress && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Progresso Total</div>
                <div className="text-2xl font-bold text-blue-600">
                  {progress.first} → {progress.last}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Melhoria</div>
                <div className={`text-2xl font-bold flex items-center gap-1 ${
                  progress.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {progress.improvement >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  {Math.abs(progress.improvement).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <ScrollArea className="h-[400px]">
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {timelineData.map((entry, index) => (
                <div key={index} className="relative flex gap-4">
                  {/* Ponto na timeline */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">{getTypeIcon(entry.type)}</span>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(
                          entry.type
                        )}`}
                      >
                        {entry.type === 'assessment'
                          ? 'Avaliação'
                          : entry.type === 'session'
                          ? 'Sessão'
                          : entry.type === 'milestone'
                          ? 'Marco'
                          : 'Relatório'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {entry.date.toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.date.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="font-semibold text-gray-900">{entry.title}</h4>
                    {entry.description && (
                      <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                    )}

                    {entry.score !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Score:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${entry.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{entry.score}</span>
                        </div>
                      </div>
                    )}

                    {entry.improvement !== undefined && (
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        {entry.improvement >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={
                            entry.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {entry.improvement >= 0 ? '+' : ''}
                          {entry.improvement}% vs anterior
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ProgressTimeline;
