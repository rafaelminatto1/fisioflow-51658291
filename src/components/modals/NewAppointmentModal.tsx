import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  CalendarIcon, 
  CalendarPlus, 
  Plus, 
  User, 
  Send,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/useData';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';

const appointmentSchema = z.object({
  patientName: z.string().min(2, 'Nome do paciente é obrigatório'),
  date: z.date({
    required_error: 'Data do agendamento é obrigatória',
  }),
  time: z.string().min(1, 'Horário é obrigatório'),
  duration: z.string().min(1, 'Duração é obrigatória'),
  type: z.enum(['consulta', 'sessao', 'avaliacao', 'retorno'], {
    required_error: 'Tipo de atendimento é obrigatório',
  }),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTime?: string;
  defaultDate?: Date;
}

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

export function NewAppointmentModal({ 
  trigger, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  defaultTime,
  defaultDate 
}: NewAppointmentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { addAppointment, patients, appointments, addPatient } = useData();

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase())
  );

  // Check if the search term matches any existing patient exactly
  const exactMatch = patients.find(patient => 
    patient.name.toLowerCase() === patientSearchTerm.toLowerCase()
  );

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: '',
      date: defaultDate,
      time: defaultTime || '',
      duration: '60',
      notes: '',
    },
  });

  // Handle patient selection from dropdown
  const handleSelectPatient = (patient: { id: string; name: string }) => {
    setPatientSearchTerm(patient.name);
    setSelectedPatientId(patient.id);
    form.setValue('patientName', patient.name);
    setShowPatientDropdown(false);
    setShowQuickRegister(false);
  };

  // Handle quick patient registration
  const handleQuickRegister = async () => {
    if (!patientSearchTerm.trim()) return;
    
    setIsRegistering(true);
    try {
      const newPatient = await addPatient({
        name: patientSearchTerm.trim(),
        email: '',
        phone: '',
        birthDate: new Date('1990-01-01'), // Default date
        gender: 'outro',
        address: '',
        emergencyContact: '',
        mainCondition: 'A preencher',
        medicalHistory: ''
      });

      setSelectedPatientId(newPatient.id);
      form.setValue('patientName', patientSearchTerm.trim());
      setShowQuickRegister(false);
      setShowPatientDropdown(false);

      // Show notification about completing data
      toast({
        title: "Paciente cadastrado!",
        description: (
          <div className="space-y-2">
            <p>Paciente {patientSearchTerm} foi cadastrado com sucesso.</p>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Lembre-se de completar os dados posteriormente</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="mt-2"
              onClick={() => generatePatientLink(newPatient.id)}
            >
              <Send className="w-3 h-3 mr-1" />
              Enviar Link para Paciente
            </Button>
          </div>
        ),
        duration: 8000,
      });

    } catch {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar paciente.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Generate link for patient to fill their own data
  const generatePatientLink = (patientId: string) => {
    const link = `${window.location.origin}/patient-form/${patientId}`;
    navigator.clipboard.writeText(link);
    
    toast({
      title: "Link copiado!",
      description: (
        <div className="space-y-2">
          <p>Link copiado para a área de transferência:</p>
          <div className="bg-muted p-2 rounded text-xs font-mono break-all">
            {link}
          </div>
          <p className="text-sm text-muted-foreground">
            Envie este link para o paciente preencher seus dados
          </p>
        </div>
      ),
      duration: 10000,
    });
  };

  // Handle input change for patient search
  const handlePatientInputChange = (value: string) => {
    setPatientSearchTerm(value);
    form.setValue('patientName', value);
    setShowPatientDropdown(value.length > 0);
    
    // Check if we should show quick register option
    if (value.length > 2 && !exactMatch && filteredPatients.length === 0) {
      setShowQuickRegister(true);
    } else {
      setShowQuickRegister(false);
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    // If no patient is selected and we have a search term, try to find or create
    let patientId = selectedPatientId;
    
    if (!patientId && patientSearchTerm) {
      const existingPatient = patients.find(p => 
        p.name.toLowerCase() === patientSearchTerm.toLowerCase()
      );
      
      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        // Quick register the patient
        try {
          const newPatient = await addPatient({
            name: patientSearchTerm.trim(),
            email: '',
            phone: '',
            birthDate: new Date('1990-01-01'),
            gender: 'outro',
            address: '',
            emergencyContact: '',
            mainCondition: 'A preencher',
            medicalHistory: ''
          });
          patientId = newPatient.id;
        } catch {
          toast({
            title: "Erro",
            description: "Erro ao cadastrar paciente.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    const getAppointmentType = (type: string): 'Consulta Inicial' | 'Fisioterapia' | 'Reavaliação' | 'Consulta de Retorno' => {
      switch (type) {
        case 'avaliacao':
          return 'Consulta Inicial';
        case 'consulta':
          return 'Consulta Inicial';
        case 'sessao':
          return 'Fisioterapia';
        case 'retorno':
          return 'Consulta de Retorno';
        default:
          return 'Fisioterapia';
      }
    };
    
    // Check for appointment conflicts
    const conflictCheck = checkAppointmentConflict({
      date: data.date,
      time: data.time,
      duration: parseInt(data.duration),
      appointments
    });

    if (conflictCheck.hasConflict && conflictCheck.conflictingAppointment) {
      const endTime = new Date(new Date(`2000-01-01T${conflictCheck.conflictingAppointment.time}`).getTime() + conflictCheck.conflictingAppointment.duration * 60000);
      toast({
        title: 'Conflito de Horário',
        description: `Já existe uma consulta agendada com ${conflictCheck.conflictingAppointment.patientName} das ${conflictCheck.conflictingAppointment.time} às ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        variant: 'destructive',
      });
      return;
    }


    const newAppointment = {
      patientId: patientId,
      date: data.date,
      time: data.time,
      duration: parseInt(data.duration),
      type: getAppointmentType(data.type),
      status: 'Confirmado' as const,
      notes: data.notes || '',
    };
    
    try {
      await addAppointment(newAppointment);
      
      toast({
        title: 'Agendamento criado!',
        description: `Consulta de ${data.patientName} agendada para ${format(data.date, "dd/MM/yyyy", { locale: ptBR })} às ${data.time}.`,
      });
      
      form.reset();
      setPatientSearchTerm('');
      setSelectedPatientId('');
      setShowPatientDropdown(false);
      setShowQuickRegister(false);
      setOpen(false);
    } catch {
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento.",
        variant: "destructive",
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-secondary hover:opacity-90">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Autocomplete Patient Field */}
            <FormField
              control={form.control}
              name="patientName"
              render={() => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <div className="relative" ref={inputRef}>
                    <FormControl>
                      <Input
                        placeholder="Digite o nome do paciente..."
                        value={patientSearchTerm}
                        onChange={(e) => handlePatientInputChange(e.target.value)}
                        onFocus={() => setShowPatientDropdown(patientSearchTerm.length > 0)}
                        className="w-full"
                      />
                    </FormControl>
                    
                    {/* Dropdown with patient suggestions */}
                    {showPatientDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredPatients.length > 0 ? (
                          <>
                            {filteredPatients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                                onClick={() => handleSelectPatient(patient)}
                              >
                                <User className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">{patient.name}</div>
                                  {patient.phone && (
                                    <div className="text-sm text-muted-foreground">{patient.phone}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="px-4 py-2 text-sm text-muted-foreground">
                            Nenhum paciente encontrado
                          </div>
                        )}
                        
                        {/* Quick register option */}
                        {showQuickRegister && patientSearchTerm.length > 2 && (
                          <div className="border-t">
                            <button
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-primary"
                              onClick={handleQuickRegister}
                              disabled={isRegistering}
                            >
                              {isRegistering ? (
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              <div>
                                <div className="font-medium">
                                  Cadastrar "{patientSearchTerm}"
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Cadastro rápido - dados completos depois
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
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
                    <FormLabel>Horário</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
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

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Atendimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="avaliacao">Avaliação Inicial</SelectItem>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="sessao">Sessão de Fisioterapia</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações sobre o agendamento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-secondary hover:opacity-90">
                Agendar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}