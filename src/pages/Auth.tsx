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
    <div className="min-h-screen gradient-background-login flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-background-dark/80 rounded-xl shadow-xl m-4 transform transition duration-500 hover:scale-[1.01]">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-primary dark:text-white flex items-center justify-center gap-2">
            <Stethoscope className="h-10 w-10" />
            FisioFlow
          </h1>
          <p className="mt-4 text-md text-gray-700 dark:text-gray-300">Bem-vindo à sua nova jornada conosco!</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Faça login para desbloquear seu perfil.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Cadastro</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-8">
            <form onSubmit={handleSignIn} className="space-y-6">

              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <Label htmlFor="login-email" className="sr-only">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-t-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-gray-50 dark:bg-background-dark/20 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 transition duration-300"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className="sr-only">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-b-xl relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-gray-50 dark:bg-background-dark/20 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 transition duration-300"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-300 transform hover:-translate-y-0.5" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <LogIn className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                )}
              </Button>

                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar com Google
                  </Button>

                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Não tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="text-primary hover:underline font-medium"
                      >
                        Cadastre-se aqui
                      </button>
                    </p>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="mt-8">
                <form onSubmit={handleSignUp} className="space-y-6">
                  {invitationData && (
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Você foi convidado como <strong>{invitationData.role}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome Completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, fullName: '' }));
                      }}
                      required
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-destructive">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
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
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-destructive">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
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
                    />
                    {validationErrors.password && (
                      <p className="text-sm text-destructive">{validationErrors.password}</p>
                    )}
                    
                    {/* Indicadores de requisitos de senha */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        {getPasswordRequirements().map((req, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {req.met ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar Senha</Label>
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
                    />
                    {validationErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                    onClick={(e) => {
                      // Garantir que o evento seja tratado
                      if (!loading && fullName.trim() && email.trim() && password && confirmPassword) {
                        handleSignUp(e);
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Criar Conta
                        <LogIn className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
      </div>
    </div>
  );
}