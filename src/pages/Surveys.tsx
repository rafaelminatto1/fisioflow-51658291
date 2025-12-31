import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSatisfactionSurveys, useSurveyStats, useDeleteSurvey } from '@/hooks/useSatisfactionSurveys';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, TrendingUp, Users, MessageSquare, Download, Trash2, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Surveys() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);
  const { toast } = useToast();

  const filters = {
    responded: activeTab === 'responded' ? true : activeTab === 'pending' ? false : undefined,
  };

  const { data: surveys = [], isLoading } = useSatisfactionSurveys(filters);
  const { data: stats, isLoading: statsLoading } = useSurveyStats();
  const deleteSurvey = useDeleteSurvey();

  const filteredSurveys = surveys.filter(survey => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      survey.patient?.name?.toLowerCase().includes(search) ||
      survey.therapist?.name?.toLowerCase().includes(search) ||
      survey.comments?.toLowerCase().includes(search)
    );
  });

  const handleDelete = async () => {
    if (deleteSurveyId) {
      await deleteSurvey.mutateAsync(deleteSurveyId);
      setDeleteSurveyId(null);
    }
  };

  const getNPSLabel = (score: number | null) => {
    if (score === null) return 'Não respondido';
    if (score <= 6) return 'Detrator';
    if (score >= 7 && score <= 8) return 'Neutro';
    return 'Promotor';
  };

  const getNPSColor = (score: number | null) => {
    if (score === null) return 'secondary';
    if (score <= 6) return 'destructive';
    if (score >= 7 && score <= 8) return 'default';
    return 'default';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-primary" />
              </div>
              Pesquisas de Satisfação (NPS)
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e analise as pesquisas de satisfação dos pacientes
            </p>
          </div>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">NPS Score</p>
                    <p className="text-2xl font-bold">{stats?.nps || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pesquisas</p>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Promotores</p>
                    <p className="text-2xl font-bold">{stats?.promotores || 0}</p>
                  </div>
                  <Star className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Detratores</p>
                    <p className="text-2xl font-bold">{stats?.detratores || 0}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="responded">Respondidas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, fisioterapeuta ou comentário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredSurveys.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Nenhuma pesquisa encontrada"
                description="Não há pesquisas de satisfação no momento."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>NPS</TableHead>
                        <TableHead>Qualidade</TableHead>
                        <TableHead>Profissionalismo</TableHead>
                        <TableHead>Comunicação</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSurveys.map((survey) => (
                        <TableRow key={survey.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{survey.patient?.name || 'N/A'}</p>
                              {survey.therapist && (
                                <p className="text-sm text-muted-foreground">
                                  {survey.therapist.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getNPSColor(survey.nps_score) as any}>
                              {survey.nps_score !== null ? `${survey.nps_score}/10` : 'N/A'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getNPSLabel(survey.nps_score)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {survey.q_care_quality !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{survey.q_care_quality}/5</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {survey.q_professionalism !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{survey.q_professionalism}/5</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {survey.q_communication !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{survey.q_communication}/5</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {survey.responded_at ? (
                              <div>
                                <p className="text-sm">
                                  {format(new Date(survey.responded_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(survey.responded_at), 'HH:mm', { locale: ptBR })}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteSurveyId(survey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteSurveyId} onOpenChange={() => setDeleteSurveyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pesquisa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pesquisa de satisfação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteSurvey.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

