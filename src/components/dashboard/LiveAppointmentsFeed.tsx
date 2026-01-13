// Feed de agendamentos em tempo real (Refatorado para usar RealtimeContext)
// Agora usa o contexto central para obter dados, eliminando duplicações de subscrições

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRealtime } from '@/contexts/RealtimeContext';

export interface Appointment {
  id: string;
  start_time: string;
  patient: {
    name: string;
  };
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  type?: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
  completed: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
};

/**
 * Componente de feed de agendamentos em tempo real
 * Consumidor do RealtimeContext - exibe dados centralizados
 */
export function LiveAppointmentsFeed() {
  // Usar dados do contexto Realtime central
  const { appointments } = useRealtime();

  // Estado local de ordenação
  const [sortConfig, setSortConfig] = useState({
    field: 'start_time',
    direction: 'desc' as 'asc' | 'desc',
  });

  // Ordenar appointments usando useMemo
  const sortedAppointments = useMemo(() => {
    if (!sortConfig) return appointments;
    
    return [...appointments].sort((a, b) => {
      const dateA = new Date(a.start_time).getTime();
      const dateB = new Date(b.start_time).getTime();
      
      if (sortConfig.direction === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  }, [appointments, sortConfig]);

  // Formatar hora de agendamento
  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos Recentes</CardTitle>
        <CardDescription>Atualizações em tempo real via Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded bg-gradient-primary flex items-center justify-center text-white"
                    >
                      <span className="text-xl font-bold">{apt.patient?.name?.charAt(0) || 'P'}</span>
                    </div>
                    <div>
                      <p className="font-medium">{apt.patient?.name || 'Paciente'}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(apt.start_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 text-right">
                  <div>
                    <Badge
                      variant="outline"
                      className={`${statusColors[apt.status]} text-white border-0`}
                    >
                      {statusLabels[apt.status] || apt.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{format(new Date(apt.start_time), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Controle de Ordenação (Opcional) */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <button
            onClick={() => setSortConfig(prev => ({
              field: 'start_time',
              direction: prev.direction === 'desc' ? 'asc' : 'desc',
            }))}
            className="text-xs px-2 py-1 rounded border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {sortConfig.direction === 'asc' ? 'Mais Recentes' : 'Mais Antigos'}
          </button>
        </div>

        {/* Controle de Filtros (Opcional) */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <button
            onClick={() => setSortConfig({ field: 'status', direction: 'desc' })}
            className="text-xs px-2 py-1 rounded border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Todos
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
