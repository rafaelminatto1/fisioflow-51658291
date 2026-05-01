import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import {
  useSatisfactionSurveys,
  useSurveyStats,
  useDeleteSurvey,
} from "@/hooks/useSatisfactionSurveys";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, TrendingUp, Users, MessageSquare, Trash2, Search, CheckCircle2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkersApiUrl } from "@/lib/api/config";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

import { NPSSurveyForm } from "@/components/surveys/NPSSurveyForm";

export default function Surveys() {
  const [searchParams] = useSearchParams();
  const isPublicSurvey = searchParams.get("nps") === "1";
  const patientId = searchParams.get("p");
  const orgId = searchParams.get("org");
  const userId = searchParams.get("user");
  const { user, initialized, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);

  // Public survey state
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Redirect to dashboard if trying to access dashboard but not authenticated
  useEffect(() => {
    if (!isPublicSurvey && initialized && !authLoading && !user) {
      navigate("/auth/login?from=/surveys");
    }
  }, [isPublicSurvey, user, initialized, authLoading, navigate]);

  const filters = {
    responded: activeTab === "responded" ? true : activeTab === "pending" ? false : undefined,
  };

  const { data: surveys = [], isLoading } = useSatisfactionSurveys(filters);
  const { data: stats, isLoading: statsLoading } = useSurveyStats();
  const deleteSurvey = useDeleteSurvey();

  if (patientId) {
    if (submitted) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center py-8">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Obrigado pelo seu feedback!</h2>
              <p className="text-muted-foreground">
                Sua opinião é fundamental para continuarmos melhorando o FisioFlow.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-2xl">
          <div className="flex justify-center mb-6">
            <img src={logoImg} alt="FisioFlow" className="h-10" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <NPSSurveyForm 
            patientId={patientId} 
            onComplete={() => setSubmitted(true)} 
          />
        </div>
      </div>
    );
  }

  if (isPublicSurvey) {
    const handlePublicSubmit = async () => {
      if (npsScore === null || !orgId) return;
      setSaving(true);
      try {
        await fetch(`${getWorkersApiUrl()}/api/satisfaction-surveys/nps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            user_id: userId,
            score: npsScore,
            comment: comment.trim() || undefined,
          }),
        });
        setSubmitted(true);
      } catch {
        toast.error("Erro ao enviar avaliação.");
      } finally {
        setSaving(false);
      }
    };

    if (submitted) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center py-8">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Obrigado pelo seu feedback!</h2>
              <p className="text-muted-foreground">
                Sua opinião é fundamental para continuarmos melhorando o FisioFlow.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
                Ir para o Início
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-primary">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <img src={logoImg} alt="FisioFlow" className="h-10" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            <CardTitle className="text-2xl text-center">Como está sua experiência?</CardTitle>
            <CardDescription className="text-center text-base">
              De 0 a 10, o quanto você recomendaria o FisioFlow para um colega?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pb-8">
            <div className="flex justify-between items-center gap-1 sm:gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setNpsScore(score)}
                  className={`h-8 w-8 sm:h-12 sm:w-12 rounded-lg text-xs sm:text-lg font-bold transition-all transform hover:scale-110 ${
                    npsScore === score
                      ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary ring-offset-2"
                      : "bg-background border-2 hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Nada provável</span>
              <span>Extremamente provável</span>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Conte-nos mais (opcional):</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="O que você mais gosta? O que podemos melhorar?"
                rows={4}
                className="resize-none text-base"
              />
            </div>

            <Button 
              className="w-full text-lg py-6" 
              size="lg" 
              onClick={handlePublicSubmit}
              disabled={npsScore === null || saving || !orgId}
            >
              {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Enviar Avaliação
            </Button>
            
            {!orgId && (
              <p className="text-destructive text-center text-sm font-medium">
                Erro: Link inválido. Identificador da organização ausente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard View (only if authenticated)
  if (authLoading || !user) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  const filteredSurveys = surveys.filter((survey) => {
    if (!searchTerm) return true;
    return (
      accentIncludes(survey.patient?.full_name || "", searchTerm) ||
      accentIncludes(survey.therapist?.name || "", searchTerm) ||
      accentIncludes(survey.comments || "", searchTerm)
    );
  });

  const handleDelete = async () => {
    if (deleteSurveyId) {
      await deleteSurvey.mutateAsync(deleteSurveyId);
      setDeleteSurveyId(null);
    }
  };

  const getNPSLabel = (score: number | null) => {
    if (score === null) return "Não respondido";
    if (score <= 6) return "Detrator";
    if (score >= 7 && score <= 8) return "Neutro";
    return "Promotor";
  };

  const getNPSColor = (
    score: number | null,
  ): "secondary" | "destructive" | "default" | "outline" => {
    if (score === null) return "secondary";
    if (score <= 6) return "destructive";
    if (score >= 7 && score <= 8) return "default";
    return "default";
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
                              <p className="font-medium">{survey.patient?.full_name || "N/A"}</p>
                              {survey.therapist && (
                                <p className="text-sm text-muted-foreground">
                                  {survey.therapist.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getNPSColor(survey.nps_score)}>
                              {survey.nps_score !== null ? `${survey.nps_score}/10` : "N/A"}
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
                                  {format(new Date(survey.responded_at), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(survey.responded_at), "HH:mm", { locale: ptBR })}
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
              Tem certeza que deseja excluir esta pesquisa de satisfação? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteSurvey.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
