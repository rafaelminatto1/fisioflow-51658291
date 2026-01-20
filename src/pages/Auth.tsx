import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { passwordSchema, emailSchema, fullNameSchema } from '@/lib/validations/auth';
import { logger } from '@/lib/errors/logger';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

// Demo credentials removed for security - no hardcoded credentials in production

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [invitationData, setInvitationData] = useState<{ email: string; role: string } | null>(null);

  // Use lazy initial state to avoid reading searchParams during render
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(() =>
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );

  // Memoize tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as 'login' | 'register');
  }, []);

  // Memoize input handlers to prevent recreating functions on every render
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  }, []);

  const handleFullNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    setValidationErrors(prev => ({ ...prev, fullName: '' }));
  }, []);

  const handleEmailWithValidationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setValidationErrors(prev => ({ ...prev, email: '' }));
  }, []);

  const handlePasswordWithValidationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setValidationErrors(prev => ({ ...prev, password: '' }));
  }, []);

  const handleConfirmPasswordWithValidationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
  }, []);

  // Memoize password requirements to avoid recalculation on every render
  const passwordRequirements = useMemo(() => [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Um número', met: /[0-9]/.test(password) },
    { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Verificar convite se token presente
    const checkInvitation = async () => {
      if (!inviteToken) return;

      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('email, role')
          .eq('token', inviteToken)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          toast({
            title: 'Convite inválido',
            description: 'Este convite expirou ou já foi utilizado',
            variant: 'destructive',
          });
          return;
        }

        setInvitationData(data);
        setEmail(data.email);
        toast({
          title: 'Convite válido!',
          description: `Você foi convidado como ${data.role}`,
        });
      } catch (err) {
        logger.error('Erro ao verificar convite', err, 'Auth');
      }
    };

    checkInvitation();
  }, [inviteToken, toast]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        setError(error.message);
        toast({
          title: 'Erro no login',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      logger.error('Erro no login com Google', err, 'Auth');
      setError('Erro ao conectar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        setError(error.message);
        toast({
          title: 'Erro no login',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      logger.error('Erro no login com GitHub', err, 'Auth');
      setError('Erro ao conectar com GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');



    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });



      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao FisioFlow",
        });

        navigate('/');
      }
    } catch (err: unknown) {
      logger.error('Erro no login', err, 'Auth');

      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setError('');
    setValidationErrors({});

    try {
      // Validar campos com Zod
      const fullNameResult = fullNameSchema.safeParse(fullName.trim());
      const emailResult = emailSchema.safeParse(email.trim());
      const passwordResult = passwordSchema.safeParse(password);

      const errors: Record<string, string> = {};

      if (!fullNameResult.success) {
        errors.fullName = fullNameResult.error.errors[0].message;
      }
      if (!emailResult.success) {
        errors.email = emailResult.error.errors[0].message;
      }
      if (!passwordResult.success) {
        errors.password = passwordResult.error.errors[0].message;
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setLoading(false);
        toast({
          title: 'Erro de validação',
          description: 'Por favor, corrija os campos destacados',
          variant: 'destructive',
        });
        return;
      }

      const redirectUrl = `${window.location.origin}/`;

      logger.info('Iniciando cadastro', { email: email.trim() }, 'Auth');

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (signUpError) {
        logger.error('Erro no cadastro do Supabase', signUpError, 'Auth');
        let errorMessage = signUpError.message;

        if (signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.';
        } else if (signUpError.message.includes('Password')) {
          errorMessage = 'Senha inválida. Verifique os requisitos de senha.';
        }

        setError(errorMessage);
        toast({
          title: 'Erro no cadastro',
          description: errorMessage,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erro ao criar conta. Tente novamente.');
        toast({
          title: 'Erro no cadastro',
          description: 'Não foi possível criar a conta. Tente novamente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      logger.info('Conta criada com sucesso', { userId: authData.user.id }, 'Auth');

      // Se houver token de convite, validar e atribuir role
      if (inviteToken && authData.user) {
        try {
          const { data: validationResult, error: validationError } = await supabase.rpc(
            'validate_invitation',
            {
              _token: inviteToken,
              _user_id: authData.user.id,
            }
          );

          if (validationError || !validationResult) {
            logger.error('Erro ao validar convite', validationError, 'Auth');
            toast({
              title: 'Aviso',
              description: 'Conta criada, mas houve erro ao processar o convite',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Conta criada com sucesso!',
              description: `Role ${invitationData?.role} atribuída. Redirecionando...`,
            });
            // Limpar campos
            setFullName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            // Redirecionar para home após 2 segundos
            setTimeout(() => {
              navigate('/');
            }, 2000);
            return;
          }
        } catch (inviteErr) {
          logger.error('Erro ao processar convite', inviteErr, 'Auth');
        }
      }

      // Sucesso no cadastro
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Verifique seu email para confirmar a conta. Você será redirecionado...',
      });

      // Salvar email cadastrado e limpar outros campos
      const registeredEmail = email.trim();
      setFullName('');
      setPassword('');
      setConfirmPassword('');
      setValidationErrors({});

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        setActiveTab('login');
        setEmail(registeredEmail);
      }, 3000);

    } catch (err: unknown) {
      logger.error('Erro no cadastro', err, 'Auth');
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.';
      setError(errorMessage);
      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout>
      <Card className="border-border/50 shadow-xl shadow-primary/5 bg-background/80 backdrop-blur-sm">
        <CardHeader className="space-y-1.5 pb-6">
          <CardTitle className="text-2xl font-bold text-center">
            {activeTab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {activeTab === 'login'
              ? 'Entre com suas credenciais para acessar sua conta'
              : 'Preencha os dados abaixo para começar'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50">
              <TabsTrigger
                value="login"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-150"
                tabIndex={0}
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-150"
                tabIndex={-1}
              >
                Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5 mt-6 focus-visible:outline-none">
              <LoginForm
                onSubmit={handleSignIn}
                email={email}
                onEmailChange={handleEmailChange}
                password={password}
                onPasswordChange={handlePasswordChange}
                loading={loading}
                error={error}
                activeTab={activeTab}
              />
            </TabsContent>

            <TabsContent value="register" className="space-y-5 mt-6 focus-visible:outline-none">
              <RegisterForm
                onSubmit={handleSignUp}
                fullName={fullName}
                onFullNameChange={handleFullNameChange}
                email={email}
                onEmailChange={handleEmailWithValidationChange}
                password={password}
                onPasswordChange={handlePasswordWithValidationChange}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={handleConfirmPasswordWithValidationChange}
                loading={loading}
                error={error}
                validationErrors={validationErrors}
                invitationData={invitationData}
                passwordRequirements={passwordRequirements}
                activeTab={activeTab}
              />
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <OAuthButtons
            loading={loading}
            onGoogleClick={handleGoogleSignIn}
            onGithubClick={handleGithubSignIn}
            activeTab={activeTab}
          />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground px-4">
        Ao continuar, você concorda com nossos{' '}
        <a href="#" className="underline hover:text-foreground transition-colors">Termos de Serviço</a>{' '}
        e <a href="#" className="underline hover:text-foreground transition-colors">Política de Privacidade</a>.
      </p>
    </AuthLayout>
  );
}
