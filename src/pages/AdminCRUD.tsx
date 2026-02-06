import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {

  Users,
  Calendar,
  Dumbbell,
  FileText,
  Building2,
  Briefcase,
  Activity,
  DollarSign,
  ClipboardList,
  TrendingUp
} from 'lucide-react';
import { PatientsManager } from '@/components/admin/crud/PatientsManager';
import { ExercisesManager } from '@/components/admin/crud/ExercisesManager';
import { EmpresasManager } from '@/components/admin/crud/EmpresasManager';
import { TransacoesManager } from '@/components/admin/crud/TransacoesManager';

export default function AdminCRUD() {
  const [activeTab, setActiveTab] = useState('pacientes');

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Administração do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie todas as entidades do sistema em um só lugar
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 h-auto bg-muted/50 p-2">
            <TabsTrigger value="pacientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
            </TabsTrigger>
            <TabsTrigger value="exercicios" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">Exercícios</span>
            </TabsTrigger>
            <TabsTrigger value="prontuarios" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Prontuários</span>
            </TabsTrigger>
            <TabsTrigger value="empresas" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresas</span>
            </TabsTrigger>
            <TabsTrigger value="transacoes" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Transações</span>
            </TabsTrigger>
            <TabsTrigger value="mais" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Mais</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pacientes" className="space-y-4">
            <PatientsManager />
          </TabsContent>

          <TabsContent value="agendamentos" className="space-y-4">
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-8">
                Use a página de <a href="/schedule" className="text-primary hover:underline">Agenda</a> para gerenciar agendamentos
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="exercicios" className="space-y-4">
            <ExercisesManager />
          </TabsContent>

          <TabsContent value="prontuarios" className="space-y-4">
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-8">
                Acesse os prontuários através da página de <a href="/patients" className="text-primary hover:underline">Pacientes</a>
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="empresas" className="space-y-4">
            <EmpresasManager />
          </TabsContent>

          <TabsContent value="transacoes" className="space-y-4">
            <TransacoesManager />
          </TabsContent>

          <TabsContent value="mais" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/eventos'}>
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Eventos</h3>
                </div>
                <p className="text-sm text-muted-foreground">Gerenciar eventos e corridas</p>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/vouchers'}>
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Vouchers</h3>
                </div>
                <p className="text-sm text-muted-foreground">Gerenciar vouchers e pacotes</p>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/user-management'}>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Usuários</h3>
                </div>
                <p className="text-sm text-muted-foreground">Gerenciar usuários e permissões</p>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/financial'}>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Financeiro</h3>
                </div>
                <p className="text-sm text-muted-foreground">Dashboard financeiro</p>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/reports'}>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Relatórios</h3>
                </div>
                <p className="text-sm text-muted-foreground">Gerar relatórios</p>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/audit-logs'}>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Auditoria</h3>
                </div>
                <p className="text-sm text-muted-foreground">Logs de auditoria</p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
