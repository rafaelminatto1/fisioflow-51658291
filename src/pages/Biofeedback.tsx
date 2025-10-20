import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MovementAnalysis } from '@/components/biofeedback/MovementAnalysis';
import { Activity } from 'lucide-react';

const Biofeedback = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Biofeedback</h1>
            <p className="text-muted-foreground">
              Análise de movimento em tempo real com IA
            </p>
          </div>
        </div>

        <MovementAnalysis />
      </div>
    </MainLayout>
  );
};

export default Biofeedback;
