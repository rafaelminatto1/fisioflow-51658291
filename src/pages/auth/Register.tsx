import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterWizard } from '@/components/auth/RegisterWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Register() {
  const { user, loading } = useAuth();
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Redirecionar se já estiver logado
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Cadastro realizado!
            </CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Enviamos um email de confirmação para você. Verifique sua caixa de entrada 
                e clique no link para ativar sua conta.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Já confirmou seu email?
              </p>
              <Link to="/auth/login">
                <Button className="w-full">
                  Fazer login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para login
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold">Criar conta</h1>
            <p className="text-muted-foreground">
              Junte-se ao FisioFlow hoje mesmo
            </p>
          </div>

          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        <RegisterWizard onComplete={() => setRegistrationComplete(true)} />
      </div>
    </div>
  );
}