import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Phone,
  MessageCircle,
  Calendar,
  Activity,
  Target,
  TrendingUp,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalCountdown } from './GoalCountdown';
import { TreatmentDurationCard } from './TreatmentDurationCard';
import type { PatientGoal } from '@/types/evolution';
import { PatientHelpers } from '@/types';

interface PatientInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  whatsapp?: string;
}

interface PatientSummaryPanelProps {
  patient: PatientInfo;
  goals?: PatientGoal[];
  totalSessions?: number;
  attendanceRate?: number;
  nextAppointment?: Date;
  firstSessionDate?: Date;
  onWhatsAppClick?: () => void;
  onPhoneClick?: () => void;
}

export const PatientSummaryPanel: React.FC<PatientSummaryPanelProps> = ({
  patient,
  goals = [],
  totalSessions = 0,
  attendanceRate = 100,
  nextAppointment,
  firstSessionDate,
  onWhatsAppClick,
  onPhoneClick,
}) => {
  const activeGoals = goals.filter((g) => g.status === 'em_andamento');
  const completedGoals = goals.filter((g) => g.status === 'concluido');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  const age = calculateAge(patient.birth_date);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-5 w-5 text-primary" />
          Resumo do Paciente
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {/* Patient Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={patient.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(() => {
                    const name = PatientHelpers.getName(patient);
                    return getInitials(name);
                  })()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{PatientHelpers.getName(patient)}</h3>
                {age && (
                  <p className="text-sm text-muted-foreground">{age} anos</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {patient.whatsapp && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8"
                  onClick={onWhatsAppClick}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              )}
              {patient.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8"
                  onClick={onPhoneClick}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Ligar
                </Button>
              )}
            </div>

            <Separator />

            {/* Treatment Duration */}
            {firstSessionDate && (
              <TreatmentDurationCard firstSessionDate={firstSessionDate} />
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Activity className="h-3 w-3" />
                  <span className="text-xs">Sessões</span>
                </div>
                <p className="text-xl font-bold">{totalSessions}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs">Presença</span>
                </div>
                <p className="text-xl font-bold">{attendanceRate}%</p>
              </div>
            </div>

            {/* Next Appointment */}
            {nextAppointment && (
              <div className="p-3 rounded-lg border bg-primary/5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Próxima Sessão
                </div>
                <p className="font-medium text-sm">
                  {format(nextAppointment, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(nextAppointment, 'HH:mm')}
                </p>
              </div>
            )}

            <Separator />

            {/* Goals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm flex items-center gap-1">
                  <Target className="h-4 w-4 text-primary" />
                  Objetivos
                </h4>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-[10px] px-1">
                    {activeGoals.length} ativos
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1">
                    {completedGoals.length} ✓
                  </Badge>
                </div>
              </div>

              {activeGoals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum objetivo ativo
                </p>
              ) : (
                <div className="space-y-2">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <GoalCountdown key={goal.id} goal={goal} compact />
                  ))}
                  {activeGoals.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{activeGoals.length - 3} objetivos
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
