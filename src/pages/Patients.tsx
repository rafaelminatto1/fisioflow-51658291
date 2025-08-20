import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { EditPatientModal } from '@/components/modals/EditPatientModal';
import { useData } from '@/contexts/DataContext';
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

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const { patients, appointments } = useData();

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.mainCondition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPatientAge = (birthDate: Date) => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getNextAppointment = (patientId: string) => {
    const patientAppointments = appointments.filter(apt => 
      apt.patientId === patientId && apt.date >= new Date()
    );
    const nextApt = patientAppointments.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    return nextApt ? nextApt.date.toLocaleDateString('pt-BR') : 'Não agendado';
  };

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
          <NewPatientModal
            trigger={
              <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
                <Plus className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            }
          />
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
                      <p className="text-sm text-muted-foreground">{getPatientAge(patient.birthDate)} anos</p>
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
                    {patient.mainCondition}
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
                    <span className="text-muted-foreground">Próxima: {getNextAppointment(patient.id)}</span>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPatient(patient.id);
                    }}
                  >
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
                <p className="text-2xl font-bold text-foreground">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {patients.filter(p => p.status === 'Em Tratamento').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Tratamento</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {patients.filter(p => p.status === 'Recuperação').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Recuperação</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + p.progress, 0) / patients.length) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Patient Modal */}
        {editingPatient && (
          <EditPatientModal
            patient={patients.find(p => p.id === editingPatient)!}
            open={!!editingPatient}
            onOpenChange={(open) => !open && setEditingPatient(null)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Patients;