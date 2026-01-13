import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CheckSquare, Send, Zap, BarChart3, Upload } from 'lucide-react';
import { LeadsContent } from './LeadsPage';

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState('leads');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">CRM - Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie leads, campanhas, tarefas e automações de marketing
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automações</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-6">
            <LeadsContent />
          </TabsContent>

          <TabsContent value="tarefas" className="mt-6">
            <CRMTarefas />
          </TabsContent>

          <TabsContent value="campanhas" className="mt-6">
            <CRMCampanhas />
          </TabsContent>

          <TabsContent value="automacoes" className="mt-6">
            <CRMAutomacoes />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <CRMAnalytics />
          </TabsContent>

          <TabsContent value="importar" className="mt-6">
            <LeadImport />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
