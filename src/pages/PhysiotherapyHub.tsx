import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PosturalAssessment } from '@/components/physiotherapy/PosturalAssessment';
import { TreatmentPlan } from '@/components/physiotherapy/TreatmentPlan';
import { ProgressTracking } from '@/components/physiotherapy/ProgressTracking';
import { Activity, User, TrendingUp, ClipboardList } from 'lucide-react';

const PhysiotherapyHub = () => {
  const [activeTab, setActiveTab] = useState('assessment');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central Fisioterapêutica</h1>
            <p className="text-muted-foreground">
              Avaliação, tratamento e acompanhamento de pacientes
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assessment" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Avaliação</span>
            </TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tratamento</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Progresso</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessment">
            <PosturalAssessment />
          </TabsContent>

          <TabsContent value="treatment">
            <TreatmentPlan />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressTracking />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PhysiotherapyHub;
