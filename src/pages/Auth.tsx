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