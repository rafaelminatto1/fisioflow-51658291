import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  FileText, 
  Activity, 
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'record' | 'session' | 'progress';
  title: string;
  description: string;
  date: Date;
  status?: string;
  professional?: string;
}

interface MedicalTimelineProps {
  patientId: string;
}

export function MedicalTimeline({ patientId }: MedicalTimelineProps) {
  // Mock data - implementar integração real com dados
  const events: TimelineEvent[] = [
    {
      id: '1',
      type: 'appointment',
      title: 'Consulta Inicial',
      description: 'Primeira avaliação fisioterapêutica',
      date: new Date('2024-01-15'),
      status: 'Realizado',
      professional: 'Dr. João Silva'
    },
    {
      id: '2',
      type: 'record',
      title: 'Prontuário SOAP',
      description: 'Avaliação inicial - Dor lombar crônica',
      date: new Date('2024-01-15'),
      professional: 'Dr. João Silva'
    },
    {
      id: '3',
      type: 'session',
      title: 'Sessão de Fisioterapia',
      description: 'Exercícios de fortalecimento e alongamento',
      date: new Date('2024-01-20'),
      status: 'Realizado',
      professional: 'Dr. João Silva'
    },
    {
      id: '4',
      type: 'progress',
      title: 'Avaliação de Progresso',
      description: 'Melhora significativa na amplitude de movimento',
      date: new Date('2024-01-25'),
      professional: 'Dr. João Silva'
    }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'record':
        return <FileText className="h-4 w-4" />;
      case 'session':
        return <Activity className="h-4 w-4" />;
      case 'progress':
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'record':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'session':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'progress':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      {sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          {sortedEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-4 pb-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm">
                {getEventIcon(event.type)}
              </div>
              
              {/* Event content */}
              <div className="flex-1 min-w-0">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium">{event.title}</h4>
                          <Badge 
                            variant="secondary" 
                            className={getEventColor(event.type)}
                          >
                            {event.type === 'appointment' && 'Consulta'}
                            {event.type === 'record' && 'Prontuário'}
                            {event.type === 'session' && 'Sessão'}
                            {event.type === 'progress' && 'Progresso'}
                          </Badge>
                          {event.status && (
                            <Badge variant="outline">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {event.professional && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.professional}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}