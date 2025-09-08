import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  EnhancedAppointment, 
  AppointmentType, 
  AppointmentStatus, 
  AppointmentPriority,
  RecurrencePattern,
  RecurrenceType,
  DayOfWeek,
  AppointmentConflict
} from '@/types/appointment';
import { Patient } from '@/types';
import { RecurrenceSelector } from './RecurrenceSelector';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

// Form validation schema
const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Paciente é obrigatório'),
  date: z.date({
    required_error: 'Data é obrigatória',
  }),
  time: z.string().min(1, 'Horário é obrigatório'),
  duration: z.number().min(15, 'Duração mínima de 15 minutos').max(240, 'Duração máxima de 4 horas'),
  type: z.enum([
    'Consulta Inicial', 
    'Fisioterapia', 
    'Reavaliação', 
    'Consulta de Retorno',
    'Avaliação Funcional',
    'Terapia Manual',
    'Pilates Clínico',
    'RPG',
    'Dry Needling',
    'Liberação Miofascial'
  ] as const),
  status: z.enum(['Scheduled', 'Confirmed', 'Pending'] as const).default('Pending'),
  therapistId: z.string().optional(),
  roomId: z.string().optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent'] as const).default('Normal'),
  notes: z.string().optional(),
  specialRequirements: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.object({
    type: z.enum(['Daily', 'Weekly', 'Monthly', 'Custom'] as const),
    frequency: z.number().min(1).max(12),
    daysOfWeek: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const)).optional(),
    endDate: z.date().optional(),
    maxOccurrences: z.number().optional(),
  }).optional(),
});

type FormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Partial<EnhancedAppointment>;
  patients: Patient[];
  therapists?: Array<{ id: string; name: string; specialties: string[] }>;
  rooms?: Array<{ id: string; name: string; capacity: number }>;
  conflicts?: AppointmentConflict[];
  onSubmit: (data: FormData) => Promise<void>;
  onCheckConflicts?: (data: Partial<FormData>) => Promise<AppointmentConflict[]>;
  defaultDate?: Date;
  defaultTime?: string;
  mode?: 'create' | 'edit';
  loading?: boolean;
}

