import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

const recentPatients = [
  {
    id: 1,
    name: 'Maria Silva',
    condition: 'Lombalgia',
    lastVisit: '2024-01-10',
    status: 'Em Tratamento',
    progress: 85
  },
  {
    id: 2,
    name: 'João Santos',
    condition: 'Tendinite',
    lastVisit: '2024-01-09',
    status: 'Recuperação',
    progress: 60
  },
  {
    id: 3,
    name: 'Ana Costa',
    condition: 'Escoliose',
    lastVisit: '2024-01-08',
    status: 'Em Tratamento',
    progress: 40
  },
  {
    id: 4,
    name: 'Pedro Lima',
    condition: 'Artrose',
    lastVisit: '2024-01-07',
    status: 'Inicial',
    progress: 20
  },
];

export function RecentPatients() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Pacientes Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentPatients.map((patient) => (
          <div key={patient.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-sm text-muted-foreground">{patient.condition}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
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
        ))}
      </CardContent>
    </Card>
  );
}