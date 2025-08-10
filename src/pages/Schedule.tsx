import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const mockAppointments = [
  {
    id: 1,
    time: '08:00',
    patient: 'Maria Silva',
    type: 'Consulta Inicial',
    duration: 60,
    status: 'Confirmado',
    phone: '(11) 99999-9999'
  },
  {
    id: 2,
    time: '09:30',
    patient: 'João Santos',
    type: 'Fisioterapia',
    duration: 45,
    status: 'Confirmado',
    phone: '(11) 88888-8888'
  },
  {
    id: 3,
    time: '11:00',
    patient: 'Ana Costa',
    type: 'Reavaliação',
    duration: 30,
    status: 'Pendente',
    phone: '(11) 77777-7777'
  },
  {
    id: 4,
    time: '14:00',
    patient: 'Pedro Lima',
    type: 'Fisioterapia',
    duration: 45,
    status: 'Confirmado',
    phone: '(11) 66666-6666'
  },
  {
    id: 5,
    time: '15:30',
    patient: 'Lucia Santos',
    type: 'Fisioterapia',
    duration: 45,
    status: 'Confirmado',
    phone: '(11) 55555-5555'
  },
  {
    id: 6,
    time: '17:00',
    patient: 'Carlos Mendes',
    type: 'Consulta de Retorno',
    duration: 30,
    status: 'Reagendado',
    phone: '(11) 44444-4444'
  }
];

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Reagendado':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Consulta Inicial':
        return 'bg-primary/10 text-primary';
      case 'Fisioterapia':
        return 'bg-secondary/10 text-secondary';
      case 'Reavaliação':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos e consultas</p>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={previousDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground capitalize">
                  {formatDate(currentDate)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mockAppointments.length} agendamentos
                </p>
              </div>
              
              <Button variant="outline" onClick={nextDay}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{mockAppointments.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">
                {mockAppointments.filter(a => a.status === 'Confirmado').length}
              </p>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {mockAppointments.filter(a => a.status === 'Pendente').length}
              </p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {mockAppointments.reduce((acc, a) => acc + a.duration, 0)}min
              </p>
              <p className="text-sm text-muted-foreground">Duração Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {mockAppointments.map((appointment) => (
            <Card 
              key={appointment.id} 
              className="hover:shadow-card transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {appointment.patient}
                        </h3>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {appointment.time} ({appointment.duration}min)
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {appointment.phone}
                        </span>
                      </div>
                      
                      <Badge className={getTypeColor(appointment.type)}>
                        {appointment.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4 mr-2" />
                      Ligar
                    </Button>
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Ver Paciente
                    </Button>
                    <Button variant="soft" size="sm">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Reagendar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Time Slots Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Visão Geral do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">Manhã (08:00 - 12:00)</h4>
                <div className="space-y-2">
                  {mockAppointments
                    .filter(a => parseInt(a.time.split(':')[0]) < 12)
                    .map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                        <span className="text-sm text-foreground">{appointment.time} - {appointment.patient}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-3">Tarde (12:00 - 18:00)</h4>
                <div className="space-y-2">
                  {mockAppointments
                    .filter(a => parseInt(a.time.split(':')[0]) >= 12)
                    .map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                        <span className="text-sm text-foreground">{appointment.time} - {appointment.patient}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Schedule;