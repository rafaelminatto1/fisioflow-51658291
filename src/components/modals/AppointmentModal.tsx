import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar as CalendarIcon, Clock, User, MapPin, Repeat } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAppointments, Appointment, CreateAppointmentData } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  appointment_date: z.string().min(1, 'Selecione uma data'),
  start_time: z.string().min(1, 'Selecione o horário de início'),
  duration: z.number().min(15, 'Duração mínima de 15 minutos').max(480, 'Duração máxima de 8 horas'),
  type: z.enum(['consultation', 'treatment', 'evaluation', 'follow_up', 'group_session']),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
  recurring_pattern: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  recurring_end_date: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
}

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Consulta', description: 'Primeira consulta ou avaliação inicial' },
  { value: 'treatment', label: 'Tratamento', description: 'Sessão de fisioterapia regular' },
  { value: 'evaluation', label: 'Avaliação', description: 'Reavaliação ou avaliação específica' },
  { value: 'follow_up', label: 'Retorno', description: 'Consulta de acompanhamento' },
  { value: 'group_session', label: 'Sessão em Grupo', description: 'Atividade em grupo' },
];

const APPOINTMENT_STATUS = [
  { value: 'scheduled', label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-green-100 text-green-800' },
  { value: 'in_progress', label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Concluído', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  { value: 'no_show', label: 'Não Compareceu', color: 'bg-orange-100 text-orange-800' },
  { value: 'rescheduled', label: 'Reagendado', color: 'bg-purple-100 text-purple-800' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

const RECURRING_PATTERNS = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
];

export function AppointmentModal({
  open,
  onClose,
  appointment,
  defaultDate,
  defaultTime
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [endTime, setEndTime] = useState<string>('');
  const { patients } = usePatients();
  const { createAppointment, updateAppointment } = useAppointments();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: '',
      appointment_date: '',
      start_time: '',
      duration: 60,
      type: 'treatment',
      status: 'scheduled',
      room: '',
      notes: '',
      recurring_pattern: 'none',
      recurring_end_date: '',
    },
  });

  // Update form when appointment changes
  useEffect(() => {
    if (appointment) {
      form.reset({
        patient_id: appointment.patient_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        room: appointment.room || '',
        notes: appointment.notes || '',
        recurring_pattern: appointment.recurring_pattern || 'none',
        recurring_end_date: appointment.recurring_end_date || '',
      });
    } else if (defaultDate || defaultTime) {
      form.reset({
        patient_id: '',
        appointment_date: defaultDate ? defaultDate.toISOString().split('T')[0] : '',
        start_time: defaultTime || '',
        duration: 60,
        type: 'treatment',
        status: 'scheduled',
        room: '',
        notes: '',
        recurring_pattern: 'none',
        recurring_end_date: '',
      });
    }
  }, [appointment, defaultDate, defaultTime, form]);

  // Calculate end time when start time or duration changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'start_time' || name === 'duration') {
        const startTime = value.start_time;
        const duration = value.duration;

        if (startTime && duration) {
          try {
            const [hours, minutes] = startTime.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(hours, minutes, 0, 0);
            
            const endDate = addMinutes(startDate, duration);
            const calculatedEndTime = format(endDate, 'HH:mm');
            setEndTime(calculatedEndTime);
          } catch {
            setEndTime('');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      setLoading(true);

      // Calculate end time
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = addMinutes(startDate, data.duration);
      const calculatedEndTime = format(endDate, 'HH:mm');

      const appointmentData = {
        ...data,
        end_time: calculatedEndTime,
        recurring_pattern: data.recurring_pattern || 'none',
      };

      if (appointment) {
        // Update existing appointment
        await updateAppointment(appointment.id, appointmentData);
        toast({
          title: "Agendamento atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        // Create new appointment
        await createAppointment(appointmentData as CreateAppointmentData);
        toast({
          title: "Agendamento criado",
          description: data.recurring_pattern !== 'none' 
            ? "Agendamento e recorrências criados com sucesso."
            : "Agendamento criado com sucesso.",
        });
      }

      handleClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setEndTime('');
    onClose();
  };

  const selectedPatient = patients.find(p => p.id === form.watch('patient_id'));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {appointment 
              ? 'Modifique os detalhes do agendamento abaixo.'
              : 'Preencha as informações para criar um novo agendamento.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Paciente
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{patient.full_name}</span>
                            <span className="text-sm text-gray-500">
                              {patient.email} {patient.phone && `• ${patient.phone}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPatient && (
                    <div className="text-sm text-gray-600 mt-1">
                      Email: {selectedPatient.email} 
                      {selectedPatient.phone && ` • Telefone: ${selectedPatient.phone}`}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Início
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration and End Time Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a duração" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {endTime && (
                <div className="space-y-2">
                  <Label>Horário de Término</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">{endTime}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Agendamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{type.label}</span>
                              <span className="text-sm text-gray-500">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {appointment && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {APPOINTMENT_STATUS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={status.color}>
                                  {status.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Room */}
            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Sala/Local (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sala 1, Ginásio, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Options */}
            {!appointment && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="recurring_pattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Repetição
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o padrão de repetição" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RECURRING_PATTERNS.map((pattern) => (
                            <SelectItem key={pattern.value} value={pattern.value}>
                              {pattern.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('recurring_pattern') !== 'none' && (
                  <FormField
                    control={form.control}
                    name="recurring_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Limite para Repetição</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre o agendamento..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {appointment ? 'Atualizando...' : 'Criando...'}
                  </div>
                ) : (
                  appointment ? 'Atualizar Agendamento' : 'Criar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}