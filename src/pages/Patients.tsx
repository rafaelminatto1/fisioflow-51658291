import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Phone,
  Mail,
  Calendar,
  Activity
} from 'lucide-react';

const mockPatients = [
  {
    id: 1,
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-9999',
    condition: 'Lombalgia',
    lastVisit: '2024-01-10',
    nextAppointment: '2024-01-15',
    status: 'Em Tratamento',
    progress: 85,
    age: 45
  },
  {
    id: 2,
    name: 'João Santos',
    email: 'joao.santos@email.com',
    phone: '(11) 88888-8888',
    condition: 'Tendinite',
    lastVisit: '2024-01-09',
    nextAppointment: '2024-01-16',
    status: 'Recuperação',
    progress: 60,
    age: 32
  },
  {
    id: 3,
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    phone: '(11) 77777-7777',
    condition: 'Escoliose',
    lastVisit: '2024-01-08',
    nextAppointment: '2024-01-17',
    status: 'Em Tratamento',
    progress: 40,
    age: 28
  },
  {
    id: 4,
    name: 'Pedro Lima',
    email: 'pedro.lima@email.com',
    phone: '(11) 66666-6666',
    condition: 'Artrose',
    lastVisit: '2024-01-07',
    nextAppointment: '2024-01-18',
    status: 'Inicial',
    progress: 20,
    age: 67
  },
];

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);

  const filteredPatients = mockPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return 'bg-primary/10 text-primary';
      case 'Recuperação':
        return 'bg-secondary/10 text-secondary';
      case 'Inicial':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">Gerencie seus pacientes e acompanhe o progresso</p>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou condição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:shadow-card transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedPatient(patient.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-foreground">{patient.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{patient.age} anos</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(patient.status)}>
                    {patient.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-foreground mb-2">Condição Principal</p>
                  <p className="text-sm text-muted-foreground bg-accent/50 p-2 rounded">
                    {patient.condition}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Próxima: {patient.nextAppointment}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Progresso</span>
                    <span className="text-sm text-muted-foreground">{patient.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${patient.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Statistics Footer */}
        <Card className="bg-gradient-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{mockPatients.length}</p>
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {mockPatients.filter(p => p.status === 'Em Tratamento').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Tratamento</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {mockPatients.filter(p => p.status === 'Recuperação').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Recuperação</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(mockPatients.reduce((acc, p) => acc + p.progress, 0) / mockPatients.length)}%
                </p>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Patients;