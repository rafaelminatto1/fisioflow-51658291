import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useData } from '@/hooks/useData';

export function RecentPatients() {
  const { patients } = useData();
  
  // Get recent patients (last 5, sorted by updatedAt)
  const recentPatients = patients
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Recuperação':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Inicial':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Pacientes Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentPatients.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">Nenhum paciente cadastrado ainda</p>
          </div>
        ) : (
          recentPatients.map((patient) => (
            <div key={patient.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.mainCondition}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${getStatusColor(patient.status)}`}>
                      {patient.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {patient.progress}% progresso
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}