import { ClinicAgentChat } from "@/components/ai/ClinicAgentChat";
import React, { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Brain, Search, Info, ArrowRight, Dumbbell, BookOpen, ClipboardList, Users, Sparkles, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatabaseZap, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api/v2/client";
import { getWorkersApiUrl } from "@/lib/api/config";

export function BrainDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["web-brain-insights", query],
    queryFn: async () => {
      if (query.length < 3) return null;
      // Reutiliza o endpoint do app mobile. Usa o apiClient (token Neon Auth) +
      // base do Worker — fetch relativo cairia no SPA do domínio Pages.
      return apiClient.get<any>(
        `${getWorkersApiUrl()}/api/ai/insights?q=${encodeURIComponent(query)}&limit=15`,
      );
    },
    enabled: query.length >= 3,
  });

  const { data: unifiedData, isLoading: isLoadingUnified } = useQuery({
    queryKey: ["web-brain-unified", query],
    queryFn: async () => {
      if (query.length < 3) return null;
      return apiClient.get<any>(
        `${getWorkersApiUrl()}/api/ai-search/unified?q=${encodeURIComponent(query)}`,
      );
    },
    enabled: query.length >= 3,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post<any>(`${getWorkersApiUrl()}/api/ai-search/sync`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Base Sincronizada",
        description: `Indexados: ${data.indexed?.exercises || 0} exercícios, ${data.indexed?.protocols || 0} protocolos, ${data.indexed?.wiki || 0} documentos.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar a base de conhecimento no momento.",
        variant: "destructive",
      });
    },
  });

  return (
    <PageLayout fullWidth>
      <PageContainer maxWidth="full" className="space-y-6">
        <PageHeader
          title="FisioFlow Brain Dashboard"
          subtitle="Análise semântica e insights transversais da sua clínica."
          icon={Brain}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-6">
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-900/20 dark:via-purple-900/10">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Brain className="w-32 h-32 text-primary" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  Omni Search AI
                </CardTitle>
                <CardDescription>Busque em todo o seu histórico clínico e base de conhecimento simultaneamente.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Ex: reabilitação de LCA fase inicial..." 
                      className="pl-10 h-12 rounded-xl border-primary/20 bg-background/50 backdrop-blur-sm focus-visible:ring-primary/50 text-base shadow-sm"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md transition-all hover:shadow-lg" disabled={isLoading || isLoadingUnified}>
                    {(isLoading || isLoadingUnified) ? (
                      <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                    ) : (
                      <Brain className="w-5 h-5 mr-2" />
                    )}
                    {(isLoading || isLoadingUnified) ? "Mapeando Conhecimento..." : "Investigar com IA"}
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões do Brain</p>
                  <div className="flex flex-wrap gap-2">
                    {["Protocolo LCA Fase 1", "Exercícios de Manguito Rotador", "Fascite Plantar Crônica"].map((s) => (
                      <Badge 
                        key={s} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors border-primary/20 bg-background/50 rounded-lg py-1 px-3 text-xs"
                        onClick={() => { setSearchInput(s); setQuery(s); }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Info className="w-5 h-5" />
                  Como a IA ajuda?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                <p>O FisioFlow Brain usa <strong>pgvector</strong> e embeddings para entender o significado clínico das suas anotações, não apenas palavras-chave exatas. Isso permite agrupar pacientes com perfis de recuperação semelhantes para otimizar suas condutas.</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DatabaseZap className="w-4 h-4 text-blue-500" />
                  Base de Conhecimento RAG
                </CardTitle>
                <CardDescription className="text-xs">
                  Sincronize exercícios, protocolos e wiki para a busca unificada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-white dark:bg-slate-900"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncMutation.isPending && "animate-spin")} />
                  {syncMutation.isPending ? "Sincronizando..." : "Forçar Sincronização"}
                </Button>
              </CardContent>
            </Card>
          </div>

            <div className="flex flex-col gap-6">
              
              {/* Seção Base de Conhecimento (Unified RAG) */}
              <Card className="border-border/60 shadow-sm overflow-hidden rounded-[1.5rem]">
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      Base de Conhecimento RAG
                    </CardTitle>
                    <CardDescription>Protocolos, exercícios e documentos técnicos</CardDescription>
                  </div>
                  {unifiedData?.data && unifiedData.data.length > 0 && (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {unifiedData.data.length} resultados
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <AnimatePresence mode="wait">
                    {isLoadingUnified ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 relative z-10" />
                        </div>
                        <p className="text-sm font-medium animate-pulse">Consultando biblioteca de protocolos...</p>
                      </motion.div>
                    ) : unifiedData?.data && unifiedData.data.length > 0 ? (
                      <motion.div 
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {unifiedData.data.map((item: any, index: number) => {
                          let Icon = FileText;
                          let iconColor = "text-slate-500";
                          let route = "";
                          
                          if (item.type === "exercise") { Icon = Dumbbell; iconColor = "text-emerald-500"; route = `/exercises/${item.id}`; }
                          else if (item.type === "protocol") { Icon = ClipboardList; iconColor = "text-amber-500"; route = `/protocols/${item.id}`; }
                          else if (item.type === "wiki") { Icon = BookOpen; iconColor = "text-blue-500"; route = `/wiki?id=${item.id}`; }
                          else if (item.type === "patient") { Icon = Users; iconColor = "text-purple-500"; route = `/patients/${item.id}`; }

                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              key={`unified-${index}`} 
                              onClick={() => navigate(route)}
                              className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-background hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all hover:shadow-md"
                            >
                              <div className={cn("p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300", iconColor)}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {item.category || item.description || "Conteúdo Clínico"}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black uppercase text-indigo-500/70 group-hover:text-indigo-500 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                                  {(item.score * 100).toFixed(0)}% Match
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ) : query ? (
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                      >
                        <Search className="w-8 h-8 mb-3 opacity-50" />
                        <p className="text-sm">Nenhum documento encontrado na base de conhecimento.</p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60"
                      >
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                          <BookOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm">Aguardando busca para consultar protocolos e exercícios.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Seção Insights Clínicos (Evoluções) */}
              <Card className="border-border/60 shadow-sm overflow-hidden rounded-[1.5rem]">
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      Padrões em Evoluções
                    </CardTitle>
                    <CardDescription>Casos reais de pacientes do seu histórico</CardDescription>
                  </div>
                  {insightsData?.data && insightsData.data.length > 0 && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      {insightsData.data.length} padrões
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div 
                        key="loading-insights"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                          <Loader2 className="w-10 h-10 mb-2 animate-spin text-purple-500 relative z-10" />
                        </div>
                        <p className="text-sm font-medium animate-pulse">Minerando milhares de evoluções e prontuários...</p>
                      </motion.div>
                    ) : insightsData?.data && insightsData.data.length > 0 ? (
                      <motion.div 
                        key="insights-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        {insightsData.data.map((match: any, index: number) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={`insight-${index}`} 
                            className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 bg-background hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-purple-200 dark:hover:border-purple-800 transition-all hover:shadow-md group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 text-purple-700 dark:from-purple-900/60 dark:to-indigo-900/40 dark:text-purple-300 font-bold group-hover:scale-105 transition-transform shadow-sm">
                                  {match.patientName.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{match.patientName}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(match.sessionDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant={match.painScale > 6 ? "destructive" : "default"} className={cn("text-[10px]", match.painScale <= 6 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "")}>
                                  Dor {match.painScale}/10
                                </Badge>
                                <span className="text-[10px] font-black uppercase text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                                  {(match.similarity * 100).toFixed(1)}% Match
                                </span>
                              </div>
                            </div>
                            <div className="relative mt-2 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-purple-400 to-indigo-400 rounded-full" />
                              <p className="text-sm text-slate-700 dark:text-slate-300 italic pl-3 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                                "{match.summary}"
                              </p>
                            </div>
                            <div className="flex justify-end mt-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 text-xs font-bold w-full sm:w-auto" 
                                onClick={() => navigate(`/patients/${match.patientId}`)}
                              >
                                Ver Prontuário Completo <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : query ? (
                      <motion.div 
                        key="no-insights"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                      >
                        <Search className="w-8 h-8 mb-3 opacity-50" />
                        <p className="text-sm">Nenhum padrão clínico correspondente encontrado nas evoluções.</p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="idle-insights"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60"
                      >
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm">Os resultados do histórico clínico aparecerão aqui.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
        </div>

        <ClinicAgentChat />
      </PageContainer>
    </PageLayout>
  );
}

export default BrainDashboardPage;