import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDetailedDuration } from '@/utils/dateUtils';

interface Pathology {
  id: string;
  pathology_name: string;
  diagnosis_date?: string;
  status: 'em_tratamento' | 'tratada' | 'cronica';
  notes?: string;
}

interface PathologyStatusProps {
  pathologies: Pathology[];
}

export const PathologyStatus: React.FC<PathologyStatusProps> = ({ pathologies }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'tratada': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'em_tratamento': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'cronica': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tratada': return 'default';
      case 'em_tratamento': return 'secondary';
      case 'cronica': return 'outline';
      default: return 'outline';
    }
  };

  const statusLabels = {
    'em_tratamento': 'Em Tratamento',
    'tratada': 'Tratada',
    'cronica': 'Crônica'
  };

  const inTreatment = pathologies.filter(p => p.status === 'em_tratamento');
  const treated = pathologies.filter(p => p.status === 'tratada');
  const chronic = pathologies.filter(p => p.status === 'cronica');

  if (pathologies.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Status das Patologias
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {inTreatment.length} ativas
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {pathologies.map((pathology) => (
            <div
              key={pathology.id}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getStatusIcon(pathology.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm">{pathology.pathology_name}</p>
                  {pathology.diagnosis_date && (
                    <p className="text-xs text-muted-foreground">
                      Diagnóstico: {format(new Date(pathology.diagnosis_date), 'dd/MM/yyyy', { locale: ptBR })}
                      <span className="ml-1 text-primary">({formatDetailedDuration(pathology.diagnosis_date)})</span>
                    </p>
                  )}
                  {pathology.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                      {pathology.notes}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={getStatusColor(pathology.status) as 'default' | 'secondary' | 'outline'} className="text-xs">
                {statusLabels[pathology.status]}
              </Badge>
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {inTreatment.length}
            </div>
            <div className="text-xs text-muted-foreground">Ativas</div>
          </div>
          <div className="text-center p-2 bg-green-50/50 dark:bg-green-950/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {treated.length}
            </div>
            <div className="text-xs text-muted-foreground">Tratadas</div>
          </div>
          <div className="text-center p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {chronic.length}
            </div>
            <div className="text-xs text-muted-foreground">Crônicas</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
