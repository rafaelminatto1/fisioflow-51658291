import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AppointmentBlock, 
  MultiAppointmentBlock, 
  AppointmentListItem 
} from './AppointmentBlock';
import type { Appointment } from '@/types/agenda';

// Sample appointment data for demonstration
const sampleAppointments: Appointment[] = [
  {
    id: 'apt1',
    patient_id: 'patient1',
    therapist_id: 'therapist1',
    date: '2024-01-15',
    start_time: '09:00',
    end_time: '10:00',
    status: 'scheduled',
    payment_status: 'pending',
    session_type: 'individual',
    notes: 'Primeira sessão com o paciente. Avaliar mobilidade do ombro direito.',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    patient: {
      id: 'patient1',
      name: 'João Silva',
      phone: '11999999999',
      email: 'joao@email.com',
      session_price: 80.00,
      package_sessions: 10,
      remaining_sessions: 5,
      important_notes: '',
      status: 'active',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    }
  },
  {
    id: 'apt2',
    patient_id: 'patient2',
    therapist_id: 'therapist1',
    date: '2024-01-15',
    start_time: '10:00',
    end_time: '11:00',
    status: 'completed',
    payment_status: 'paid',
    session_type: 'individual',
    notes: 'Sessão concluída com sucesso. Paciente apresentou melhora significativa.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    patient: {
      id: 'patient2',
      name: 'Maria Santos',
      phone: '11888888888',
      email: 'maria@email.com',
      session_price: 90.00,
      package_sessions: 8,
      remaining_sessions: 3,
      important_notes: '',
      status: 'active',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    }
  },
  {
    id: 'apt3',
    patient_id: 'patient3',
    therapist_id: 'therapist1',
    date: '2024-01-15',
    start_time: '11:00',
    end_time: '12:00',
    status: 'missed',
    payment_status: 'pending',
    session_type: 'group',
    notes: 'Paciente não compareceu. Entrar em contato para reagendar.',
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
    patient: {
      id: 'patient3',
      name: 'Pedro Costa',
      phone: '11777777777',
      email: 'pedro@email.com',
      session_price: 70.00,
      package_sessions: 12,
      remaining_sessions: 8,
      important_notes: '',
      status: 'active',
      created_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-15T11:00:00Z'
    }
  },
  {
    id: 'apt4',
    patient_id: 'patient4',
    therapist_id: 'therapist1',
    date: '2024-01-15',
    start_time: '14:00',
    end_time: '15:00',
    status: 'cancelled',
    payment_status: 'partial',
    session_type: 'individual',
    notes: 'Cancelado pelo paciente devido a compromisso urgente.',
    created_at: '2024-01-15T14:00:00Z',
    updated_at: '2024-01-15T14:00:00Z',
    patient: {
      id: 'patient4',
      name: 'Ana Oliveira',
      phone: '11666666666',
      email: 'ana@email.com',
      session_price: 85.00,
      package_sessions: 6,
      remaining_sessions: 2,
      important_notes: '',
      status: 'active',
      created_at: '2024-01-15T14:00:00Z',
      updated_at: '2024-01-15T14:00:00Z'
    }
  },
  {
    id: 'apt5',
    patient_id: 'patient5',
    therapist_id: 'therapist1',
    date: '2024-01-15',
    start_time: '15:00',
    end_time: '16:00',
    status: 'rescheduled',
    payment_status: 'paid',
    session_type: 'individual',
    notes: 'Reagendado para próxima semana a pedido do paciente.',
    created_at: '2024-01-15T15:00:00Z',
    updated_at: '2024-01-15T15:00:00Z',
    patient: {
      id: 'patient5',
      name: 'Carlos Ferreira',
      phone: '11555555555',
      email: 'carlos@email.com',
      session_price: 95.00,
      package_sessions: 15,
      remaining_sessions: 10,
      important_notes: '',
      status: 'active',
      created_at: '2024-01-15T15:00:00Z',
      updated_at: '2024-01-15T15:00:00Z'
    }
  }
];

export function AppointmentShowcase() {
  const handleAppointmentClick = (appointmentId: string) => {
    console.log('Clicked appointment:', appointmentId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Renderização de Agendamentos</h1>
        <p className="text-muted-foreground">
          Demonstração dos diferentes estilos de exibição de agendamentos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compact Size */}
        <Card>
          <CardHeader>
            <CardTitle>Tamanho Compacto (Calendar Grid)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleAppointments.slice(0, 3).map((appointment) => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment.id)}
                size="compact"
                className="max-w-48"
              />
            ))}
          </CardContent>
        </Card>

        {/* Normal Size */}
        <Card>
          <CardHeader>
            <CardTitle>Tamanho Normal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleAppointments.slice(0, 3).map((appointment) => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment.id)}
                size="normal"
                className="max-w-64"
              />
            ))}
          </CardContent>
        </Card>

        {/* Expanded Size */}
        <Card>
          <CardHeader>
            <CardTitle>Tamanho Expandido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleAppointments.slice(0, 2).map((appointment) => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment.id)}
                size="expanded"
              />
            ))}
          </CardContent>
        </Card>

        {/* Multiple Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Múltiplos Agendamentos (Mesmo Horário)</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiAppointmentBlock
              appointments={sampleAppointments.slice(0, 4)}
              onClick={handleAppointmentClick}
              maxVisible={2}
              className="max-w-64"
            />
          </CardContent>
        </Card>
      </div>

      {/* List View */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização em Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sampleAppointments.map((appointment) => (
            <AppointmentListItem
              key={appointment.id}
              appointment={appointment}
              onClick={() => handleAppointmentClick(appointment.id)}
              showDate={true}
            />
          ))}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legenda de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status da Sessão</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>Agendado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Concluído</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>Faltou</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                  <span>Cancelado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span>Reagendado</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status do Pagamento</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span>Pago</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                  <span>Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span>Pendente</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Tipo de Sessão</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Individual</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Grupo</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}