import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Surgery {
  id: string;
  surgery_name: string;
  surgery_date: string;
  affected_side: string;
  notes?: string;
}

interface SurgeryTimelineProps {
  surgeries: Surgery[];
}

export const SurgeryTimeline: React.FC<SurgeryTimelineProps> = ({ surgeries }) => {
  const formatTimeSinceSurgery = (date: string) => {
    const daysSince = differenceInDays(new Date(), new Date(date));
    const monthsSince = differenceInMonths(new Date(), new Date(date));
    
    if (daysSince < 30) {
      return `${daysSince} ${daysSince === 1 ? 'dia' : 'dias'}`;
    } else if (monthsSince < 12) {
      return `${monthsSince} ${monthsSince === 1 ? 'mês' : 'meses'}`;
    } else {
      const years = Math.floor(monthsSince / 12);
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
  };

  const getRecoveryPhase = (daysSince: number) => {
    if (daysSince <= 30) return { label: 'Inicial', color: 'destructive' };
    if (daysSince <= 90) return { label: 'Recuperação', color: 'secondary' };
    if (daysSince <= 180) return { label: 'Reabilitação', color: 'default' };
    return { label: 'Manutenção', color: 'outline' };
  };

  if (surgeries.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Histórico de Cirurgias
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-4">
            {surgeries.map((surgery, index) => {
              const daysSince = differenceInDays(new Date(), new Date(surgery.surgery_date));
              const phase = getRecoveryPhase(daysSince);
              
              return (
                <div
                  key={surgery.id}
                  className="relative pl-6 pb-4 border-l-2 border-primary/30 last:border-l-0 hover:bg-muted/20 transition-colors rounded-r-lg p-3 -ml-3"
                >
                  <div className="absolute left-[-9px] top-3 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                  
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-base">{surgery.surgery_name}</h4>
                      <Badge variant={phase.color as 'default' | 'secondary' | 'outline' | 'destructive'} className="text-xs">
                        {phase.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        📅 {format(new Date(surgery.surgery_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        ⏱️ Há {formatTimeSinceSurgery(surgery.surgery_date)}
                      </span>
                    </div>
                    
                    <Badge variant="outline" className="font-normal">
                      Lado: {surgery.affected_side}
                    </Badge>
                    
                    {surgery.notes && (
                      <p className="text-sm text-muted-foreground italic mt-2">
                        {surgery.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
