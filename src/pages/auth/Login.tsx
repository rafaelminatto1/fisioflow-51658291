import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginFormData, loginSchema } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';



export function Login() {
  const { user, signIn, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Redirecionar se já estiver logado
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    
    console.log('🔐 Tentando fazer login com:', data.email);
    console.log('📊 Estado atual do usuário:', user);
    console.log('⏳ Loading:', loading);
    
    const { error } = await signIn(data.email, data.password, data.remember);
    
    console.log('📝 Resultado do login:', { error });
    
    if (error) {
      console.error('❌ Erro no login:', error);
      setError('root', {
        message: 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.'
      });
    } else {
      console.log('✅ Login bem-sucedido!');
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">FisioFlow</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Dados de teste */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Usuários para teste:</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">Admin:</span>
                <span>admin@fisioflow.com.br / senha123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Fisioterapeuta:</span>
                <span>joao@fisioflow.com.br / senha123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Estagiário:</span>
                <span>maria@fisioflow.com.br / senha123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Paciente:</span>
                <span>ana@email.com / senha123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Parceiro:</span>
                <span>carlos@parceiro.com / senha123</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                {...register('remember')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="remember" className="text-sm">
                Lembrar de mim
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Esqueceu sua senha?
            </Link>
            <div className="text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/auth/register" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}