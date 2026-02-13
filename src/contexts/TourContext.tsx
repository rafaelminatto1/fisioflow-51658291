import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { profile } = useAuth();

  const steps: TourStep[] = [
    {
      target: '#sidebar-home',
      title: 'Seu QG',
      content: 'Aqui é onde a mágica acontece. Se o sistema estiver lento, respire fundo e conte até 10... ou verifique sua internet!',
      position: 'right'
    },
    {
      target: '#sidebar-patients',
      title: 'Seus Atletas (ou quase isso)',
      content: 'Gerencie seus pacientes aqui. Lembre-se: prontuário em dia é como alongamento, dói na hora mas evita problemas depois.',
      position: 'right'
    },
    {
      target: '#sidebar-schedule',
      title: 'Agenda de Ferro',
      content: 'Organize seus horários. Se um paciente faltar, não chore, use o tempo para estudar (ou tomar um café).',
      position: 'right'
    }
  ];

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const endTour = () => {
    setIsActive(false);
    localStorage.setItem('fisioflow_tour_completed', 'true');
  };

  useEffect(() => {
    const hasCompleted = localStorage.getItem('fisioflow_tour_completed');
    if (!hasCompleted && profile) {
      // Pequeno delay para garantir que o layout carregou
      const timer = setTimeout(() => startTour(), 2000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, steps, startTour, nextStep, prevStep, endTour }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within TourProvider');
  return context;
};
