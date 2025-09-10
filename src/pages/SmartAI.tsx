import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

const SmartAI = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <section className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart AI</h1>
            <p className="text-muted-foreground">
              Assistente inteligente para fisioterapia
            </p>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>IA em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Em breve</h3>
              <p className="text-muted-foreground">
                O assistente de IA será implementado na próxima atualização
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SmartAI;