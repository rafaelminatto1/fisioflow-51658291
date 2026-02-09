import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {

  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, User, Phone, Mail, MapPin, Activity, HeartPulse, Shield, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanCPF, emailSchema, phoneSchema, cpfSchema } from '@/lib/validations';
import { formatCPF, formatPhoneInput, formatCEP } from '@/utils/formatInputs';
import type { Patient, PatientCreateInput, PatientUpdateInput } from '@/hooks/usePatientCrud';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { MagicTextarea } from '@/components/ai/MagicTextarea';
import { BrasilService } from '@/services/brasilApi';
import { toast } from 'sonner';

// ============================================================================================
// SCHEMA & TYPES
// ============================================================================================

const patientFormSchema = z.object({
  // Informações Básicas
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200, 'Nome muito longo'),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  cpf: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    return cpfSchema.safeParse(cleanCPF(val)).success;
  }, { message: 'CPF inválido' }),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['masculino', 'feminino', 'outro'], { required_error: 'Selecione o gênero' }),

  // Endereço
  address: z.string().max(500, 'Endereço muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  zip_code: z.string().optional(),

  // Contato de Emergência
  emergency_contact: z.string().max(200, 'Contato muito longo').optional(),
  emergency_contact_relationship: z.string().max(100, 'Parentesco muito longo').optional(),
  emergency_phone: z.string().optional(),

  // Informações Médicas
  medical_history: z.string().max(5000, 'Histórico muito longo').optional(),
  main_condition: z.string().min(1, 'Condição principal é obrigatória').max(500, 'Condição muito longa'),
  allergies: z.string().max(500, 'Alergias muito longas').optional(),
  medications: z.string().max(500, 'Medicamentos muito longos').optional(),
  weight_kg: z.coerce.number().positive().max(500, 'Peso inválido').optional(),
  height_cm: z.coerce.number().positive().max(300, 'Altura inválida').optional(),
  blood_type: z.string().optional(),

  // Informações Adicionais
  marital_status: z.string().optional(),
  profession: z.string().max(200, 'Profissão muito longa').optional(),
  education_level: z.string().optional(),
  health_insurance: z.string().max(200, 'Plano muito longo').optional(),
  insurance_number: z.string().max(100, 'Número muito longo').optional(),
  observations: z.string().max(5000, 'Observações muito longas').optional(),

  // Status (apenas para edição)
  status: z.enum(['Inicial', 'Em Tratamento', 'Recuperação', 'Concluído']).optional(),
});

export type PatientFormData = z.infer<typeof patientFormSchema>;

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientCreateInput | PatientUpdateInput) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  organizationId: string;
}

// ============================================================================================
// COMPONENT
// ============================================================================================

