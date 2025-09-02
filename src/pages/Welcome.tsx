import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus } from 'lucide-react';

export function Welcome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <div className="text-primary-foreground font-bold text-xl">F</div>
          </div>
          <CardTitle className="text-3xl font-bold">FisioFlow</CardTitle>
          <CardDescription>
            Sistema completo de gestão para fisioterapeutas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Link to="/auth/login">
            <Button className="w-full" size="lg">
              <LogIn className="w-5 h-5 mr-2" />
              Entrar
            </Button>
          </Link>

          <Link to="/auth/register">
            <Button variant="outline" className="w-full" size="lg">
              <UserPlus className="w-5 h-5 mr-2" />
              Criar conta
            </Button>
          </Link>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Gerencie pacientes, agendamentos e muito mais
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}