import React, { useState } from 'react';
import { Plus, Filter, Calendar, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeeklyCalendar } from './WeeklyCalendar';
import { MobileAgenda } from './MobileAgenda';
import { AgendaNavigation, AgendaStats } from './AgendaNavigation';
import { AgendaFilters, useAgendaFilters } from './AgendaFilters';
import { AppointmentModal } from './AppointmentModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useAgenda } from '@/hooks/useAgenda';
import { useCurrentUser } from '@/hooks/useUsers';

interface AgendaPageProps {
  className?: string;
}

export function AgendaPage({ className }: AgendaPageProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);

  const { canCreateAppointment } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const { filters, setFilters, clearFilters, hasActiveFilters } = useAgendaFilters();
  
  // Pass filters to agenda hook
  const { setFilters: updateAgendaFilters } = useAgenda({ 
    filters,
    enableRealtime: true 
  });

  // Check for mobile view
  React.useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedTimeSlot({ date, time });
    setShowNewAppointmentModal(true);
  };

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setShowAppointmentModal(true);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    updateAgendaFilters(newFilters);
  };

  const handleClearFilters = () => {
    clearFilters();
    updateAgendaFilters({});
  };

  const handleStartEvolution = (appointmentId: string, patientId: string) => {
    // Navigate to evolution page
    console.log('Starting evolution for appointment:', appointmentId, 'patient:', patientId);
    // This would typically use router navigation
  };

  const handleNewAppointment = () => {
    setSelectedTimeSlot(null);
    setShowNewAppointmentModal(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Agenda</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie os agendamentos da clínica
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PermissionGuard permission="canCreateAppointment">
            <Button onClick={handleNewAppointment} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Novo Agendamento</span>
              <span className="md:hidden">Novo</span>
            </Button>
          </PermissionGuard>

          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
            size="sm"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden md:inline">Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {Object.keys(filters).length}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClearFilters}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              <span className="hidden md:inline">Limpar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <AgendaFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
          {filters.therapist_id && (
            <Badge variant="secondary">Fisioterapeuta selecionado</Badge>
          )}
          {filters.status && (
            <Badge variant="secondary">Status: {filters.status}</Badge>
          )}
          {filters.payment_status && (
            <Badge variant="secondary">Pagamento: {filters.payment_status}</Badge>
          )}
          {filters.search && (
            <Badge variant="secondary">Busca: {filters.search}</Badge>
          )}
        </div>
      )}

      {/* Main Content */}
      {isMobileView ? (
        /* Mobile View */
        <MobileAgenda
          onTimeSlotClick={canCreateAppointment ? handleTimeSlotClick : undefined}
          onAppointmentClick={handleAppointmentClick}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
          className="h-[calc(100vh-200px)]"
        />
      ) : (
        /* Desktop/Tablet View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1 lg:col-span-1 space-y-4">
            <AgendaNavigation />
            <AgendaStats />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <PermissionGuard permission="canCreateAppointment">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleNewAppointment}
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Novo Agendamento
                  </Button>
                </PermissionGuard>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  Ver Hoje
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                >
                  <Users className="h-3 w-3 mr-2" />
                  Pacientes
                </Button>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card className="hidden lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Atalhos do Teclado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Semana anterior:</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + ←</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Próxima semana:</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + →</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Ir para hoje:</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl + Home</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Hoje (rápido):</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">T</kbd>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="md:col-span-2 lg:col-span-3">
            <WeeklyCalendar
              onTimeSlotClick={canCreateAppointment ? handleTimeSlotClick : undefined}
              onAppointmentClick={handleAppointmentClick}
              showTooltips={true}
              enableKeyboardNavigation={true}
              className="h-fit"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <NewAppointmentModal
        isOpen={showNewAppointmentModal}
        onClose={() => {
          setShowNewAppointmentModal(false);
          setSelectedTimeSlot(null);
        }}
        initialDate={selectedTimeSlot?.date}
        initialTime={selectedTimeSlot?.time}
        therapistId={currentUser?.id}
      />

      <AppointmentModal
        appointmentId={selectedAppointment}
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setSelectedAppointment(null);
        }}
        onStartEvolution={handleStartEvolution}
      />
    </div>
  );
}

// Export the main agenda page component
export default AgendaPage;