import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, Mail, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { passwordSchema, emailSchema, fullNameSchema } from '@/lib/validations/auth';
import { logger } from '@/lib/errors/logger';

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
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Static background orbs - removed animations for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/5 dark:bg-sky-700/5 rounded-full blur-3xl" />
      </div>

      {/* Left Side - Hero & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-sky-400/20" />
          {/* Image removed due to missing asset - relying on CSS gradients */}
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-16">
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">FisioFlow</h1>
          </div>

          <div className="space-y-6 max-w-xl animate-slide-up-fade delay-100">
            <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground">
              Transforme a gestão
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 mt-2">da sua clínica.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Uma plataforma completa para fisioterapeutas que buscam eficiência,
              organização e a melhor experiência para seus pacientes.
            </p>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground animate-fade-in delay-200">
            <p>© 2026 FisioFlow Inc.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors duration-200">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors duration-200">Termos</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative">
        {/* Mobile Header Branding */}
        <div className="lg:hidden absolute top-8 left-0 w-full flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">FisioFlow</span>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
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
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="nome@exemplo.com"
                          value={email}
                          onChange={handleEmailChange}
                          className="h-11"
                          required
                          tabIndex={activeTab === 'login' ? 1 : -1}
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                          <a
                            href="#"
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                            tabIndex={activeTab === 'login' ? 5 : -1}
                          >
                            Esqueceu a senha?
                          </a>
                        </div>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={handlePasswordChange}
                          className="h-11"
                          required
                          tabIndex={activeTab === 'login' ? 2 : -1}
                          autoComplete="current-password"
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="animate-slide-up-fade">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
                      disabled={loading}
                      tabIndex={activeTab === 'login' ? 3 : -1}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Entrar na Plataforma
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-5 mt-6 focus-visible:outline-none">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {invitationData && (
                      <Alert className="bg-primary/5 border-primary/20 text-primary">
                        <Mail className="h-4 w-4" />
                        <AlertDescription className="text-sm font-medium">
                          Convite aceito: <strong>{invitationData.role}</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-sm font-medium">Nome Completo</Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Seu nome"
                          value={fullName}
                          onChange={handleFullNameChange}
                          required
                          className="h-11"
                          tabIndex={activeTab === 'register' ? 1 : -1}
                          autoComplete="name"
                        />
                        {validationErrors.fullName && <span className="text-xs text-destructive font-medium">{validationErrors.fullName}</span>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={handleEmailWithValidationChange}
                          required
                          disabled={!!invitationData}
                          className="h-11"
                          tabIndex={activeTab === 'register' ? 2 : -1}
                          autoComplete="email"
                        />
                        {validationErrors.email && <span className="text-xs text-destructive font-medium">{validationErrors.email}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-password" className="text-sm font-medium">Senha</Label>
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={handlePasswordWithValidationChange}
                            required
                            className="h-11"
                            tabIndex={activeTab === 'register' ? 3 : -1}
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-confirm-password" className="text-sm font-medium">Confirmar</Label>
                          <Input
                            id="register-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordWithValidationChange}
                            required
                            className="h-11"
                            tabIndex={activeTab === 'register' ? 4 : -1}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>

                      {/* Password Requirements */}
                      {password && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
                          {passwordRequirements.map((req, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                              {req.met ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-current opacity-50" />}
                              {req.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
                      disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                      tabIndex={activeTab === 'register' ? 5 : -1}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Criar Conta Gratuita
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Separator />

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 text-sm font-medium transition-all duration-150 active:scale-[0.98]"
                tabIndex={activeTab === 'login' ? 4 : 6}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground px-4">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="underline hover:text-foreground transition-colors">Termos de Serviço</a>{' '}
            e <a href="#" className="underline hover:text-foreground transition-colors">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