export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar',
  organizationId: _organizationId,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isEditing = !!patient;

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      full_name: patient?.full_name || patient?.name || '',
      email: patient?.email || '',
      phone: patient?.phone || '',
      cpf: patient?.cpf || '',
      birth_date: patient?.birth_date || '',
      gender: patient?.gender || 'masculino',
      address: patient?.address || '',
      city: patient?.city || '',
      state: patient?.state || '',
      zip_code: patient?.zip_code || '',
      emergency_contact: patient?.emergency_contact || '',
      emergency_contact_relationship: patient?.emergency_contact_relationship || '',
      emergency_phone: patient?.emergency_phone || '',
      medical_history: patient?.medical_history || '',
      main_condition: patient?.main_condition || '',
      allergies: patient?.allergies || '',
      medications: patient?.medications || '',
      weight_kg: patient?.weight_kg || undefined,
      height_cm: patient?.height_cm || undefined,
      blood_type: patient?.blood_type || '',
      marital_status: patient?.marital_status || '',
      profession: patient?.profession || '',
      education_level: patient?.education_level || '',
      health_insurance: patient?.health_insurance || '',
      insurance_number: patient?.insurance_number || '',
      observations: patient?.observations || '',
      status: patient?.status || 'Inicial',
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  const watchedBirthDate = watch('birth_date');
  const watchedPhone = watch('phone');
  const watchedCpf = watch('cpf');
  const watchedCEP = watch('zip_code');
  const watchedEmergencyPhone = watch('emergency_phone');

  // Formatters
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', formatCPF(e.target.value), { shouldValidate: false });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhoneInput(e.target.value), { shouldValidate: false });
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('emergency_phone', formatPhoneInput(e.target.value), { shouldValidate: false });
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCEP(rawValue);
    setValue('zip_code', formattedValue, { shouldValidate: false });

    // Se o CEP estiver completo (8 dígitos limpos), busca na BrasilAPI
    const cleanCep = rawValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const addressData = await BrasilService.getCep(cleanCep);
        
        // Preencher campos automaticamente
        setValue('address', `${addressData.street}, ${addressData.neighborhood}`, { shouldValidate: true });
        setValue('city', addressData.city, { shouldValidate: true });
        setValue('state', addressData.state, { shouldValidate: true });
        
        toast.success('Endereço encontrado!');
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        // Não mostrar erro intrusivo, apenas deixar o usuário digitar se falhar
      }
    }
  };

  // Submit handler
  const onFormSubmit = async (data: PatientFormData) => {
    // Prepare data for submission
    const submitData: PatientCreateInput | PatientUpdateInput = {
      full_name: data.full_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      cpf: data.cpf || undefined,
      birth_date: data.birth_date,
      gender: data.gender,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zip_code: data.zip_code || undefined,
      emergency_contact: data.emergency_contact || undefined,
      emergency_contact_relationship: data.emergency_contact_relationship || undefined,
      emergency_phone: data.emergency_phone || undefined,
      medical_history: data.medical_history || undefined,
      main_condition: data.main_condition,
      allergies: data.allergies || undefined,
      medications: data.medications || undefined,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      blood_type: data.blood_type || undefined,
      marital_status: data.marital_status || undefined,
      profession: data.profession || undefined,
      education_level: data.education_level || undefined,
      health_insurance: data.health_insurance || undefined,
      insurance_number: data.insurance_number || undefined,
      observations: data.observations || undefined,
      status: data.status,
      organization_id,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <TabsTrigger value="basic">
            <User className="w-4 h-4 mr-2" />
            Básico
          </TabsTrigger>
          <TabsTrigger value="medical">
            <Activity className="w-4 h-4 mr-2" />
            Médico
          </TabsTrigger>
          <TabsTrigger value="address">
            <MapPin className="w-4 h-4 mr-2" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="additional">
            <Briefcase className="w-4 h-4 mr-2" />
            Adicional
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Informações básicas do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Nome completo do paciente"
                    {...register('full_name')}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-2">
                  <Label>
                    Data de Nascimento <span className="text-destructive">*</span>
                  </Label>
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
                          format(new Date(watchedBirthDate), 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          "Selecione uma data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watchedBirthDate ? new Date(watchedBirthDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setValue('birth_date', format(date, 'yyyy-MM-dd'));
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.birth_date && (
                    <p className="text-sm text-destructive">{errors.birth_date.message}</p>
                  )}
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={watchedCpf || ''}
                    onChange={handleCpfChange}
                    onBlur={() => setValue('cpf', watchedCpf || '', { shouldValidate: true })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-destructive">{errors.cpf.message}</p>
                  )}
                </div>

                {/* Gênero */}
                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Gênero <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && (
                    <p className="text-sm text-destructive">{errors.gender.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={watchedPhone || ''}
                    onChange={handlePhoneChange}
                    onBlur={() => setValue('phone', watchedPhone || '', { shouldValidate: true })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Status (apenas na edição) */}
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status do Paciente</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inicial">
                            <Badge variant="secondary">🆕 Inicial</Badge>
                          </SelectItem>
                          <SelectItem value="Em Tratamento">
                            <Badge className="bg-emerald-500">💚 Em Tratamento</Badge>
                          </SelectItem>
                          <SelectItem value="Recuperação">
                            <Badge className="bg-yellow-500">⚡ Recuperação</Badge>
                          </SelectItem>
                          <SelectItem value="Concluído">
                            <Badge className="bg-gray-500">✅ Concluído</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Contato de Emergência
              </CardTitle>
              <CardDescription>Informações para contato em casos de emergência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Nome do Contato</Label>
                  <Input
                    id="emergency_contact"
                    placeholder="Nome completo"
                    {...register('emergency_contact')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship">Parentesco</Label>
                  <Input
                    id="emergency_contact_relationship"
                    placeholder="Ex: Mãe, Pai, Cônjuge"
                    {...register('emergency_contact_relationship')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Telefone</Label>
                  <Input
                    id="emergency_phone"
                    value={watchedEmergencyPhone || ''}
                    onChange={handleEmergencyPhoneChange}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Information Tab */}
        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                Informações Médicas
              </CardTitle>
              <CardDescription>Dados clínicos do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="main_condition">
                  Condição Principal <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="main_condition"
                  placeholder="Ex: Dor lombar, Lesão no joelho, Lombalgia"
                  {...register('main_condition')}
                />
                {errors.main_condition && (
                  <p className="text-sm text-destructive">{errors.main_condition.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_history">Histórico Médico</Label>
                <Controller
                  name="medical_history"
                  control={control}
                  render={({ field }) => (
                    <MagicTextarea
                      id="medical_history"
                      placeholder="Histórico médico relevante, cirurgias anteriores, comorbidades... (A IA corrige para você)"
                      rows={3}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias Conhecidas</Label>
                  <Input
                    id="allergies"
                    placeholder="Medicamentos, alimentos, látex..."
                    {...register('allergies')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Medicamentos em Uso</Label>
                  <Input
                    id="medications"
                    placeholder="Lista de medicamentos atuais"
                    {...register('medications')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Peso (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    {...register('weight_kg', { valueAsNumber: true })}
                  />
                  {errors.weight_kg && (
                    <p className="text-sm text-destructive">{errors.weight_kg.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height_cm">Altura (cm)</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    placeholder="170"
                    {...register('height_cm', { valueAsNumber: true })}
                  />
                  {errors.height_cm && (
                    <p className="text-sm text-destructive">{errors.height_cm.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                  <Controller
                    name="blood_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Endereço
              </CardTitle>
              <CardDescription>Informações de localização (Google Maps)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Logradouro</Label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <AddressAutocomplete
                      value={field.value || ''}
                      onChange={field.onChange}
                      onSelect={(place) => {
                        // O Google Maps retorna 'description' com o texto completo
                        // Para um preenchimento robusto, idealmente chamariamos a Geocoding API
                        // Mas aqui vamos fazer um parse simples da string retornada pelo Autocomplete
                        const parts = place.description.split(', ');
                        if (parts.length > 1) {
                          // Tentativa heurística: "Rua X, 123, Bairro, Cidade - SP, Brasil"
                          const cityState = parts[parts.length - 2] || '';
                          const [city, state] = cityState.split(' - ');
                          if (city) setValue('city', city);
                          if (state) setValue('state', state);
                        }
                      }}
                      placeholder="Digite o endereço para buscar no Google Maps..."
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Nome da cidade"
                    {...register('city')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value?.toUpperCase()}>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AC">Acre</SelectItem>
                          <SelectItem value="AL">Alagoas</SelectItem>
                          <SelectItem value="AP">Amapá</SelectItem>
                          <SelectItem value="AM">Amazonas</SelectItem>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="CE">Ceará</SelectItem>
                          <SelectItem value="DF">Distrito Federal</SelectItem>
                          <SelectItem value="ES">Espírito Santo</SelectItem>
                          <SelectItem value="GO">Goiás</SelectItem>
                          <SelectItem value="MA">Maranhão</SelectItem>
                          <SelectItem value="MT">Mato Grosso</SelectItem>
                          <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="PA">Pará</SelectItem>
                          <SelectItem value="PB">Paraíba</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="PE">Pernambuco</SelectItem>
                          <SelectItem value="PI">Piauí</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          <SelectItem value="RO">Rondônia</SelectItem>
                          <SelectItem value="RR">Roraima</SelectItem>
                          <SelectItem value="SC">Santa Catarina</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="SE">Sergipe</SelectItem>
                          <SelectItem value="TO">Tocantins</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={watchedCEP || ''}
                    onChange={handleCEPChange}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional Information Tab */}
        <TabsContent value="additional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Informações Adicionais
              </CardTitle>
              <CardDescription>Dados complementares do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Controller
                    name="marital_status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    placeholder="Profissão do paciente"
                    {...register('profession')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education_level">Escolaridade</Label>
                  <Controller
                    name="education_level"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                          <SelectItem value="medio">Ensino Médio</SelectItem>
                          <SelectItem value="superior">Ensino Superior</SelectItem>
                          <SelectItem value="pos">Pós-graduação</SelectItem>
                          <SelectItem value="mestrado">Mestrado</SelectItem>
                          <SelectItem value="doutorado">Doutorado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="health_insurance">Plano de Saúde</Label>
                  <Input
                    id="health_insurance"
                    placeholder="Nome do convênio"
                    {...register('health_insurance')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_number">Número da Carteira</Label>
                  <Input
                    id="insurance_number"
                    placeholder="Número da carteirinha"
                    {...register('insurance_number')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Controller
                  name="observations"
                  control={control}
                  render={({ field }) => (
                    <MagicTextarea
                      id="observations"
                      placeholder="Informações adicionais, notas importantes..."
                      rows={4}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Limpar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};
