import React, { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Brain, Search, Info, ArrowRight, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchApi } from "@/api/v2"; // Adjust according to your fetchApi path, assuming standard fetcher
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function BrainDashboardPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["web-brain-insights", query],
    queryFn: async () => {
      if (query.length < 3) return null;
      // Reusing the endpoint built for the mobile app
      const res = await fetch(`/api/ai/insights?q=${encodeURIComponent(query)}&limit=15`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`, // Or context token
        }
      });
      if (!res.ok) throw new Error("Falha na busca");
      return res.json();
    },
    enabled: query.length >= 3,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
  };

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
            <Card>
              <CardHeader>
                <CardTitle>Busca Semântica</CardTitle>
                <CardDescription>Encontre padrões em milhares de evoluções</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  <Input 
                    placeholder="Ex: pacientes com dor no ombro à noite..." 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Processando IA..." : "Investigar Histórico"}
                    <Search className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Sugestões do Brain:</p>
                  <div className="flex flex-wrap gap-2">
                    {["Déficit de extensão de joelho", "Falha de controle motor lombar", "Platô na força de preensão"].map((s) => (
                      <Badge 
                        key={s} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => { setSearchInput(s); setQuery(s); }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Info className="w-5 h-5" />
                  Como a IA ajuda?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                O FisioFlow Brain usa <strong>pgvector</strong> e embeddings para entender o significado clínico das suas anotações, não apenas palavras-chave exatas. Isso permite agrupar pacientes com perfis de recuperação semelhantes para otimizar suas condutas.
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Descobertas Clínicas</CardTitle>
                <CardDescription>Resultados rankeados por similaridade vetorial</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Brain className="w-12 h-12 mb-4 animate-pulse text-primary/50" />
                    <p>O Brain está analisando as evoluções...</p>
                  </div>
                ) : insightsData?.data && insightsData.data.length > 0 ? (
                  <div className="space-y-4">
                    {insightsData.data.map((match: any, index: number) => (
                      <div key={index} className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                              {match.patientName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold">{match.patientName}</h4>
                              <p className="text-xs text-muted-foreground">
                                Sessão de {format(new Date(match.sessionDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={match.painScale > 6 ? "destructive" : "default"} className={match.painScale <= 6 ? "bg-emerald-500" : ""}>
                              Dor {match.painScale}/10
                            </Badge>
                            <span className="text-[10px] font-bold text-primary">{(match.similarity * 100).toFixed(1)}% MATCH</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-primary/30 pl-3">
                          "{match.summary}"
                        </p>
                        <div className="flex justify-end mt-2">
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate(`/patients/${match.patientId}`)}>
                            Abrir Ficha do Paciente <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : query ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p>Nenhum padrão clínico correspondente encontrado.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>Faça uma busca para visualizar os insights do Brain.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}

export default BrainDashboardPage;