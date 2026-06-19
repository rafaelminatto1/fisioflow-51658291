import React, { useState } from "react";
import {
  Search,
  Sparkles,
  FileText,
  Activity,
  ShieldCheck,
  Clock,
  ArrowRight,
  Filter,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeService } from "@/features/wiki/services/knowledgeService";
import { useAuth } from "@/contexts/AuthContext";
import { StudyMode } from "../components/StudyMode";
import { ArticleUploadDialog } from "../components/dialogs/ArticleUploadDialog";
import type { KnowledgeArtifact } from "@/features/wiki/types/knowledge";
import { wikiService } from "@/lib/services/wikiService";
import { getEvidenceTree } from "@/features/wiki/utils/evidenceTrails";

export default function WikiDashboard() {
  const { organizationId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<KnowledgeArtifact | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["knowledge-artifacts", organizationId],
    queryFn: () =>
      organizationId ? knowledgeService.listArtifacts(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
  });

  const { data: wikiPages = [] } = useQuery({
    queryKey: ["wiki-pages", organizationId],
    queryFn: () => (organizationId ? wikiService.listPages(organizationId) : Promise.resolve([])),
    enabled: !!organizationId,
  });

  const evidenceTree = getEvidenceTree(wikiPages);

  const filteredArtifacts = artifacts.filter(
    (art) =>
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.subgroup.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenStudy = (artifact: KnowledgeArtifact) => {
    setSelectedArtifact(artifact);
  };

  if (selectedArtifact) {
    return <StudyMode artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />;
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-12">
      {/* Hero Section - Minimal Single Column Pattern */}
      <section className="text-center py-12 md:py-20 space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-600 animate-in zoom-in-95 duration-500 delay-300">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          FisioFlow Intelligence
        </div>
        
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 font-display leading-[1.1] animate-in fade-in slide-in-from-bottom-2 duration-700">
            Excelência clínica <br />
            <span className="text-blue-600">baseada em evidências.</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed font-body font-medium animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            Acesse protocolos verificados e diretrizes internacionais atualizadas. 
            Extraia respostas de documentos complexos com nossa IA em segundos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <div className="relative w-full max-w-lg group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Busque por 'LCA', 'Ombro', 'Protocolo'..."
              className="pl-12 h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            premium 
            glow 
            size="lg"
            className="h-14 px-8 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/20"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Artigo
          </Button>
        </div>

        {/* Benefit Bullets (3 max) */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-8 text-sm font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span>Protocolos Verificados</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>Análise por IA</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <span>Evidência Clínica</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-50/50 border-slate-200/60 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Artigos Verificados
            </CardTitle>
            <ShieldCheck className="h-5 w-5 text-blue-600 group-hover:scale-125 transition-transform duration-300" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {artifacts.filter((a) => a.status === "verified").length}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Nível ouro de evidência</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50/50 border-slate-200/60 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Em Estudo</CardTitle>
            <Activity className="h-5 w-5 text-orange-500 group-hover:scale-125 transition-transform duration-300" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">3</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Documentos abertos recentemente</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50/50 border-slate-200/60 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Novos Insights
            </CardTitle>
            <Sparkles className="h-5 w-5 text-cyan-500 group-hover:scale-125 transition-transform duration-300" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">12</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Resumos gerados por IA</p>
          </CardContent>
        </Card>
      </div>

      {evidenceTree.root && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Trilhas de Evidência</h2>
              <p className="text-sm text-slate-500">
                Acesso rápido às trilhas clínicas e aos protocolos práticos já integrados na wiki.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(`/wiki/${evidenceTree.root?.slug}`)}>
              Abrir wiki
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {evidenceTree.trails.map(({ trail, protocols }) => (
              <Card
                key={trail.id}
                className="border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300/60"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700 transition-colors"
                    >
                      Trilha
                    </Badge>
                    <Badge variant="secondary" className="transition-colors">
                      {protocols.length} protocolo
                      {protocols.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base leading-snug group-hover:text-blue-700 transition-colors duration-300">{trail.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {trail.content.replace(/[#*`>-]/g, "").slice(0, 120)}...
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
                    onClick={() => navigate(`/wiki/${trail.slug}`)}
                  >
                    Abrir trilha
                  </Button>
                  {protocols[0] && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full transition-colors duration-300"
                      onClick={() => navigate(`/wiki/${protocols[0].slug}`)}
                    >
                      Abrir protocolo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white border">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="recent">Recentes</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              onClick={() => setIsUploadOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Artigo
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
              ))
            ) : filteredArtifacts.length > 0 ? (
              filteredArtifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onClick={() => handleOpenStudy(artifact)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum documento encontrado para "{searchQuery}"</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ArticleUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["knowledge-artifacts"] })}
      />
    </div>
  );
}

function ArtifactCard({ artifact, onClick }: { artifact: KnowledgeArtifact; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300/60 cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <Badge
            variant={artifact.status === "verified" ? "default" : "secondary"}
            className={
              artifact.status === "verified"
                ? "bg-blue-100 text-blue-700 hover:bg-blue-100 transition-colors"
                : "transition-colors"
            }
          >
            {artifact.subgroup}
          </Badge>
          {artifact.evidenceLevel === "Consensus" && (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 transition-colors">
              Gold
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors duration-300">
          {artifact.title}
        </h3>

        <div className="text-xs text-slate-500 line-clamp-2">
          {artifact.summary || "Sem resumo disponível. Clique para gerar com IA."}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{artifact.metadata.year}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
          Estudar <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
