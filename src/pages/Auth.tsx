import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Heart, Shield, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { passwordSchema, emailSchema, fullNameSchema } from '@/lib/validations/auth';
import { Separator } from '@/components/ui/separator';

// Credenciais de demonstração
const DEMO_CREDENTIALS = [
  { email: 'admin@fisioflow.com', password: 'Admin@2025', role: 'Administrador', description: 'Acesso completo ao sistema' },
  { email: 'fisio@fisioflow.com', password: 'Fisio@2025', role: 'Fisioterapeuta', description: 'Gerenciar pacientes e eventos' },
  { email: 'estagiario@fisioflow.com', password: 'Estag@2025', role: 'Estagiário', description: 'Acesso limitado' },
];

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
        console.error('Error checking invitation:', err);
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
      console.error('Google sign in error:', err);
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
      console.error('Sign in error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors({});

    try {
      // Validar campos com Zod
      const fullNameResult = fullNameSchema.safeParse(fullName);
      const emailResult = emailSchema.safeParse(email);
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
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Se houver token de convite, validar e atribuir role
      if (inviteToken && authData.user) {
        const { data: validationResult, error: validationError } = await supabase.rpc(
          'validate_invitation',
          {
            _token: inviteToken,
            _user_id: authData.user.id,
          }
        );

        if (validationError || !validationResult) {
          console.error('Erro ao validar convite:', validationError);
          toast({
            title: 'Aviso',
            description: 'Conta criada, mas houve erro ao processar o convite',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Conta criada com sucesso!',
            description: `Role ${invitationData?.role} atribuída`,
          });
        }
      } else {
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Verifique seu email para confirmar a conta',
        });
      }
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      setError('Erro inesperado. Tente novamente.');
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
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2 text-white">
              <Heart className="h-8 w-8" />
              <span className="text-2xl font-bold">FisioFlow</span>
            </div>
          </div>
          <p className="text-white/80">Sistema de Gestão para Fisioterapeutas</p>
        </div>

        <Card className="border-0 shadow-medical">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Acesso Seguro</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Credenciais de Demonstração */}
                  <Alert className="bg-primary/5 border-primary/20">
                    <Shield className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      <strong className="block mb-2">Credenciais para Demonstração:</strong>
                      <div className="space-y-2">
                        {DEMO_CREDENTIALS.map((cred, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                            <div className="text-xs">
                              <div className="font-semibold text-primary">{cred.role}</div>
                              <div className="text-muted-foreground">{cred.email}</div>
                              <div className="text-muted-foreground">{cred.password}</div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fillDemoCredentials(cred.email, cred.password)}
                            >
                              Usar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
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
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
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
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}