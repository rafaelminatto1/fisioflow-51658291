import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import { formatCPF, formatPhoneInput } from '@/utils/formatInputs';
import { cleanCPF, cleanPhone, emailSchema, cpfSchema, phoneSchema, sanitizeString, sanitizeEmail } from '@/lib/validations';
import { logger } from '@/lib/errors/logger';

const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200, 'Nome muito longo'),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  cpf: z.string().optional().refine((val) => {
    if (!val || val === '') return true; // Campo vazio é válido
    return cpfSchema.safeParse(val).success;
  }, { message: 'CPF inválido' }),
  birth_date: z.date({
    required_error: 'Data de nascimento é obrigatória',
  }),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  address: z.string().max(500, 'Endereço muito longo').optional(),
  emergency_contact: z.string().max(200, 'Contato muito longo').optional(),
  emergency_contact_relationship: z.string().max(100, 'Parentesco muito longo').optional(),
  medical_history: z.string().max(5000, 'Histórico muito longo').optional(),
  main_condition: z.string().min(1, 'Condição principal é obrigatória').max(500, 'Condição muito longa'),
  allergies: z.string().max(500, 'Alergias muito longas').optional(),
  medications: z.string().max(500, 'Medicamentos muito longos').optional(),
  weight_kg: z.union([z.number().positive().max(500, 'Peso inválido'), z.literal('')]).optional(),
  height_cm: z.union([z.number().positive().max(300, 'Altura inválida'), z.literal('')]).optional(),
  blood_type: z.string().optional(),
  marital_status: z.string().optional(),
  profession: z.string().max(200, 'Profissão muito longa').optional(),
  education_level: z.string().optional(),
  insurance_plan: z.string().max(200, 'Plano muito longo').optional(),
  insurance_number: z.string().max(100, 'Número muito longo').optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface NewPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      birth_date: undefined as unknown as Date,
      gender: 'masculino',
      address: '',
      emergency_contact: '',
      emergency_contact_relationship: '',
      medical_history: '',
      main_condition: '',
      allergies: '',
      medications: '',
      weight_kg: '' as const,
      height_cm: '' as const,
      blood_type: '',
      marital_status: '',
      profession: '',
      education_level: '',
      insurance_plan: '',
      insurance_number: '',
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = form;
  
  const watchedBirthDate = watch('birth_date');
  const watchedPhone = watch('phone');
  const watchedCpf = watch('cpf');

  // Handlers para formatação de CPF e telefone
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted, { shouldValidate: false });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setValue('phone', formatted, { shouldValidate: false });
  };
  
  const handleSave = async (data: PatientFormData) => {
    try {
      // Validar organização
      if (!currentOrganization?.id) {
        toast({
          title: 'Organização não encontrada',
          description: 'Você precisa estar vinculado a uma organização para cadastrar pacientes.',
          variant: 'destructive',
        });
        return;
      }

      // Sanitizar e limpar dados
      const cleanCpfValue = data.cpf ? cleanCPF(data.cpf) : undefined;
      const cleanPhoneValue = data.phone ? cleanPhone(data.phone) : undefined;
      const cleanEmailValue = data.email ? sanitizeEmail(data.email) : undefined;

      // Preparar dados para inserção
      type PatientInsert = {
        name: string;
        email: string | null;
        phone: string | null;
        cpf: string | null;
        birth_date: string;
        gender: string;
        address: string | null;
        emergency_contact: string | null;
        emergency_contact_relationship: string | null;
        medical_history: string | null;
        main_condition: string;
        allergies: string | null;
        medications: string | null;
        weight_kg: number | null;
        height_cm: number | null;
        blood_type: string | null;
        marital_status: string | null;
        profession: string | null;
        education_level: string | null;
        insurance_plan: string | null;
        insurance_number: string | null;
        status: string;
        progress: number;
        consent_data: boolean;
        consent_image: boolean;
        organization_id: string;
        incomplete_registration: boolean;
      };

      const patientData: PatientInsert = {
        name: sanitizeString(data.name, 200),
        email: cleanEmailValue || null,
        phone: cleanPhoneValue || null,
        cpf: cleanCpfValue || null,
        birth_date: format(data.birth_date, 'yyyy-MM-dd'),
        gender: data.gender,
        address: data.address ? sanitizeString(data.address, 500) : null,
        emergency_contact: data.emergency_contact ? sanitizeString(data.emergency_contact, 200) : null,
        emergency_contact_relationship: data.emergency_contact_relationship ? sanitizeString(data.emergency_contact_relationship, 100) : null,
        medical_history: data.medical_history ? sanitizeString(data.medical_history, 5000) : null,
        main_condition: sanitizeString(data.main_condition, 500),
        allergies: data.allergies ? sanitizeString(data.allergies, 500) : null,
        medications: data.medications ? sanitizeString(data.medications, 500) : null,
        weight_kg: data.weight_kg && typeof data.weight_kg === 'number' ? data.weight_kg : null,
        height_cm: data.height_cm && typeof data.height_cm === 'number' ? data.height_cm : null,
        blood_type: data.blood_type || null,
        marital_status: data.marital_status || null,
        profession: data.profession ? sanitizeString(data.profession, 200) : null,
        education_level: data.education_level || null,
        insurance_plan: data.insurance_plan ? sanitizeString(data.insurance_plan, 200) : null,
        insurance_number: data.insurance_number ? sanitizeString(data.insurance_number, 100) : null,
        status: 'Inicial',
        progress: 0,
        consent_data: true,
        consent_image: false,
        organization_id: currentOrganization.id,
        incomplete_registration: false,
      };

      // Insert direto no Supabase com organization_id
      const { error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();

      if (error) throw error;

      logger.info('Paciente cadastrado com sucesso', { name: patientData.name }, 'NewPatientModal');

      toast({
        title: 'Paciente cadastrado!',
        description: 'Novo paciente adicionado com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Erro ao cadastrar paciente', error, 'NewPatientModal');
      
      let errorMessage = 'Não foi possível cadastrar o paciente.';
      
      if (error?.code === '23505') {
        errorMessage = 'Já existe um paciente com este CPF ou email cadastrado.';
      } else if (error?.code === '42501') {
        errorMessage = 'Você não tem permissão para cadastrar pacientes.';
      } else if (error?.code === '23503') {
        errorMessage = 'Erro de referência: verifique os dados informados.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro ao cadastrar',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Novo Paciente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome completo do paciente"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{String(errors.name.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={watchedPhone || ''}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    if (watchedPhone) {
                      setValue('phone', watchedPhone, { shouldValidate: true });
                    }
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={watchedCpf || ''}
                  onChange={handleCpfChange}
                  onBlur={() => {
                    if (watchedCpf) {
                      setValue('cpf', watchedCpf, { shouldValidate: true });
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {errors.cpf && (
                  <p className="text-sm text-destructive">{errors.cpf.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data de Nascimento *</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchedBirthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedBirthDate ? (
                        format(watchedBirthDate, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        "Selecione uma data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedBirthDate}
                      onSelect={(date) => {
                        setValue('birth_date', date || new Date());
                        setIsCalendarOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {errors.birth_date && (
                  <p className="text-sm text-destructive">{String(errors.birth_date.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gênero *</Label>
                <Select
                  value={watch('gender')}
                  onValueChange={(value) => setValue('gender', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-destructive">{errors.gender.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Endereço completo"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contato de Emergência</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Contato</Label>
                <Input
                  id="emergency_contact"
                  {...register('emergency_contact')}
                  placeholder="Nome e telefone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_relationship">Parentesco</Label>
                <Input
                  id="emergency_contact_relationship"
                  {...register('emergency_contact_relationship')}
                  placeholder="Ex: Mãe, Pai, Cônjuge"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Médicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="main_condition">Condição Principal *</Label>
              <Input
                id="main_condition"
                {...register('main_condition')}
                placeholder="Ex: Dor lombar, Lesão no joelho"
              />
              {errors.main_condition && (
                <p className="text-sm text-destructive">{errors.main_condition.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical_history">Histórico Médico</Label>
              <Textarea
                id="medical_history"
                {...register('medical_history')}
                placeholder="Histórico médico relevante"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Input
                  id="allergies"
                  {...register('allergies')}
                  placeholder="Alergias conhecidas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Medicamentos</Label>
                <Input
                  id="medications"
                  {...register('medications')}
                  placeholder="Medicamentos em uso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight_kg">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  {...register('weight_kg', { valueAsNumber: true })}
                  placeholder="70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  {...register('height_cm', { valueAsNumber: true })}
                  placeholder="170"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                <Select
                  value={watch('blood_type')}
                  onValueChange={(value) => setValue('blood_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Adicionais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marital_status">Estado Civil</Label>
                <Select
                  value={watch('marital_status')}
                  onValueChange={(value) => setValue('marital_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  {...register('profession')}
                  placeholder="Profissão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education_level">Escolaridade</Label>
                <Select
                  value={watch('education_level')}
                  onValueChange={(value) => setValue('education_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                    <SelectItem value="medio">Ensino Médio</SelectItem>
                    <SelectItem value="superior">Ensino Superior</SelectItem>
                    <SelectItem value="pos">Pós-graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance_plan">Plano de Saúde</Label>
                <Input
                  id="insurance_plan"
                  {...register('insurance_plan')}
                  placeholder="Nome do plano"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance_number">Número da Carteira</Label>
                <Input
                  id="insurance_number"
                  {...register('insurance_number')}
                  placeholder="Número da carteira do plano"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Cadastrar Paciente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientModal;
