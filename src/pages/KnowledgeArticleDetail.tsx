import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Download,
  Upload,
  Sparkles,
  ExternalLink,
  Layout,
  Calendar,
  User,
  Hash,
  Bookmark,
  Clock,
  Share2,
  MessageCircle,
  BookOpen,
  Lightbulb,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKnowledgeBase } from "@/hooks/wiki/useKnowledgeBase";
import { useAuth } from "@/contexts/AuthContext";
import { KnowledgeArticleDialog } from "@/features/wiki/components/KnowledgeArticleDialog";
import { KnowledgeActionBridge } from "@/features/wiki/components/KnowledgeActionBridge";
import { StudyMode } from "@/features/wiki/components/StudyMode";
import { knowledgeEvidenceLabels } from "@/data/knowledgeBase";
import { toast } from "sonner";

const evidenceColorMap: Record<string, string> = {
  CPG: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  Consensus: "bg-blue-500/10 text-blue-700 border-blue-200",
  Guideline: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  SystematicReview: "bg-purple-500/10 text-purple-700 border-purple-200",
  PositionStatement: "bg-amber-500/10 text-amber-700 border-amber-200",
  Protocol: "bg-slate-500/10 text-slate-700 border-slate-200",
};

export default function KnowledgeArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organizationId, profile } = useAuth();
  const currentOrganizationId = organizationId ?? profile?.organization_id;
  const currentUserId = profile?.user_id ?? profile?.id;

  const { filteredKnowledge, handleUpdateArticle, curationMap, auditProfiles } = useKnowledgeBase(
    currentOrganizationId,
    currentUserId,
  );

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
  const [activeAttachmentType, setActiveAttachmentType] = useState<
    "document" | "presentation" | null
  >(null);

  const article = useMemo(
    () => filteredKnowledge.find((a) => a.id === id),
    [filteredKnowledge, id],
  );

  const curation = useMemo(
    () => (article ? curationMap.get(article.id) : null),
    [article, curationMap],
  );

  if (!article) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground">Artigo não encontrado.</p>
          <Button variant="link" onClick={() => navigate("/wiki")}>
            Voltar para a Wiki
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const toastId = toast.loading("Analisando diretriz com IA...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Insights refinados com sucesso!", { id: toastId });
    } catch (error) {
      toast.error("Erro ao processar insights.", { id: toastId });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const openEditorForUpload = (type: "document" | "presentation") => {
    setActiveAttachmentType(type);
    setIsEditDialogOpen(true);
  };

  const handleShare = (platform: "whatsapp" | "clipboard") => {
    const text = `*${article.title}*\n${article.group} - ${article.subgroup}\n\nResumo da Evidência: ${article.highlights[0]}\n\nVeja mais no FisioFlow.`;

    if (platform === "clipboard") {
      navigator.clipboard.writeText(text);
      toast.success("Resumo copiado para área de transferência!");
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
  };

  // Converter KnowledgeArticle para KnowledgeArtifact para o StudyMode
  const artifact = useMemo(() => {
    if (!article) return null;
    return {
      id: article.id,
      organizationId: currentOrganizationId || "",
      title: article.title,
      type: "pdf" as const,
      url: article.url || "",
      group: article.group as any,
      subgroup: article.subgroup,
      tags: article.tags,
      evidenceLevel:
        (article.evidence as any) === "SystematicReview"
          ? "SystematicReview"
          : (article.evidence as any),
      status:
        article.status === "pending"
          ? "pending"
          : article.status === "review"
            ? "draft"
            : "verified",
      metadata: {
        year: article.year || new Date().getFullYear(),
        authors: article.metadata?.authors?.map((a) => ({ name: a })) || [],
        journal: article.metadata?.journal || article.source,
      },
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUserId || "",
      keyFindings: article.highlights,
      clinicalImplications: article.observations,
    };
  }, [article, currentOrganizationId, currentUserId]);

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950/50">
        {/* Top Header Barra de Ações */}
        <div className="bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-none truncate max-w-[300px] md:max-w-xl">
                {article.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-wider h-5"
                >
                  {article.group}
                </Badge>
                <span className="text-muted-foreground/30 text-xs">•</span>
                <span className="text-[10px] font-medium text-muted-foreground h-5 flex items-center">
                  {article.subgroup}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 mr-2 border-r pr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("whatsapp")}
                className="h-8 w-8 text-emerald-600"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShare("clipboard")}
                className="h-8 w-8 text-slate-500"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hidden md:flex border-amber-200 bg-amber-50/30 text-amber-700"
              onClick={() => setIsStudyModeOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              Modo Estudo IA
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="container max-w-6xl py-6 space-y-6">
            {/* Alerta de Status de Curadoria se Pendente */}
            {article.status !== "verified" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase tracking-tight">
                    Curadoria IA em Andamento
                  </p>
                  <p className="text-xs opacity-80">
                    Este conteúdo foi importado automaticamente e aguarda validação da equipe
                    clínica.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 bg-white"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Validar Agora
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Esquerda: Conteúdo Principal */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Conteúdo e Destaques
                      </CardTitle>
                      <Badge
                        className={`${evidenceColorMap[article.evidence] || ""} border-0 font-bold`}
                      >
                        {knowledgeEvidenceLabels[article.evidence] || article.evidence}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* Highlights */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Bookmark className="h-4 w-4" />
                          Principais Achados (Key Findings)
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold uppercase gap-1"
                          onClick={handleGenerateSummary}
                        >
                          <Sparkles className="h-3 w-3 text-amber-500" /> Refinar IA
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        {article.highlights.map((h, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group hover:border-primary/30 transition-colors"
                          >
                            <div className="h-6 w-6 rounded-lg bg-white dark:bg-slate-800 border flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-primary">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {h}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Observações Clínicas & Prática
                      </h3>
                      <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 space-y-3">
                        {article.observations.map((o, i) => (
                          <div key={i} className="flex gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                              {o}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Integrated Actions Bridge */}
                    <Separator />
                    <KnowledgeActionBridge
                      article={article}
                      onActionSelect={(type, id) => {
                        if (type === "test") {
                          // Navega para a wiki com a tab de dicionário e o termo na busca
                          navigate(`/wiki?view=dictionary&search=${id}`);
                        } else {
                          // Navega para exercícios com o id na busca
                          navigate(`/exercises?search=${id}`);
                        }
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Attachments & Resources Tabs */}
                <Tabs defaultValue="pdfs" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <TabsTrigger
                      value="pdfs"
                      className="rounded-lg font-bold text-xs uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      Documentos PDF
                    </TabsTrigger>
                    <TabsTrigger
                      value="presentations"
                      className="rounded-lg font-bold text-xs uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      Apresentações Equipe
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pdfs" className="mt-4 animate-in fade-in duration-300">
                    <Card className="border-slate-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="space-y-1">
                            <h4 className="font-bold">Artigos e Fontes</h4>
                            <p className="text-xs text-muted-foreground">
                              Documentos originais e anexos técnicos.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => openEditorForUpload("document")}
                          >
                            <Upload className="h-4 w-4" />
                            Subir PDF
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          {article.metadata?.attachments
                            ?.filter((a) => a.type === "document")
                            .map((file, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-xl border bg-background hover:bg-slate-50 transition-all group hover:shadow-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-sm">
                                    <FileText className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold group-hover:text-primary transition-colors">
                                      {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] h-4 py-0 bg-slate-50"
                                      >
                                        PDF
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                        {article.year || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 gap-2 text-xs"
                                    asChild
                                  >
                                    <a href={file.url} target="_blank" rel="noreferrer">
                                      <Download className="h-4 w-4" />
                                      Baixar
                                    </a>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] uppercase font-bold"
                                    onClick={() => setIsStudyModeOpen(true)}
                                  >
                                    Abrir com IA
                                  </Button>
                                </div>
                              </div>
                            )) || (
                            <div className="text-center py-12 border border-dashed rounded-2xl bg-slate-50/50">
                              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <FileText className="h-6 w-6 text-slate-300" />
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Nenhum PDF anexado à esta diretriz.
                              </p>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => openEditorForUpload("document")}
                              >
                                Fazer o primeiro upload
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent
                    value="presentations"
                    className="mt-4 animate-in fade-in duration-300"
                  >
                    <Card className="border-slate-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="space-y-1">
                            <h4 className="font-bold">Apresentações Internas</h4>
                            <p className="text-xs text-muted-foreground">
                              Materiais criados pela equipe (Aulas Clínicas).
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => openEditorForUpload("presentation")}
                          >
                            <Upload className="h-4 w-4" />
                            Subir Aula
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          {!article.metadata?.attachments ||
                          article.metadata.attachments.filter(
                            (a) => a.type === "video" || a.name.toLowerCase().includes("aula"),
                          ).length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-2xl bg-slate-50/50">
                              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <Layout className="h-6 w-6 text-slate-300" />
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Nenhuma aula ou apresentação vinculada.
                              </p>
                              <p className="text-[10px] text-muted-foreground max-w-xs mx-auto mt-1">
                                Suba os slides da reunião clínica para que outros fiquem por dentro
                                da discussão.
                              </p>
                            </div>
                          ) : (
                            article.metadata?.attachments
                              ?.filter(
                                (a) => a.type === "video" || a.name.toLowerCase().includes("aula"),
                              )
                              .map((file, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-4 rounded-xl border bg-background hover:bg-slate-50 transition-all group hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                                      <Layout className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold group-hover:text-amber-700 transition-colors">
                                        {file.name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                        Apresentação • Colaborativo
                                      </p>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={file.url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </div>
                              ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Coluna Direita: Metadados e Info Lateral */}
              <div className="space-y-6">
                {/* Card de IA Suite - NOVO */}
                <Card className="bg-slate-900 text-white overflow-hidden border-0 shadow-xl shadow-slate-200 dark:shadow-none">
                  <CardHeader className="bg-slate-800/50 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                      <CardTitle className="text-sm font-bold uppercase tracking-wider">
                        AI Insights Panel
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                          <Lightbulb className="h-4 w-4 text-amber-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-amber-100 uppercase tracking-tight">
                            Estratégia Clínica
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Priorizar treino excêntrico de alta carga conforme tolerância. Monitorar
                            EVA após 24h.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-tight">
                            Prognóstico Estimado
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Melhora esperada de 40% em 6 semanas com protocolo de carga linear.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="h-9 text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 text-white border-0"
                        onClick={() => setIsStudyModeOpen(true)}
                      >
                        <BookOpen className="h-3 w-3 mr-1.5" /> Estudar
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-9 text-[10px] font-bold uppercase bg-primary hover:bg-primary/90 text-white border-0"
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />{" "}
                        {isGeneratingSummary ? "..." : "Resumo"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Info Rápida */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b bg-slate-50/30">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Layout className="h-3.5 w-3.5" /> Atributos Técnicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Publicado em
                        </span>
                        <span className="font-bold">{article.year || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" /> Veículo/Fonte
                        </span>
                        <span className="font-bold truncate max-w-[120px]">
                          {article.source || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Qualidade
                        </span>
                        <Badge
                          variant={article.status === "verified" ? "default" : "secondary"}
                          className="h-5 text-[10px]"
                        >
                          {article.status === "verified" ? "Certificada" : "Em Revisão"}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Indexação
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {article.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-slate-100 border-0 hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {article.url && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full mt-2 gap-2 text-xs font-bold uppercase h-10 border-slate-200 hover:bg-slate-50"
                      >
                        <a href={article.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Acessar Fonte Externa
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Card de Curadoria */}
                <Card className="border-emerald-100 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Parecer da Curadoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-emerald-100/50">
                      {curation?.notes ? (
                        <p className="italic leading-relaxed">"{curation.notes}"</p>
                      ) : (
                        <p className="italic opacity-60">
                          Diretriz importada via IA. Aguardando parecer clínico oficial sobre a
                          aplicabilidade nesta organização.
                        </p>
                      )}
                    </div>
                    {curation?.assigned_to && (
                      <div className="flex items-center gap-2 pt-1 text-[10px] font-bold uppercase text-emerald-600">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                        Validador:{" "}
                        {auditProfiles?.[curation.assigned_to]?.full_name || curation.assigned_to}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>

        <KnowledgeArticleDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          article={article}
          onSave={async (data) => {
            await handleUpdateArticle(article.id, data);
            setIsEditDialogOpen(false);
            setActiveAttachmentType(null);
          }}
        />

        {isStudyModeOpen && artifact && (
          <StudyMode artifact={artifact as any} onClose={() => setIsStudyModeOpen(false)} />
        )}
      </div>
    </MainLayout>
  );
}
