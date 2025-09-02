import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Stethoscope, Heart, Star } from 'lucide-react';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const userTypes = [
  {
    value: 'admin' as UserRole,
    title: 'Administrador',
    description: 'Acesso completo ao sistema',
    icon: Star,
    color: 'bg-purple-500'
  },
  {
    value: 'fisioterapeuta' as UserRole,
    title: 'Fisioterapeuta',
    description: 'Profissional de fisioterapia',
    icon: Stethoscope,
    color: 'bg-blue-500'
  },
  {
    value: 'estagiario' as UserRole,
    title: 'Estagiário',
    description: 'Estudante em formação',
    icon: UserCheck,
    color: 'bg-green-500'
  },
  {
    value: 'paciente' as UserRole,
    title: 'Paciente',
    description: 'Usuário em tratamento',
    icon: Heart,
    color: 'bg-red-500'
  },
  {
    value: 'parceiro' as UserRole,
    title: 'Educador Físico',
    description: 'Parceiro educador físico',
    icon: Users,
    color: 'bg-orange-500'
  }
];

export function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    // Simular login temporário baseado no papel
    localStorage.setItem('demo_user_role', role);
    localStorage.setItem('demo_user_id', 'demo-user-' + role);
    localStorage.setItem('demo_user_name', `Usuário Demo ${userTypes.find(t => t.value === role)?.title}`);
    
    // Redirecionar para a página principal
    navigate('/');
    window.location.reload(); // Força atualização para carregar o novo estado
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">FisioFlow</CardTitle>
          <CardDescription className="text-lg">
            Selecione seu perfil para acessar o sistema (Modo Teste)
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userTypes.map((userType) => {
              const Icon = userType.icon;
              return (
                <Card
                  key={userType.value}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedRole === userType.value 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedRole(userType.value)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full ${userType.color} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{userType.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {userType.description}
                    </p>
                    <Button
                      variant={selectedRole === userType.value ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleSelect(userType.value);
                      }}
                    >
                      Entrar como {userType.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Modo de Teste:</strong> Este é um ambiente de demonstração. 
                Não é necessário login ou senha para testar as funcionalidades.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}