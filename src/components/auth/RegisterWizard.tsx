import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Check, Eye, EyeOff } from 'lucide-react';
import { UserTypeSelector } from './UserTypeSelector';
import { useAuth } from '@/hooks/useAuth';
import { 
  RegisterFormData, 
  userTypeSchema,
  personalDataSchema,
  professionalDataSchema,
  confirmationSchema,
  UserTypeFormData,
  PersonalDataFormData,
  ProfessionalDataFormData,
  ConfirmationFormData
} from '@/lib/validations/auth';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RegisterWizardProps {
  onComplete: () => void;
}

export function RegisterWizard({ onComplete }: RegisterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<RegisterFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, loading } = useAuth();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Formulários para cada step
  const step1Form = useForm<UserTypeFormData>({
    resolver: zodResolver(userTypeSchema),
    defaultValues: { userType: formData.userType }
  });

  const step2Form = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      email: formData.email || '',
      password: formData.password || '',
      confirmPassword: formData.confirmPassword || '',
      full_name: formData.full_name || '',
      cpf: formData.cpf || '',
      phone: formData.phone || '',
      birth_date: formData.birth_date || ''
    }
  });

  const step3Form = useForm<ProfessionalDataFormData>({
    resolver: zodResolver(professionalDataSchema),
    defaultValues: {
      crefito: formData.crefito || '',
      specialties: formData.specialties || [],
      experience_years: formData.experience_years || 0,
      bio: formData.bio || '',
      consultation_fee: formData.consultation_fee || 0
    }
  });

  const step4Form = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      terms_accepted: false,
      privacy_accepted: false
    }
  });

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onStep1Submit = (data: UserTypeFormData) => {
    setFormData(prev => ({ ...prev, ...data }));
    nextStep();
  };

  const onStep2Submit = (data: PersonalDataFormData) => {
    setFormData(prev => ({ ...prev, ...data }));
    nextStep();
  };

  const onStep3Submit = (data: ProfessionalDataFormData) => {
    setFormData(prev => ({ ...prev, ...data }));
    nextStep();
  };

  const onStep4Submit = async (data: ConfirmationFormData) => {
    const completeData: RegisterFormData = {
      userType: formData.userType as any,
      email: formData.email!,
      password: formData.password!,
      confirmPassword: formData.confirmPassword!,
      full_name: formData.full_name!,
      cpf: formData.cpf,
      phone: formData.phone,
      birth_date: formData.birth_date,
      crefito: formData.crefito,
      specialties: formData.specialties,
      experience_years: formData.experience_years,
      bio: formData.bio,
      consultation_fee: formData.consultation_fee,
      terms_accepted: data.terms_accepted,
      privacy_accepted: data.privacy_accepted
    };
    
    const { error } = await signUp(completeData);
    
    if (!error) {
      onComplete();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <UserTypeSelector
            selectedType={formData.userType}
            onSelect={(type) => {
              step1Form.setValue('userType', type);
              step1Form.handleSubmit(onStep1Submit)();
            }}
          />
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Dados Pessoais</h2>
              <p className="text-muted-foreground mt-2">
                Preencha suas informações básicas
              </p>
            </div>

            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo *</Label>
                  <Input
                    id="full_name"
                    {...step2Form.register('full_name')}
                    className={step2Form.formState.errors.full_name ? 'border-destructive' : ''}
                  />
                  {step2Form.formState.errors.full_name && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    {...step2Form.register('cpf')}
                    className={step2Form.formState.errors.cpf ? 'border-destructive' : ''}
                  />
                  {step2Form.formState.errors.cpf && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.cpf.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...step2Form.register('email')}
                    className={step2Form.formState.errors.email ? 'border-destructive' : ''}
                  />
                  {step2Form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    {...step2Form.register('phone')}
                    className={step2Form.formState.errors.phone ? 'border-destructive' : ''}
                  />
                  {step2Form.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...step2Form.register('birth_date')}
                  className={step2Form.formState.errors.birth_date ? 'border-destructive' : ''}
                />
                {step2Form.formState.errors.birth_date && (
                  <p className="text-sm text-destructive">
                    {step2Form.formState.errors.birth_date.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...step2Form.register('password')}
                      className={step2Form.formState.errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {step2Form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...step2Form.register('confirmPassword')}
                      className={step2Form.formState.errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {step2Form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit">
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        );

      case 3:
        const isProfessional = ['fisioterapeuta', 'estagiario'].includes(formData.userType || '');
        
        if (!isProfessional) {
          // Skip step 3 for non-professionals
          setTimeout(() => nextStep(), 0);
          return <div className="text-center">Carregando...</div>;
        }

        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Dados Profissionais</h2>
              <p className="text-muted-foreground mt-2">
                Informações sobre sua atuação profissional
              </p>
            </div>

            <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crefito">CREFITO</Label>
                  <Input
                    id="crefito"
                    placeholder="CREFITO1-123456-F"
                    {...step3Form.register('crefito')}
                    className={step3Form.formState.errors.crefito ? 'border-destructive' : ''}
                  />
                  {step3Form.formState.errors.crefito && (
                    <p className="text-sm text-destructive">
                      {step3Form.formState.errors.crefito.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_years">Anos de experiência</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    max="50"
                    {...step3Form.register('experience_years', { valueAsNumber: true })}
                    className={step3Form.formState.errors.experience_years ? 'border-destructive' : ''}
                  />
                  {step3Form.formState.errors.experience_years && (
                    <p className="text-sm text-destructive">
                      {step3Form.formState.errors.experience_years.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultation_fee">Valor da consulta (R$)</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150.00"
                  {...step3Form.register('consultation_fee', { valueAsNumber: true })}
                  className={step3Form.formState.errors.consultation_fee ? 'border-destructive' : ''}
                />
                {step3Form.formState.errors.consultation_fee && (
                  <p className="text-sm text-destructive">
                    {step3Form.formState.errors.consultation_fee.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Sobre você (biografia)</Label>
                <Textarea
                  id="bio"
                  placeholder="Conte um pouco sobre sua experiência e especialidades..."
                  rows={4}
                  {...step3Form.register('bio')}
                  className={step3Form.formState.errors.bio ? 'border-destructive' : ''}
                />
                {step3Form.formState.errors.bio && (
                  <p className="text-sm text-destructive">
                    {step3Form.formState.errors.bio.message}
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit">
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Termos e Confirmação</h2>
              <p className="text-muted-foreground mt-2">
                Revise suas informações e aceite os termos
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo dos dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Tipo de conta:</strong> {formData.userType}</p>
                <p><strong>Nome:</strong> {formData.full_name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                {formData.phone && <p><strong>Telefone:</strong> {formData.phone}</p>}
                {formData.crefito && <p><strong>CREFITO:</strong> {formData.crefito}</p>}
              </CardContent>
            </Card>

            <form onSubmit={step4Form.handleSubmit(onStep4Submit)} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms_accepted"
                    checked={step4Form.watch('terms_accepted')}
                    onCheckedChange={(checked) => 
                      step4Form.setValue('terms_accepted', !!checked)
                    }
                  />
                  <Label htmlFor="terms_accepted" className="text-sm">
                    Li e aceito os{' '}
                    <a href="#" className="text-primary hover:underline">
                      Termos de Uso
                    </a>
                  </Label>
                </div>
                {step4Form.formState.errors.terms_accepted && (
                  <p className="text-sm text-destructive">
                    {step4Form.formState.errors.terms_accepted.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy_accepted"
                    checked={step4Form.watch('privacy_accepted')}
                    onCheckedChange={(checked) => 
                      step4Form.setValue('privacy_accepted', !!checked)
                    }
                  />
                  <Label htmlFor="privacy_accepted" className="text-sm">
                    Li e aceito a{' '}
                    <a href="#" className="text-primary hover:underline">
                      Política de Privacidade
                    </a>
                  </Label>
                </div>
                {step4Form.formState.errors.privacy_accepted && (
                  <p className="text-sm text-destructive">
                    {step4Form.formState.errors.privacy_accepted.message}
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <p className="text-center text-sm text-muted-foreground">
          Passo {currentStep} de {totalSteps}
        </p>
      </div>

      {renderStep()}
    </div>
  );
}