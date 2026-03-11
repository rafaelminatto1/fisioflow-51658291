import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { User, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCPF, formatPhoneInput, formatCEP } from '@/utils/formatInputs';
import { cleanCPF, cleanPhone, emailSchema, cpfSchema, phoneSchema, sanitizeString, sanitizeEmail } from '@/lib/validations';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { patientsApi } from '@/lib/api/workers-client';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { PATHOLOGY_OPTIONS } from '@/lib/constants/pathologies';

const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200, 'Nome muito longo'),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  cpf: z.string().optional().refine((val) => {
    if (!val || val === '') return true; // Campo vazio é válido
    return cpfSchema.safeParse(val).success;
  }, { message: 'CPF inválido' }),
  birth_date: z.date().optional(),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  session_value: z.union([z.number().min(0, 'Valor inválido'), z.literal('')]).optional(),
  zip_code: z.string().max(9, 'CEP inválido').optional(),
  address: z.string().max(500, 'Endereço muito longo').optional(),
  address_number: z.string().max(20, 'Número muito longo').optional(),
  address_complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().max(2, 'UF inválida').optional(),
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFetchingAddress, setIsFetchingAddress] = React.useState(false);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      birth_date: undefined,
      gender: 'masculino',
      session_value: '' as const,
      zip_code: '',
      address: '',
      address_number: '',
      address_complement: '',
      neighborhood: '',
      city: '',
      state: '',
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
  const watchedZipCode = watch('zip_code');

  // Handlers para formatação de CPF, telefone e CEP
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted, { shouldValidate: false });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setValue('phone', formatted, { shouldValidate: false });
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setValue('zip_code', formatted, { shouldValidate: false });
    
    // Auto-fetch address if CEP is complete
    if (formatted.replace(/\D/g, '').length === 8) {
      void fetchAddress(formatted.replace(/\D/g, ''));
    }
  };

  const fetchAddress = async (cep: string) => {
    setIsFetchingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado.',
          variant: 'destructive',
        });
        return;
      }

      setValue('address', data.logradouro || '', { shouldValidate: true });
      setValue('neighborhood', data.bairro || '', { shouldValidate: true });
      setValue('city', data.localidade || '', { shouldValidate: true });
      setValue('state', data.uf || '', { shouldValidate: true });
      
      toast({
        title: 'Endereço encontrado!',
        description: 'Os campos foram preenchidos automaticamente.',
      });
    } catch (error) {
      logger.error('Erro ao buscar CEP', error, 'NewPatientModal');
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const handleSave = async (data: PatientFormData) => {
    try {
      const cleanCpfValue = data.cpf ? cleanCPF(data.cpf) : undefined;
      const cleanPhoneValue = data.phone ? cleanPhone(data.phone) : undefined;
      const cleanEmailValue = data.email ? sanitizeEmail(data.email) : undefined;
      
      // Combine address fields for the single 'address' field in backend if needed, 
      // or send separately if backend supports it. Assuming current backend uses a single field.
      const fullAddress = data.address 
        ? `${data.address}${data.address_number ? `, ${data.address_number}` : ''}${data.address_complement ? ` - ${data.address_complement}` : ''}${data.neighborhood ? ` - ${data.neighborhood}` : ''}${data.city ? ` - ${data.city}` : ''}${data.state ? ` / ${data.state}` : ''}${data.zip_code ? ` (CEP: ${data.zip_code})` : ''}`
        : null;

      const patientData = {
        name: sanitizeString(data.name, 200),
        full_name: sanitizeString(data.name, 200),
        email: cleanEmailValue || null,
        phone: cleanPhoneValue || null,
        cpf: cleanCpfValue || null,
        birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : null,
        gender: data.gender,
        session_value: data.session_value && typeof data.session_value === 'number' ? data.session_value : null,
        address: fullAddress,
        // If the backend is updated to support structured address, we could send them separately
        // For now, let's keep it compatible with existing structure if it's just a string
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
        incomplete_registration: false,
      };

      const patientResponse = await patientsApi.create(patientData);
      const createdPatient = patientResponse.data;

      if (
        createdPatient?.id &&
        (data.medical_history || data.allergies || data.medications)
      ) {
        await patientsApi.createMedicalRecord(createdPatient.id, {
          chief_complaint: data.main_condition,
          medical_history: data.medical_history || null,
          current_medications: data.medications || null,
          allergies: data.allergies || null,
          family_history: null,
          lifestyle_habits: null,
          previous_surgeries: null,
          record_date: format(new Date(), 'yyyy-MM-dd'),
          created_by: null,
        });
      }

      logger.info('Paciente cadastrado com sucesso', {
        name: patientData.name,
        id: createdPatient?.id
      }, 'NewPatientModal');

      toast({
        title: 'Paciente cadastrado!',
        description: 'Novo paciente adicionado com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      logger.error('Erro ao cadastrar paciente', error, 'NewPatientModal');

      let errorMessage = 'Não foi possível cadastrar o paciente.';

      if (error instanceof Error) {
        if (error.message.includes('permission-denied') || error.message.includes('insufficient permissions')) {
          errorMessage = 'Você não tem permissão para cadastrar pacientes.';
        } else if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          errorMessage = 'Já existe um paciente com este CPF ou email cadastrado.';
        } else {
          errorMessage = error.message;
        }
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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Novo Paciente
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <form id="patient-form" onSubmit={handleSubmit(handleSave)} className="space-y-6">
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
                    aria-required="true"
                    aria-invalid={!!errors.name}
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
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-destructive">{errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label id="birth-date-label">Data de Nascimento</Label>
                  <DatePicker
                    date={watchedBirthDate}
                    onChange={(date) => setValue('birth_date', date, { shouldValidate: true })}
                    placeholder="Selecione ou digite"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero *</Label>
                  <Select
                    value={watch('gender')}
                    onValueChange={(value) => setValue('gender', value as 'masculino' | 'feminino' | 'outro')}
                  >
                    <SelectTrigger id="gender">
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

                <div className="space-y-2">
                  <Label htmlFor="session_value">Valor por Sessão (R$)</Label>
                  <Input
                    id="session_value"
                    type="number"
                    step="0.01"
                    {...register('session_value', { valueAsNumber: true })}
                    placeholder="0,00"
                  />
                  {errors.session_value && (
                    <p className="text-sm text-destructive">{errors.session_value.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <div className="relative">
                    <Input
                      id="zip_code"
                      value={watchedZipCode || ''}
                      onChange={handleZipCodeChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isFetchingAddress ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Logradouro (Rua/Avenida)</Label>
                  <Input
                    id="address"
                    {...register('address')}
                    placeholder="Nome da rua ou avenida"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    {...register('address_number')}
                    placeholder="Número"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    {...register('address_complement')}
                    placeholder="Apto, Sala, Bloco..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    {...register('neighborhood')}
                    placeholder="Bairro"
                  />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">UF</Label>
                      <Input
                        id="state"
                        {...register('state')}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
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
                <Controller
                  name="main_condition"
                  control={form.control}
                  render={({ field }) => (
                    <MultiSelect
                      options={PATHOLOGY_OPTIONS}
                      selected={field.value ? field.value.split(',').map(s => s.trim()).filter(Boolean) : []}
                      onChange={(vals) => field.onChange(vals.join(', '))}
                      placeholder="Pesquisar ou selecionar patologias..."
                    />
                  )}
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
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-2 border-t mt-auto bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            form="patient-form"
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
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientModal;