const APPOINTMENT_TYPES: Array<{ value: AppointmentType; label: string; description: string }> = [
  { value: 'Consulta Inicial', label: 'Consulta Inicial', description: 'Primeira avaliação do paciente' },
  { value: 'Fisioterapia', label: 'Fisioterapia', description: 'Sessão de fisioterapia convencional' },
  { value: 'Reavaliação', label: 'Reavaliação', description: 'Reavaliação do progresso do paciente' },
  { value: 'Consulta de Retorno', label: 'Consulta de Retorno', description: 'Acompanhamento do tratamento' },
  { value: 'Avaliação Funcional', label: 'Avaliação Funcional', description: 'Avaliação específica da capacidade funcional' },
  { value: 'Terapia Manual', label: 'Terapia Manual', description: 'Técnicas manuais de fisioterapia' },
  { value: 'Pilates Clínico', label: 'Pilates Clínico', description: 'Sessão de Pilates terapêutico' },
  { value: 'RPG', label: 'RPG', description: 'Reeducação Postural Global' },
  { value: 'Dry Needling', label: 'Dry Needling', description: 'Agulhamento seco para pontos-gatilho' },
  { value: 'Liberação Miofascial', label: 'Liberação Miofascial', description: 'Técnicas de liberação da fáscia' },
];

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  patients,
  therapists = [],
  rooms = [],
  conflicts = [],
  onSubmit,
  onCheckConflicts,
  defaultDate,
  defaultTime,
  mode = 'create',
  loading = false
}: AppointmentFormProps) {
  const [currentConflicts, setCurrentConflicts] = useState<AppointmentConflict[]>(conflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: appointment?.patientId || '',
      date: appointment?.date || defaultDate || new Date(),
      time: appointment?.time || defaultTime || '09:00',
      duration: appointment?.duration || 60,
      type: appointment?.type || 'Fisioterapia',
      status: (appointment?.status as FormData['status']) || 'Pending',
      therapistId: appointment?.therapistId || '',
      roomId: appointment?.roomId || '',
      priority: (appointment?.priority as FormData['priority']) || 'Normal',
      notes: appointment?.notes || '',
      specialRequirements: appointment?.specialRequirements || '',
      equipment: appointment?.equipment || [],
      isRecurring: appointment?.isRecurring || false,
      recurrencePattern: appointment?.recurrencePattern || undefined,
    },
  });

  // Watch for changes that might cause conflicts
  const watchedFields = form.watch(['date', 'time', 'duration', 'therapistId', 'roomId']);

  useEffect(() => {
    if (onCheckConflicts && watchedFields.some(field => field !== undefined)) {
      const checkConflicts = async () => {
        setCheckingConflicts(true);
        try {
          const conflicts = await onCheckConflicts({
            date: watchedFields[0],
            time: watchedFields[1],
            duration: watchedFields[2],
            therapistId: watchedFields[3],
            roomId: watchedFields[4],
          });
          setCurrentConflicts(conflicts);
        } catch (error) {
          console.error('Error checking conflicts:', error);
        } finally {
          setCheckingConflicts(false);
        }
      };

      const timeoutId = setTimeout(checkConflicts, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [watchedFields, onCheckConflicts]);

  const handleSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting appointment:', error);
    }
  };

  const getConflictSeverityIcon = (severity: AppointmentConflict['severity']) => {
    switch (severity) {
      case 'Error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'Info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const selectedPatient = patients.find(p => p.id === form.watch('patientId'));
  const selectedTherapist = therapists.find(t => t.id === form.watch('therapistId'));
  const selectedRoom = rooms.find(r => r.id === form.watch('roomId'));

  const hasBlockingConflicts = currentConflicts.some(c => c.severity === 'Error' && !c.canOverride);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Preencha os dados para criar um novo agendamento'
              : 'Edite os dados do agendamento'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Patient Selection */}
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Paciente *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="flex flex-col">
                                <span>{patient.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {patient.phone}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          Data *
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ptBR })
                                ) : (
                                  <span>Selecione a data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Horário *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o horário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (min) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            min={15}
                            max={240}
                            step={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Consulta *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo de consulta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {APPOINTMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex flex-col">
                                  <span>{type.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {type.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Therapist and Room */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="therapistId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Terapeuta
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o terapeuta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {therapists.map((therapist) => (
                              <SelectItem key={therapist.id} value={therapist.id}>
                                <div className="flex flex-col">
                                  <span>{therapist.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {therapist.specialties.join(', ')}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Sala
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a sala" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{room.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {room.capacity} pessoas
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
                </div>

                {/* Priority and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Baixa</SelectItem>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="High">Alta</SelectItem>
                            <SelectItem value="Urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Scheduled">Agendado</SelectItem>
                            <SelectItem value="Confirmed">Confirmado</SelectItem>
                            <SelectItem value="Pending">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Appointment Summary */}
                {(selectedPatient || selectedTherapist || selectedRoom) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Resumo do Agendamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedPatient && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedPatient.name}</span>
                          {selectedPatient.phone && (
                            <Badge variant="outline" className="text-xs">
                              {selectedPatient.phone}
                            </Badge>
                          )}
                        </div>
                      )}
                      {selectedTherapist && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedTherapist.name}</span>
                        </div>
                      )}
                      {selectedRoom && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedRoom.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {form.watch('duration')} minutos
                          {form.watch('time') && form.watch('duration') && (
                            <span className="text-muted-foreground ml-2">
                              ({form.watch('time')} - {format(
                                addMinutes(parseISO(`2000-01-01T${form.watch('time')}`), form.watch('duration')),
                                'HH:mm'
                              )})
                            </span>
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Conflicts */}
                {(currentConflicts.length > 0 || checkingConflicts) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Verificação de Conflitos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {checkingConflicts ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          Verificando conflitos...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentConflicts.map((conflict, index) => (
                            <div
                              key={index}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded-lg border',
                                conflict.severity === 'Error' && 'bg-red-50 border-red-200',
                                conflict.severity === 'Warning' && 'bg-yellow-50 border-yellow-200',
                                conflict.severity === 'Info' && 'bg-blue-50 border-blue-200'
                              )}
                            >
                              {getConflictSeverityIcon(conflict.severity)}
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {conflict.type}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {conflict.description}
                                </div>
                                {conflict.suggestedAlternatives?.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-xs font-medium">Alternativas:</div>
                                    {conflict.suggestedAlternatives.slice(0, 2).map((alt, idx) => (
                                      <Button
                                        key={idx}
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          form.setValue('date', alt.date);
                                          form.setValue('time', alt.startTime);
                                        }}
                                      >
                                        {format(alt.date, 'dd/MM')} às {alt.startTime}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Special Requirements */}
                <FormField
                  control={form.control}
                  name="specialRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requisitos Especiais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Requisitos especiais para o atendimento..."
                          {...field}
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recurring Appointment */}
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Agendamento Recorrente</FormLabel>
                        <FormDescription>
                          Criar uma série de agendamentos com base em um padrão de repetição
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Recurrence Pattern */}
                {form.watch('isRecurring') && (
                  <FormField
                    control={form.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Padrão de Repetição</FormLabel>
                        <RecurrenceSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || hasBlockingConflicts}
                className="bg-gradient-primary"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : null}
                {mode === 'create' ? 'Criar Agendamento' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}