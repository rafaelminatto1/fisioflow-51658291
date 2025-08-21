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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const { appointments } = useData();
  
  // Generate time slots (8:00 to 18:00, every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  // Filter appointments for the current date
  const dayAppointments = appointments.filter(apt => {
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

  const getAppointmentForSlot = (timeSlot: string) => {
    return dayAppointments.find(apt => apt.time === timeSlot);
  };

  const isSlotOccupied = (timeSlot: string) => {
    return !!getAppointmentForSlot(timeSlot);
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    if (!isSlotOccupied(timeSlot)) {
      setSelectedTimeSlot(timeSlot);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Clique em um horário para agendar</p>
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
                  {dayAppointments.length} agendamentos
                </p>
              </div>
              
              <Button variant="outline" onClick={nextDay}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid - Outlook Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Agenda do Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              {/* Time slots grid */}
              {timeSlots.map((timeSlot) => {
                const appointment = getAppointmentForSlot(timeSlot);
                const isOccupied = !!appointment;
                
                return (
                  <div
                    key={timeSlot}
                    className={`
                      border-b border-border last:border-b-0 min-h-16 flex items-center 
                      transition-all duration-200 cursor-pointer
                      ${isOccupied 
                        ? 'bg-primary/5 hover:bg-primary/10' 
                        : 'hover:bg-accent/50 hover:border-primary/20'
                      }
                    `}
                    onClick={() => handleTimeSlotClick(timeSlot)}
                  >
                    {/* Time column */}
                    <div className="w-20 px-4 text-sm font-medium text-muted-foreground border-r border-border">
                      {timeSlot}
                    </div>
                    
                    {/* Appointment content */}
                    <div className="flex-1 px-4 py-3">
                      {isOccupied && appointment ? (
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-foreground">
                                {appointment.patientName}
                              </h4>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {appointment.duration}min
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {appointment.phone}
                              </span>
                            </div>
                            <Badge className={getTypeColor(appointment.type)}>
                              {appointment.type}
                            </Badge>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <User className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Phone className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Clique para agendar
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{dayAppointments.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">
                {dayAppointments.filter(a => a.status === 'Confirmado').length}
              </p>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {dayAppointments.filter(a => a.status === 'Pendente').length}
              </p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {dayAppointments.reduce((acc, a) => acc + a.duration, 0)}min
              </p>
              <p className="text-sm text-muted-foreground">Duração Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Modal for new appointment with pre-filled time */}
        {selectedTimeSlot && (
          <NewAppointmentModal
            open={!!selectedTimeSlot}
            onOpenChange={(open) => !open && setSelectedTimeSlot(null)}
            defaultTime={selectedTimeSlot}
            defaultDate={currentDate}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Schedule;