import { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterFormData, registerSchema } from '@/lib/validations/auth';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

const userRoles: { value: UserRole; label: string; description: string }[] = [
  { 
    value: 'paciente', 
    label: 'Paciente', 
    description: 'Quero receber tratamento fisioterápico' 
  },
  { 
    value: 'fisioterapeuta', 
    label: 'Fisioterapeuta', 
    description: 'Sou profissional formado em Fisioterapia' 
  },
  { 
    value: 'estagiario', 
    label: 'Estagiário', 
    description: 'Sou estudante de Fisioterapia' 
  },
  { 
    value: 'parceiro', 
    label: 'Educador Físico', 
    description: 'Sou profissional de Educação Física' 
  }
];

export function Register() {
  const { user, signUp, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Show confirmation message if coming from email confirmation
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'confirmed') {
      toast({
        title: 'Email confirmado!',
        description: 'Sua conta foi confirmada com sucesso. Você já pode fazer login.',
        duration: 5000,
      });
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
    trigger,
    clearErrors
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      userType: 'paciente',
      terms_accepted: false
    }
  });

  const watchedUserType = watch('userType');
  // const watchedPassword = watch('password');

  // Redirect if already logged in
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const nextStep = async () => {
    let isValid = false;
    
    // Validate current step fields
    if (currentStep === 1) {
      isValid = await trigger(['userType', 'full_name', 'email', 'phone', 'cpf', 'birth_date']);
    } else if (currentStep === 2) {
      isValid = await trigger(['password', 'confirmPassword']);
      
      // For professionals, also validate professional fields
      if (watchedUserType === 'fisioterapeuta' || watchedUserType === 'estagiario') {
        const professionalValid = await trigger(['crefito', 'specialties', 'experience_years', 'bio', 'consultation_fee']);
        isValid = isValid && professionalValid;
      }
    }

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(data);
      
      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already registered')) {
          setError('email', {
            message: 'Este email já está cadastrado. Tente fazer login ou recuperar a senha.'
          });
          setCurrentStep(1); // Go back to email step
        } else if (error.message.includes('Password')) {
          setError('password', {
            message: 'A senha deve ter pelo menos 8 caracteres com letras maiúsculas, minúsculas e números.'
          });
          setCurrentStep(2); // Go back to password step
        } else {
          setError('root', {
            message: 'Erro inesperado. Tente novamente em alguns instantes.'
          });
        }
      } else {
        // Registration successful
        setRegistrationSuccess(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('root', {
        message: 'Falha na conexão. Verifique sua internet e tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">
              Conta criada com sucesso!
            </CardTitle>
            <CardDescription>
              Verifique seu email para confirmar sua conta e começar a usar o FisioFlow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link to="/auth/login">
                <Button className="w-full">
                  Ir para o login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Dados básicos</h2>
              <p className="text-muted-foreground mt-2">
                Escolha o tipo de conta e preencha suas informações
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Tipo de conta</Label>
                <Select 
                  value={watchedUserType} 
                  onValueChange={(value: UserRole) => {
                    setValue('userType', value);
                    clearErrors('userType');
                  }}
                >
                  <SelectTrigger className={errors.userType ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.userType && (
                  <p className="text-sm text-destructive">{errors.userType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo *</Label>
                  <Input
                    id="full_name"
                    placeholder="Seu nome completo"
                    {...register('full_name')}
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    {...register('phone')}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue('phone', formatted);
                    }}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    {...register('cpf')}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setValue('cpf', formatted);
                    }}
                    className={errors.cpf ? 'border-destructive' : ''}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-destructive">{errors.cpf.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                  className={errors.birth_date ? 'border-destructive' : ''}
                />
                {errors.birth_date && (
                  <p className="text-sm text-destructive">{errors.birth_date.message}</p>
                )}
              </div>
            </div>

            <Button onClick={nextStep} className="w-full">
              Continuar
            </Button>
          </div>
        );

      case 2: {
        const isProfessional = watchedUserType === 'fisioterapeuta' || watchedUserType === 'estagiario';
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isProfessional ? 'Dados profissionais' : 'Senha de acesso'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isProfessional 
                  ? 'Informações sobre sua atuação profissional'
                  : 'Defina uma senha segura para sua conta'
                }
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      {...register('password')}
                      className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
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
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, com maiúscula, minúscula e número
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirme sua senha"
                      {...register('confirmPassword')}
                      className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
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
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {isProfessional && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crefito">CREFITO</Label>
                      <Input
                        id="crefito"
                        placeholder="CREFITO1-123456-F"
                        {...register('crefito')}
                        className={errors.crefito ? 'border-destructive' : ''}
                      />
                      {errors.crefito && (
                        <p className="text-sm text-destructive">{errors.crefito.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience_years">Anos de experiência *</Label>
                      <Input
                        id="experience_years"
                        type="number"
                        min="0"
                        max="50"
                        {...register('experience_years', { valueAsNumber: true })}
                        className={errors.experience_years ? 'border-destructive' : ''}
                      />
                      {errors.experience_years && (
                        <p className="text-sm text-destructive">{errors.experience_years.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Valor da consulta (R$) *</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="150.00"
                      {...register('consultation_fee', { valueAsNumber: true })}
                      className={errors.consultation_fee ? 'border-destructive' : ''}
                    />
                    {errors.consultation_fee && (
                      <p className="text-sm text-destructive">{errors.consultation_fee.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Sobre você</Label>
                    <textarea
                      id="bio"
                      placeholder="Conte sobre sua experiência e especialidades..."
                      rows={3}
                      {...register('bio')}
                      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.bio ? 'border-destructive' : ''}`}
                    />
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button onClick={nextStep}>
                Continuar
              </Button>
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Confirmar cadastro</h2>
              <p className="text-muted-foreground mt-2">
                Revise suas informações e aceite os termos
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo das informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="font-medium">Tipo de conta:</span>
                    <span>{userRoles.find(r => r.value === watchedUserType)?.label}</span>
                    
                    <span className="font-medium">Nome:</span>
                    <span>{watch('full_name')}</span>
                    
                    <span className="font-medium">Email:</span>
                    <span>{watch('email')}</span>
                    
                    {watch('phone') && (
                      <>
                        <span className="font-medium">Telefone:</span>
                        <span>{watch('phone')}</span>
                      </>
                    )}
                    
                    {watch('crefito') && (
                      <>
                        <span className="font-medium">CREFITO:</span>
                        <span>{watch('crefito')}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms_accepted"
                  checked={watch('terms_accepted')}
                  onCheckedChange={(checked) => {
                    setValue('terms_accepted', !!checked);
                    clearErrors('terms_accepted');
                  }}
                />
                <Label htmlFor="terms_accepted" className="text-sm leading-5">
                  Li e aceito os{' '}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                    Política de Privacidade
                  </Link>
                </Label>
              </div>
              {errors.terms_accepted && (
                <p className="text-sm text-destructive">{errors.terms_accepted.message}</p>
              )}

              {errors.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !watch('terms_accepted')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar conta
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">FisioFlow</CardTitle>
          <CardDescription>
            Crie sua conta para acessar o sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                Passo {currentStep} de {totalSteps}
              </p>
            </div>

            {renderStep()}

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}