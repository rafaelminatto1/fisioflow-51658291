import { useState, lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CheckSquare, Send, Zap, BarChart3, Upload, Loader2 } from 'lucide-react';
import { LeadsContent } from './LeadsPage';
import { CRMTarefas } from '@/components/crm/CRMTarefas';
import { CRMCampanhas } from '@/components/crm/CRMCampanhas';
import { CRMAutomacoes } from '@/components/crm/CRMAutomacoes';
import { CRMAnalytics } from '@/components/crm/CRMAnalytics';

// Lazy load LeadImport (contém exceljs - ~946KB) - só carrega quando a tab é acessada
const LeadImport = lazy(() => import('@/components/crm/LeadImport').then(m => ({ default: m.LeadImport })));

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
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                  <p className="text-muted-foreground">Carregando importador...</p>
                </div>
              </div>
            }>
              <LeadImport />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
