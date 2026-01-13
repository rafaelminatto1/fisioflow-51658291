import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Heart, Shield, CheckCircle, XCircle, Mail, Stethoscope, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { passwordSchema, emailSchema, fullNameSchema } from '@/lib/validations/auth';
import { Separator } from '@/components/ui/separator';
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
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(searchParams.get('mode') === 'register' ? 'register' : 'login');

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
            // Redirecionar após 2 segundos
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

      // Limpar campos
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setValidationErrors({});

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/auth/login');
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

  // Função auxiliar para verificar requisitos de senha em tempo real
  const getPasswordRequirements = () => {
    const requirements = [
      { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
      { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
      { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
      { label: 'Um número', met: /[0-9]/.test(password) },
      { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(password) },
    ];
    return requirements;
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Side - Hero & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 z-0">
          {/* Fallback pattern or gradient if image fails load, but we expect it to work */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 mix-blend-multiply" />
          <img
            src="/hero-bg.jpg" // Assuming it's in public or we import. Let's try to import it at top, or if it is in src/assets I need to import it.
            // Wait, if I use src/assets I MUST import it. I'll check imports first. 
            // EDIT: I will output the FULL file content with imports included to be safe and correct.
            alt="Physiotherapy Session"
            className="w-full h-full object-cover opacity-90"
          />
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 text-white bg-black/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">FisioFlow</h1>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Transforme a gestão da sua clínica.
            </h2>
            <p className="text-lg text-white/90 leading-relaxed font-light">
              Uma plataforma completa para fisioterapeutas que buscam eficiência,
              organização e a melhor experiência para seus pacientes.
            </p>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-primary-foreground/50 bg-gray-300 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600 bg-white`}>
                    {/* Placeholder avatars */}
                    U{i}
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-white/90">
                <span className="font-bold text-white">Mais de 1.000+</span> profissionais confiam.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-white/60 font-medium">
            <p>© 2026 FisioFlow Inc.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative bg-surface-50">
        {/* Mobile Header Branding */}
        <div className="lg:hidden absolute top-8 left-0 w-full flex justify-center mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Stethoscope className="w-8 h-8" />
            <span className="text-2xl font-bold">FisioFlow</span>
          </div>
        </div>

        <div className="w-full max-w-[420px] space-y-8 animate-fade-in">
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">
              {activeTab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeTab === 'login'
                ? 'Entre com suas credenciais para acessar sua conta.'
                : 'Preencha os dados abaixo para começar sua jornada.'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/40 rounded-xl mb-6">
              <TabsTrigger value="login" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6 focus-visible:outline-none">
              <form onSubmit={handleSignIn} className="space-y-4">

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password">Senha</Label>
                      <a href="#" className="text-xs text-primary font-medium hover:underline tabindex-[-1]">Esqueceu a senha?</a>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-slide-up-fade">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-lg"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar na Plataforma'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-6 focus-visible:outline-none">
              <form onSubmit={handleSignUp} className="space-y-4">
                {invitationData && (
                  <Alert className="bg-primary/5 border-primary/20 text-primary">
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="font-medium">
                      Convite aceito: <strong>{invitationData.role}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-name">Nome Completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, fullName: '' }));
                      }}
                      required
                      className="h-11 bg-white dark:bg-black/20"
                    />
                    {validationErrors.fullName && <span className="text-xs text-destructive font-medium">{validationErrors.fullName}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setValidationErrors(prev => ({ ...prev, email: '' }));
                      }}
                      required
                      disabled={!!invitationData}
                      className="h-11 bg-white dark:bg-black/20"
                    />
                    {validationErrors.email && <span className="text-xs text-destructive font-medium">{validationErrors.email}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setValidationErrors(prev => ({ ...prev, password: '' }));
                        }}
                        required
                        className="h-11 bg-white dark:bg-black/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-confirm-password">Confirmar</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        required
                        className="h-11 bg-white dark:bg-black/20"
                      />
                    </div>
                  </div>

                  {/* Password Requirements simplified */}
                  {password && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                      {getPasswordRequirements().map((req, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                          {req.met ? <CheckCircle className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-current" />}
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-lg"
                  disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar Conta Gratuita'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou continue com</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-lg border-muted-foreground/20 hover:bg-muted/30 hover:border-muted-foreground/40 transition-all"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Ao continuar, você concorda com nossos <a href="#" className="underline hover:text-primary">Termos de Serviço</a> e <a href="#" className="underline hover:text-primary">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}