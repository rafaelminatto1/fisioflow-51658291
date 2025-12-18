import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, Users, Calendar, FileText, CreditCard, 
  MessageSquare, CheckCircle, ArrowRight, X, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  route?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao FisioFlow!',
    description: 'Sistema completo para gestão de clínicas de fisioterapia. Vamos fazer um tour rápido pelas principais funcionalidades.',
    icon: <Heart className="h-12 w-12 text-primary" />,
  },
  {
    id: 'patients',
    title: 'Gestão de Pacientes',
    description: 'Cadastre e gerencie todos os seus pacientes, histórico clínico, evolução e documentos em um só lugar.',
    icon: <Users className="h-12 w-12 text-primary" />,
    action: 'Ver Pacientes',
    route: '/patients',
  },
  {
    id: 'schedule',
    title: 'Agenda Inteligente',
    description: 'Organize seus atendimentos com uma agenda visual e intuitiva. Configure horários, salas e lembretes automáticos.',
    icon: <Calendar className="h-12 w-12 text-primary" />,
    action: 'Ver Agenda',
    route: '/schedule',
  },
  {
    id: 'evolution',
    title: 'Evolução Clínica (SOAP)',
    description: 'Registre evoluções no formato SOAP, anexe fotos, mapas de dor e exames. Tudo organizado por paciente.',
    icon: <FileText className="h-12 w-12 text-primary" />,
    action: 'Ver Prontuário',
    route: '/medical-record',
  },
  {
    id: 'financial',
    title: 'Controle Financeiro',
    description: 'Gerencie pacotes de sessões, pagamentos, contas a pagar e receber, tudo integrado com a agenda.',
    icon: <CreditCard className="h-12 w-12 text-primary" />,
    action: 'Ver Financeiro',
    route: '/financial',
  },
  {
    id: 'communication',
    title: 'Comunicação Automatizada',
    description: 'Envie lembretes de consulta por WhatsApp, e-mails de aniversário e campanhas de marketing.',
    icon: <MessageSquare className="h-12 w-12 text-primary" />,
    action: 'Ver Comunicações',
    route: '/communications',
  },
  {
    id: 'complete',
    title: 'Tudo Pronto!',
    description: 'Você está pronto para começar. Explore o sistema e entre em contato se precisar de ajuda.',
    icon: <CheckCircle className="h-12 w-12 text-success" />,
  },
];

export const OnboardingTour = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check onboarding status
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If no record, user hasn't seen onboarding
      if (error && error.code === 'PGRST116') {
        return { show: true };
      }

      return data;
    }
  });

  // Initialize onboarding if needed
  useEffect(() => {
    const initOnboarding = async () => {
      const data = onboardingData as any;
      if (data?.show && !data?.completed_at) {
        setIsOpen(true);
        
        // Create onboarding record
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

          await supabase
            .from('onboarding_progress')
            .upsert({
              user_id: user.id,
              organization_id: profile?.organization_id,
              tour_shown: true,
            });
        }
      }
    };

    initOnboarding();
  }, [onboardingData]);

  // Complete onboarding mutation
  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('onboarding_progress')
        .update({
          completed_at: new Date().toISOString(),
          completed_steps: onboardingSteps.map(s => s.id),
        })
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    }
  });

  // Skip onboarding mutation
  const skipOnboarding = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('onboarding_progress')
        .update({
          skipped_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    }
  });

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding.mutate();
      setIsOpen(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    const step = onboardingSteps[currentStep];
    if (step.route) {
      setIsOpen(false);
      navigate(step.route);
    }
  };

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={() => skipOnboarding.mutate()}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {step.icon}
            </div>
            <DialogTitle className="text-xl">{step.title}</DialogTitle>
            <DialogDescription className="mt-2">
              {step.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            Passo {currentStep + 1} de {onboardingSteps.length}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              Anterior
            </Button>
          )}
          
          {step.action && (
            <Button variant="secondary" onClick={handleAction}>
              {step.action}
            </Button>
          )}
          
          <Button onClick={handleNext}>
            {currentStep < onboardingSteps.length - 1 ? (
              <>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Começar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
