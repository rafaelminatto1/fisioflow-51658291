/**
 * Automation Page - Dashboard de automações
 * Listagem e gerenciamento de automações visuais
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {

  Plus,
  History,
  Sparkles,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationCard, RecipeLibrary } from '@/components/automation/AutomationCard';
import { useAuth } from '@/contexts/AuthContext';
import { useAutomationLogs, type AutomationLogEntry } from '@/hooks/useAutomationLogs';

import type { Automation, AutomationRecipe, RecipeCategory } from '@/types/automation';

function formatLogDate(value: AutomationLogEntry['started_at']): string {
  if (!value) return '—';
  const date = typeof (value as { toDate?: () => Date }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date((value as { seconds: number }).seconds * 1000);
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

// Mock data
const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Bem-vindo ao paciente',
    description: 'Envia email e WhatsApp quando novo paciente é cadastrado',
    organization_id: 'org-1',
    created_by: 'user-1',
    is_active: true,
    trigger: {
      id: 't1',
      type: 'patient.created',
      config: {},
    },
    actions: [
      {
        id: 'a1',
        type: 'notification.email',
        order: 1,
        config: { template: 'welcome' },
      },
      {
        id: 'a2',
        type: 'notification.whatsapp',
        order: 2,
        config: { template: 'welcome_wa' },
      },
    ],
    execution_count: 156,
    last_executed_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
    last_status: 'success',
    created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
    updated_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
  },
  {
    id: '2',
    name: 'Lembrete de sessão',
    description: 'Envia lembrete 24h antes da sessão',
    organization_id: 'org-1',
    created_by: 'user-1',
    is_active: true,
    trigger: {
      id: 't2',
      type: 'schedule.daily',
      config: { time: '09:00' },
    },
    actions: [
      {
        id: 'a3',
        type: 'notification.whatsapp',
        order: 1,
        config: { template: 'appointment_reminder' },
      },
    ],
    execution_count: 423,
    last_executed_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
    last_status: 'success',
    created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
    updated_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
  },
];

const mockRecipes: AutomationRecipe[] = [
  {
    id: 'r1',
    name: 'Confirmação de agendamento',
    description: 'Envia confirmação imediata quando paciente agenda',
    category: 'reminders',
    icon: '📅',
    tags: ['agendamento', 'confirmação'],
    is_popular: true,
    trigger_template: { id: 't', type: 'appointment.created', config: {} },
    action_templates: [
      { type: 'notification.whatsapp', order: 1, config: {} },
    ],
    variables: [],
    created_by: 'system',
    created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
  },
  {
    id: 'r2',
    name: 'Reativação de inativos',
    description: 'Envia mensagem após 30 dias sem sessões',
    category: 'reactivation',
    icon: '♻️',
    tags: ['reativação', 'inativos'],
    trigger_template: { id: 't', type: 'patient.inactive', config: { days: 30 } },
    action_templates: [
      { type: 'notification.whatsapp', order: 1, config: {} },
      { type: 'notification.email', order: 2, config: {} },
    ],
    variables: [],
    created_by: 'system',
    created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
  },
];

export default function AutomationPage() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');

  const { data: automationLogs = [], isLoading: logsLoading } = useAutomationLogs(organizationId, { limitCount: 50 });

  const filteredRecipes = mockRecipes.filter(
    (r) => selectedCategory === 'all' || r.category === selectedCategory
  );

  const handleToggleActive = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, is_active: !a.is_active } : a
      )
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta automação?')) {
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleDuplicate = (automation: Automation) => {
    const newAutomation = {
      ...automation,
      id: `new-${Date.now()}`,
      name: `${automation.name} (cópia)`,
      execution_count: 0,
      is_active: false,
    };
    setAutomations((prev) => [...prev, newAutomation]);
  };

  const handleCreateNew = () => {
    navigate('/automation/new');
  };

  const handleSelectRecipe = (recipe: AutomationRecipe) => {
    // Criar automação baseada no template
    const newAutomation: Automation = {
      id: `new-${Date.now()}`,
      name: recipe.name,
      description: recipe.description,
      organization_id: 'org-1',
      created_by: 'user-1',
      is_active: false,
      trigger: recipe.trigger_template,
      actions: recipe.action_templates.map((a, i) => ({
        ...a,
        id: `a-${i}`,
      })),
      execution_count: 0,
      created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
      updated_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as unknown,
    };
    setAutomations((prev) => [...prev, newAutomation]);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background/50">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  Automações
                </h1>
                <p className="text-sm text-muted-foreground">
                  Crie fluxos de trabalho automáticos
                </p>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Automação
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <Tabs defaultValue="automations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="automations">
                Minhas Automações ({automations.length})
              </TabsTrigger>
              <TabsTrigger value="recipes">
                Biblioteca de Templates
              </TabsTrigger>
              <TabsTrigger value="history">
                Histórico de Execuções
              </TabsTrigger>
            </TabsList>

            {/* Minhas Automações */}
            <TabsContent value="automations" className="space-y-4">
              {automations.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma automação criada ainda
                      </p>
                      <Button onClick={handleCreateNew} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeira Automação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {automations.map((automation) => (
                    <AutomationCard
                      key={automation.id}
                      automation={automation}
                      onToggleActive={() => handleToggleActive(automation.id)}
                      onEdit={() => navigate(`/automation/${automation.id}`)}
                      onDuplicate={() => handleDuplicate(automation)}
                      onDelete={() => handleDelete(automation.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Biblioteca de Templates */}
            <TabsContent value="recipes">
              <RecipeLibrary
                recipes={filteredRecipes}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onSelectRecipe={handleSelectRecipe}
              />
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Execuções</CardTitle>
                  <CardDescription>
                    Acompanhe a execução das suas automações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Carregando histórico...</span>
                    </div>
                  ) : automationLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma execução registrada ainda.</p>
                      <p className="text-sm mt-1">As execuções aparecem aqui quando suas automações forem disparadas.</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Data</th>
                            <th className="text-left p-3 font-medium">Automação</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Duração</th>
                            <th className="text-left p-3 font-medium">Erro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {automationLogs.map((log) => (
                            <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="p-3 text-muted-foreground">{formatLogDate(log.started_at)}</td>
                              <td className="p-3 font-medium">{log.automation_name}</td>
                              <td className="p-3">
                                {log.status === 'success' && (
                                  <Badge variant="default" className="gap-1 bg-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Sucesso
                                  </Badge>
                                )}
                                {log.status === 'failed' && (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Falha
                                  </Badge>
                                )}
                                {log.status === 'skipped' && (
                                  <Badge variant="secondary" className="gap-1">
                                    <SkipForward className="h-3 w-3" />
                                    Ignorada
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-muted-foreground">{log.duration_ms} ms</td>
                              <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={log.error}>
                                {log.error ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
