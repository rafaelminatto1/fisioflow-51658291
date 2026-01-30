import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Activity, Brain, Users, Calendar, BarChart3, ArrowRight, Star, Shield, Zap } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Gestão de Pacientes",
      description: "Cadastro completo, histórico médico e evolução detalhada de cada paciente",
      status: "Ativo"
    },
    {
      icon: <Calendar className="h-8 w-8 text-green-600" />,
      title: "Agendamento Inteligente",
      description: "Sistema de agendamento com lembretes automáticos e gestão de horários",
      status: "Ativo"
    },
    {
      icon: <Activity className="h-8 w-8 text-purple-600" />,
      title: "Exercícios Personalizados",
      description: "Biblioteca de exercícios com prescrições personalizadas e acompanhamento",
      status: "Ativo"
    },
    {
      icon: <Brain className="h-8 w-8 text-red-600" />,
      title: "IA Especializada",
      description: "Assistente de IA treinado em fisioterapia para suporte clínico",
      status: "Novo"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      title: "Analytics Avançado",
      description: "Relatórios detalhados de progresso e estatísticas da clínica",
      status: "Ativo"
    },
    {
      icon: <Shield className="h-8 w-8 text-teal-600" />,
      title: "Prontuário Eletrônico",
      description: "Sistema completo de prontuário digital com padrão SOAP",
      status: "Ativo"
    }
  ];

  const benefits = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Eficiência",
      description: "Reduza o tempo administrativo em até 60%"
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Qualidade",
      description: "Melhore a qualidade do atendimento com IA"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Segurança",
      description: "Dados protegidos com criptografia avançada"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary/10 p-3 rounded-full">
                <Heart className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Activity <span className="text-primary">Fisioterapia</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Sistema completo de gestão clínica com inteligência artificial para fisioterapeutas modernos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/auth/login')}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
              >
                Acessar Sistema
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                onClick={() => navigate('/auth/register')}
                variant="outline"
                size="lg"
                className="px-8 py-3"
              >
                Criar Conta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades Completas
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tudo que você precisa para modernizar sua prática clínica
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {feature.icon}
                  </div>
                  <Badge 
                    variant={feature.status === 'Novo' ? 'default' : 'secondary'}
                    className={feature.status === 'Novo' ? 'bg-green-500 text-white' : ''}
                  >
                    {feature.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Activity?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary/10 p-4 rounded-full inline-flex mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comece hoje mesmo
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Transforme sua prática clínica com tecnologia de ponta
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/auth/register')}
              size="lg"
              variant="secondary"
              className="px-8 py-3"
            >
              Cadastrar Grátis
            </Button>
            
            <Button 
              onClick={() => navigate('/auth/login')}
              size="lg"
              variant="outline"
              className="px-8 py-3 border-white text-white hover:bg-white hover:text-primary"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center mb-4">
            <Heart className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold">Activity Fisioterapia</span>
          </div>
          <p className="text-gray-400">
            © 2024 Activity Fisioterapia. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}