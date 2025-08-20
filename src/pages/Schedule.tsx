import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewAppointmentModal } from '@/components/modals/NewAppointmentModal';
import { useData } from '@/contexts/DataContext';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments } = useData();
  
  // Filter appointments for the current date
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === currentDate.toDateString();
  });
  
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
          <NewAppointmentModal
            trigger={
              <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            }
          />
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={previousDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground capitalize">
                  {formatDate(currentDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {todayAppointments.length} agendamentos
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
                <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-secondary">
                  {todayAppointments.filter(a => a.status === 'Confirmado').length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmados</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {todayAppointments.filter(a => a.status === 'Pendente').length}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {todayAppointments.reduce((acc, a) => acc + a.duration, 0)}min
                </p>
                <p className="text-sm text-muted-foreground">Duração Total</p>
              </CardContent>
            </Card>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {todayAppointments.map((appointment) => (
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
                          {appointment.patientName}
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
          
          {todayAppointments.length === 0 && (
            <Card className="bg-gradient-card">
              <CardContent className="p-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum agendamento para hoje.</p>
              </CardContent>
            </Card>
          )}
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
                  {todayAppointments
                    .filter(a => parseInt(a.time.split(':')[0]) < 12)
                    .map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                        <span className="text-sm text-foreground">{appointment.time} - {appointment.patientName}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  {todayAppointments.filter(a => parseInt(a.time.split(':')[0]) < 12).length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Nenhum agendamento</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-3">Tarde (12:00 - 18:00)</h4>
                <div className="space-y-2">
                  {todayAppointments
                    .filter(a => parseInt(a.time.split(':')[0]) >= 12)
                    .map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                        <span className="text-sm text-foreground">{appointment.time} - {appointment.patientName}</span>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  {todayAppointments.filter(a => parseInt(a.time.split(':')[0]) >= 12).length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Nenhum agendamento</p>
                  )}
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